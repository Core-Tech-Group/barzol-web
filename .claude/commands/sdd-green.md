---
description: Fase GREEN — implementa el mínimo que pone los tests en verde
argument-hint: <SPEC-NNN>
---

Fase GREEN de SDD para $1.

1. Lee `.sdd/CONSTITUTION.md`, `.sdd/specs/$1-*.md` y los tests ya escritos.
2. Implementa **lo mínimo** que hace pasar los tests existentes.
3. **Cada rama condicional que escribas debe rastrear a un REQ.** Si escribes una
   rama y no sabes de qué REQ viene, bórrala: es deriva.
4. Prohibido añadir:
   - códigos de error que ninguna SPEC declara
   - validaciones "de más"
   - parámetros opcionales que nadie pidió
   - manejo de casos que la SPEC puso *fuera de alcance*
5. Respeta el emplazamiento real: lógica pura en `src/shared/lib/**`, sin importar
   `astro:*`, `cloudflare:*`, `@supabase/*` ni `node:*`.
6. Ningún archivo por encima de 500 líneas. Antes de crear un helper, `Grep` para
   ver si ya existe.
7. Ejecuta `npm run typecheck` y la suite. Ambos en verde.
8. Reporta en formato **antes → después**, e indica qué REQ implementa cada
   función.

Si para poner un test en verde necesitas comportamiento que la SPEC no describe,
**DETENTE**. Es señal de que la SPEC o el PLAN están mal, y arreglarlos desde el
código es cómo se pierde la trazabilidad.

Al terminar, lanza el subagente `verifier`.
