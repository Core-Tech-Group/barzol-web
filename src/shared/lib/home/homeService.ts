import { getSupabase } from '../db/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { HomeHeroImage, HomeItem } from '../../types';
import { mapHomeHeroImageRowToHomeHeroImage, mapHomeItemRowToHomeItem } from './homeMapper';
import { planificarInicio, type InicioWriteInput, type PlanInicio } from './inicioPlan';

// ÚNICA fuente de la página de inicio del proyecto: imágenes hero + la lista
// unificada y reordenable de secciones de productos y banners.

export async function getHeroImages(): Promise<HomeHeroImage[]> {
  const { data, error } = await getSupabase()
    .from('home_hero_image')
    .select('id, image_url, sort_order')
    .order('sort_order');
  if (error) throw error;
  return (data ?? []).map((r) => mapHomeHeroImageRowToHomeHeroImage({ ...r, id: String(r.id) }));
}

export async function getHomeItems(): Promise<HomeItem[]> {
  const { data, error } = await getSupabase()
    .from('home_item')
    .select('id, type, title, is_visible, sort_order, image_url, link, home_section_product(product_id, sort_order)')
    .order('sort_order');
  if (error) throw error;
  return (data ?? []).map((r) =>
    mapHomeItemRowToHomeItem({
      ...r,
      id: String(r.id),
      home_section_product: (r.home_section_product ?? []).map((sp: any) => ({
        product_id: String(sp.product_id),
        sort_order: sp.sort_order,
      })),
    })
  );
}

// ---------------------------------------------------------------------------
//  Escritura — SPEC-904
// ---------------------------------------------------------------------------
//
// Requiere el cliente AUTENTICADO (`locals.supabase`), no el singleton anónimo
// de arriba: las policies de REQ-979 exigen `auth.uid()` en `admin_profile`.
// Ese es el motivo de que `updateInicio` reciba el cliente y las lecturas no.
//
// La ejecución no decide nada: qué escribir lo resuelve `planificarInicio`, que
// es puro y está probado entero. Acá solo se aplica el plan, y en un orden que
// importa (REQ-972): **todo lo que escribe va antes de todo lo que borra**.

const lanzarSi = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

async function idsExistentes(supabaseAuth: SupabaseClient) {
  const [items, hero] = await Promise.all([
    supabaseAuth.from('home_item').select('id').order('sort_order'),
    // El `sort_order` no es decorativo: las filas hero se emparejan por él y
    // no por posición, porque una portada vacía es una fila ausente.
    supabaseAuth.from('home_hero_image').select('id, sort_order').order('sort_order'),
  ]);
  lanzarSi(items.error);
  lanzarSi(hero.error);

  return {
    itemsExistentes: (items.data ?? []).map((r) => String(r.id)),
    heroExistentes: (hero.data ?? []).map((r) => ({ id: String(r.id), orden: r.sort_order })),
  };
}

/** Reemplaza los productos de una sección. `null` = la fila no tiene hijos. */
async function reemplazarProductos(supabaseAuth: SupabaseClient, itemId: string, productoIds: string[] | null) {
  if (productoIds === null) return;

  const borrado = await supabaseAuth.from('home_section_product').delete().eq('home_item_id', Number(itemId));
  lanzarSi(borrado.error);

  if (productoIds.length === 0) return;

  const insercion = await supabaseAuth.from('home_section_product').insert(
    productoIds.map((productId, orden) => ({
      home_item_id: Number(itemId),
      product_id: Number(productId),
      sort_order: orden,
    }))
  );
  lanzarSi(insercion.error);
}

async function aplicarPlan(supabaseAuth: SupabaseClient, plan: PlanInicio) {
  // 1 · Altas y cambios primero. Si algo revienta acá, el inicio queda a medio
  //     actualizar —visible y reversible—, nunca vacío.
  for (const { id, fila, productoIds } of plan.actualizarItems) {
    const { error } = await supabaseAuth.from('home_item').update(fila).eq('id', Number(id));
    lanzarSi(error);
    await reemplazarProductos(supabaseAuth, id, productoIds);
  }

  for (const { fila, productoIds } of plan.insertarItems) {
    const { data, error } = await supabaseAuth.from('home_item').insert(fila).select('id').single();
    lanzarSi(error);
    await reemplazarProductos(supabaseAuth, String(data!.id), productoIds);
  }

  for (const { id, ...fila } of plan.actualizarHero) {
    const { error } = await supabaseAuth.from('home_hero_image').update(fila).eq('id', Number(id));
    lanzarSi(error);
  }

  if (plan.insertarHero.length > 0) {
    const { error } = await supabaseAuth.from('home_hero_image').insert(plan.insertarHero);
    lanzarSi(error);
  }

  // 2 · Recién ahora, lo que sobra. `home_section_product` cae por cascada.
  if (plan.borrarItems.length > 0) {
    const { error } = await supabaseAuth
      .from('home_item')
      .delete()
      .in('id', plan.borrarItems.map(Number));
    lanzarSi(error);
  }

  if (plan.borrarHero.length > 0) {
    const { error } = await supabaseAuth
      .from('home_hero_image')
      .delete()
      .in('id', plan.borrarHero.map(Number));
    lanzarSi(error);
  }
}

export async function updateInicio(supabaseAuth: SupabaseClient, entrada: InicioWriteInput): Promise<void> {
  const existente = await idsExistentes(supabaseAuth);
  await aplicarPlan(supabaseAuth, planificarInicio(existente, entrada));
}
