# SPEC-907 — El panel en un dispositivo táctil

**Estado:** BORRADOR — **pendiente de aprobación humana**
**Capa:** Presentación + E2E · **Fecha:** 2026-08-26
**Depende de:** `SPEC-906` (entregada), `BZ-74` (E2E, sin montar)
**Abre:** `BZ-84`

---

## Por qué esto es otra SPEC y no la fase 2 de `SPEC-906`

`SPEC-906` empezó con nueve requisitos. Dos no llegaron a la entrega, y el gate
lo dijo antes que yo: **REQ-996 y REQ-998 no tenían test que los cubriera, y no
lo tenían porque no se pueden verificar con las herramientas que hay hoy.**

Dejarlos dentro de una spec APROBADA obligaba a una de dos cosas, ambas malas:
inventar un test que no prueba nada, o desactivar el check. Son exactamente los
dos síntomas que la sección de riesgos del tablero define como "SDD adoptado
como decoración".

Así que se mudan aquí, en BORRADOR, donde el gate los reporta como hueco
informativo y no bloquean. Es el mismo mecanismo que usa `SPEC-902` con pgTAP.

---

## Requisitos (EARS)

### [REQ-996] — Ubicuo · sin desbordamiento horizontal
Ninguna pantalla del panel DEBE producir scroll horizontal a 360 px de ancho.

> **Por qué no se puede verificar hoy:** hace falta un navegador que calcule
> `document.documentElement.scrollWidth` con un viewport real. Ni Vitest en Node
> ni el runner de workerd tienen layout. jsdom tampoco: devuelve ceros, así que
> un test contra jsdom pasaría siempre y mediría jsdom, no la página.

### [REQ-998] — Dirigido por estado · reordenar sin ratón
MIENTRAS el dispositivo no tenga puntero fino, el sistema DEBE ofrecer una forma
de reordenar que no dependa de arrastrar.

> Siete superficies usan `draggable` de HTML5 con `dragstart`/`dragover`/`drop`:
> Categorías (2), Página de inicio (2), Productos (2), Galería (1). Esos eventos
> no existen en táctil. Hoy el orden de los productos de una sección, de las
> fotos de la galería y de las secciones del inicio **solo se puede cambiar
> desde un ratón**.

### [REQ-999] — Ubicuo · tamaño de los objetivos táctiles
Todo control accionable DEBE tener un área de al menos 44 × 44 px efectivos en
pantallas táctiles.

> Los botones de borrar foto y quitar imagen miden hoy 26 × 26. Cumplen el
> mínimo AA de WCAG 2.2 (24 px) por poco, y son acciones destructivas: el coste
> de un dedo que falla no es simétrico.

---

## Alcance propuesto

| Parte | Qué implica |
| :--- | :--- |
| REQ-996 | Un test de Playwright que recorra las siete pantallas a 360, 768 y 1280 px y compare `scrollWidth` con `clientWidth`. Barato **una vez que `BZ-74` exista**. |
| REQ-998 | Botones ↑/↓ junto a cada elemento reordenable, visibles solo sin puntero fino (`@media (pointer: coarse)`). Reusa el estado que ya mueve el `drop`. |
| REQ-999 | Área táctil por `padding` o pseudo-elemento, sin cambiar el aspecto. |

## El riesgo que hace que esto no entre ya

REQ-998 toca cuatro componentes, y **dos están en el trinquete de `BZ-79`**:
`ProductsAdmin.tsx` (1378 líneas) y `CategoriesAdmin.tsx` (730). No hay capa de
tests de componentes que los cubra —`BZ-60` sigue bloqueada por
`getViteConfig()`— así que tocar la lógica de reordenación de un panel que hoy
funciona en escritorio sería la clase de cambio que el tablero lleva cinco
revisiones evitando.

**El orden sano es `BZ-60` → `BZ-74` → esta SPEC.** Antes de eso, cualquier
implementación se estaría escribiendo sin red.

## Lo que NO justifica esperar

REQ-999 es independiente de todo lo anterior y no toca lógica: es padding. Puede
adelantarse en cuanto se apruebe, sin `BZ-60` ni `BZ-74`.
