# PLAN DE PRUEBAS — SPEC-NNN · <título>

**Archivo destino:** `tests/<capa>/<ruta>.test.ts`
**Proyecto Vitest:** `unit` | `components` | `workers` · **Umbral:** ...
**Fuente:** [`../specs/SPEC-NNN-....md`](../specs/SPEC-NNN-....md)

---

## Matriz

| ID | Escenario | Entrada | Esperado | REQ |
| :-- | :--- | :--- | :--- | :--- |
| TEST-NNN | | | | REQ-NNN |

> Prefijos: sin prefijo = capa 1 · `C` = componentes · `W` = workerd ·
> `S` = smoke · `R` = RLS · `G` = gate de CI.

## Cobertura de requisitos

| REQ | Tests | Cubierto |
| :--- | :--- | :--- |
| REQ-NNN | TEST-NNN | ✅ / ⏳ / ⏸ |

**Todo REQ debe aparecer en esta tabla.** Un REQ sin fila es un hueco, y el gate 4
lo detectará de todas formas — mejor verlo aquí primero.

## Reglas para el agente

- No añadir casos fuera de esta matriz sin actualizar antes la SPEC.
- Prohibido `toMatchSnapshot()` (Constitución 5.5).
- Prohibido asertar sobre mocks cuando exista una aserción observable (5.4).
- Un solo `Act` por test (2.3).
- Estructura AAA con comentarios `// Arrange`, `// Act`, `// Assert`.
