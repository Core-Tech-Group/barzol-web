---
alwaysApply: true
---

# Regla SDD — barzol-web

La ley suprema es `.sdd/CONSTITUTION.md`. Esta regla es su recordatorio operativo.

## Antes de crear o modificar cualquier archivo bajo `src/`

1. Localiza la SPEC que lo cubre en `.sdd/specs/`.
2. **Si no existe → DETENTE.** Propón la SPEC y espera aprobación humana. No
   escribas código "provisional" ni "para probar".
3. **Si existe pero no cubre lo que te piden → DETENTE.** Propón la enmienda como
   diff. No la apliques por tu cuenta.
4. Todo test que escribas lleva `[TEST-NNN]` y cita sus `REQ-NNN`.
5. Toda rama condicional del código de producción rastrea a un REQ. Una rama sin
   REQ es deriva arquitectónica: elimínala.

## Rutas de este repo (no las del documento base)

| Qué | Dónde |
| :--- | :--- |
| Lógica pura | `src/shared/lib/**` — **no** `src/lib/` |
| Endpoints | `src/pages/api/**` |
| Presentación | `src/landing/**`, `src/admin/**` |
| Binding R2 | `MEDIA` — **no** `PRODUCT_IMAGES` |
| Bindings del adaptador | `SESSION`, `IMAGES` (los inyecta `@astrojs/cloudflare` v14) |

## Frases prohibidas como justificación

*"por si acaso"* · *"por robustez"* · *"para mayor seguridad"* · *"ya que estamos"*

Si crees que falta un caso, escribe el REQ. No escribas el código.

## Antes de crear un helper

`Grep` antes que `Write`. `slugify()` ya está duplicado en dos mappers y una
tercera variante vive en `mediaKey.ts`. No añadas la cuarta.

## Lo que nunca ejecutas

`wrangler deploy` · `supabase db push` · `git push --force` · rotar credenciales.

Escribes, pruebas y reportas. Publicar es decisión humana (Constitución 8.5).
