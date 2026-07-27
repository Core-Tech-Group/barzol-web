# Barzol — Contexto del Sistema de Diseño
> Archivo de referencia para nuevos chats. Última actualización: Julio 2026.

---

## Empresa

| Campo | Valor |
|---|---|
| Razón social | BARZOL 3D INDUSTRY S.A.C. |
| Nombre comercial | BARZOL |
| Sede | Ayacucho, Perú |
| WhatsApp principal | +51 950 759 032 (William Barzola — fundador) |
| Distribuidor autorizado | +51 941 556 169 (Alexis Caycho "Pecas") |
| Email | atencioncliente@barzol.com |
| Facebook | Barzol 3D music |
| TikTok | Barzol 3D music |

**Descripción:** Empresa peruana dedicada al diseño con software CAD/CAE, al desarrollo y a la fabricación de accesorios musicales innovadores mediante tecnología de impresión 3D. Su propósito es integrar la pasión por la música con la ingeniería moderna, ofreciendo soluciones creativas y funcionales para músicos de todos los niveles. Trabaja junto a estudiantes, músicos profesionales de orquestas, bandas sinfónicas y músicos independientes, brindándoles accesorios resistentes, ligeros y adaptados a sus necesidades artísticas. Sus productos son exclusivos en el mercado y están protegidos por patentes, lo que garantiza su originalidad, autenticidad y valor diferencial. "En BARZOL 3D Industry S.A.C. no solo fabricamos accesorios: damos vida a las ideas de los músicos, impulsando la creatividad y la pasión que los inspira."

**Misión:** Diseñar y fabricar accesorios musicales innovadores con tecnología 3D que potencien la creatividad y la comodidad de los músicos.

**Visión:** Convertirse en una empresa líder en el desarrollo de soluciones musicales impresas en 3D en el Perú y Latinoamérica.

**Tres pilares:**
- **Calidad:** empleamos materiales de alto rendimiento que aseguran durabilidad y comodidad.
- **Innovación:** transformamos ideas en productos únicos que enriquecen la experiencia musical.
- **Personalización:** ofrecemos la posibilidad de añadir nombres, logos o detalles especiales, convirtiendo cada accesorio en algo exclusivo.

**Público objetivo:** Estudiantes, músicos profesionales de orquestas, bandas sinfónicas y músicos independientes.

**Nota importante:** Los productos son exclusivos y están protegidos por patentes. Se pueden personalizar con nombres, logos o detalles especiales.

---

## Stack técnico
- **Formato:** Design Components (`.dc.html`) — sistema propio de la plataforma
- **Tipografía:** Poppins (self-hosted vía el design system)
- **Imágenes de producto:** `image-slot.js` — web component drag & drop arrastrable por el usuario
- **No usa carrito de compras** — modelo de venta por WhatsApp directo
- **No usa React JSX externo** — todo en template DC + lógica `class Component extends DCLogic`

---

## Tokens de diseño Barzol

| Token | Valor | Uso |
|---|---|---|
| Primario | `#0550ae` | Botones, links, precios, acentos |
| Navy | `#1e3560` | Footer, hero nosotros |
| Fondo | `#f4f5f7` | Background general |
| Texto | `#1a1a2e` | Cuerpo principal |
| Texto suave | `#6b7280` | Descripciones |
| Texto muted | `#9ca3af` | Precios tachados, labels |
| Borde | `#e5e7eb` / `#e9ebee` | Cards, inputs |
| Éxito | `#059669` | "En stock" |
| WhatsApp | `#16a34a` | Botón flotante y CTA |
| Naranja servicio | `#c2410c` | Card Ingeniería |

---

## Arquitectura de páginas

| Archivo | Ruta lógica | Descripción |
|---|---|---|
| `Barzol Home.dc.html` | `/` | Home con hero, carruseles de producto, servicios |
| `Barzol Categoria.dc.html` | `/categoria/{slug}` | Listado por categoría con filtros laterales |
| `Barzol Busqueda.dc.html` | `/search/{query}` | Resultados de búsqueda con filtros |
| `Barzol Producto.dc.html` | `/producto/{slug}` | Detalle de producto |
| `Barzol Nosotros.dc.html` | `/empresa` | Página institucional |
| `Barzol Servicios.dc.html` | `/servicios` | Landing de servicios (Impresión 3D + Ingeniería) |

---

## Catálogo de productos reales

### Atriles de celular (soportes para partitura en el instrumento)
| N° | Producto | Precio (S/) |
|---|---|---|
| 1 | Atril de celular para trompeta | 90.00 |
| 2 | Atril de celular para clarinete | 100.00 |
| 3 | Atril de celular para euphonium frontal | 100.00 |
| 4 | Atril de celular para euphonium recto | 100.00 |
| 5a | Atril de celular para trombón (tudel delgado) | 100.00 |
| 5b | Atril de celular para trombón (tudel ancho) | 100.00 |
| 6a | Atril de celular para tuba (tudel ancho: King/Yamaha/Jupiter) | 100.00 |
| 6b | Atril de celular para tuba (tudel delgado: fabricadas en Perú) | 100.00 |
| 7 | Atril de celular para saxofón alto | 100.00 |
| 8 | Atril de celular para saxo tenor | 100.00 |

### Sordinas (silenciadores)
| Producto | Precio (S/) |
|---|---|
| Sordina silenciador para trombón | 160.00 |
| Sordina silenciador para trompeta | 120.00 |

### Otros accesorios
| Producto | Precio (S/) |
|---|---|
| Tope protector de vara | 20.00 |
| BERP (para trombón, trompeta y euphonium) | 85.00 |

---

## Servicios
- **Impresión 3D personalizada** — Piezas FDM y resina UV a medida
- **Trabajos de ingeniería** — Diseño CAD, prototipado, repuestos a medida

---

## Estructura del header (sticky — reutilizado en todas las páginas)

```
[Barra azul #0550ae] — announcements rotativos cada 3.8s con fade (annIn keyframe)

[Header fila 1] — logo | flex:1 | buscador 500px | flex:1 | WhatsApp 950 759 032
  Logo → enlaza a Barzol Home.dc.html

[Header fila 2] — nav categorías (height:36px, font:12.5px)
  Soporte de Celulares (hover → mega menú)
  Sordinas (hover → mega menú)
  Servicios (link directo → Barzol Servicios.dc.html)
  Nosotros (link directo → Barzol Nosotros.dc.html)
```

---

## Estructura del footer (reutilizado en todas las páginas)

- Fondo `#1e3560`
- 4 columnas: Marca | Contacto (tel + email) | Redes (FB, TikTok) | Medios de pago (Visa, MC, Yape, Plin, Efectivo)
- Bottom bar: copyright + "Hecho en Ayacucho, Perú"
- Copyright: `© 2026 Barzol 3D Industry S.A.C.`

---

## Componente flotante WhatsApp

```html
position:fixed; bottom:28px; right:28px; z-index:500
background:#16a34a; border-radius:50%; width:54px; height:54px
href: https://wa.me/51950759032
```

---

## Lógica JS compartida (base para todas las páginas)

```js
state = { openMenu: null, activeSub: 0, annIdx: 0 }

announcements = [...] // 4 mensajes rotativos
megaCats = [
  { name: 'Soporte de Celulares', instruments: [...] },
  { name: 'Sordinas', instruments: [...] },
]

componentDidMount() → setInterval annTimer (3800ms)
componentWillUnmount() → clearInterval

_closeTimer, _scheduleClose(), _cancelClose()  // hover delay mega menú
toggleMenu(n), _getSubsList()

renderVals() → {
  annText, annIcons, annIdx,
  menuIsSoportes, menuIsSordinas,
  megaMenuOpen, menuOpen,
  soportesColor/FontWeight, sordinasColor/FontWeight,
  enterSoportes, enterSordinas, enterPanel, leaveMenu,
  closeMenu,
  currentSubs, activeSubName, activeSubItems,
}
```

---

## Convenciones de diseño

- Anuncio bar: `background:#0550ae`, sticky junto al header
- Border-radius cards: `10px`; servicios: `12px`; hero: `16px`; botones: `9-10px`
- Sombra card hover: `0 8px 28px rgba(0,0,0,0.1)`
- Precios siempre en soles: `S/ XXX.00`
- Badge descuento: `background:#dcfce7; color:#16a34a`
- Badge "NUEVO": `background:#0550ae; color:white`
- Todos los logos enlazan a `Barzol Home.dc.html`
- image-slot siempre con `background:white`
