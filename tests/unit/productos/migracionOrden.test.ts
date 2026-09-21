import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const sql = readFileSync('supabase/pendiente-orden-productos.sql', 'utf8')
  .toLowerCase()
  .replace(/--[^\n]*/g, '')
  .replace(/\s+/g, ' ');

describe('SPEC-004 · contrato de migración', () => {
  it('[TEST-087] REQ-415 agrega columna y numera los existentes por instrumento', () => {
    expect(sql).toContain('add column if not exists sort_order integer');
    expect(sql).toContain('partition by coalesce(c.parent_category_id, c.id)');
    expect(sql).toContain('p.created_at desc, p.id desc');
    expect(sql).toContain('set not null');
    expect(sql).toContain('check (sort_order >= 0) not valid');
    expect(sql).toContain('validate constraint product_sort_order_nonnegative');
  });

  it('[TEST-088] REQ-410/415 usa una escritura atómica con RLS del invocador', () => {
    expect(sql).toContain('security invoker');
    expect(sql).toContain('jsonb_to_recordset(cambios)');
    expect(sql).toContain('update public.product p');
    expect(sql).toContain('revoke all on function public.reordenar_productos(jsonb) from public');
    expect(sql).toContain('grant execute on function public.reordenar_productos(jsonb) to authenticated');
  });
});
