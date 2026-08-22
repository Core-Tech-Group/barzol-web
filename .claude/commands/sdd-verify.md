---
description: Fase VERIFY — auditoría de cumplimiento SDD antes de cerrar
argument-hint: [SPEC-NNN]
---

Fase VERIFY de SDD$ARGUMENTS.

Lanza el subagente `verifier` (Opus 5, sin permisos de escritura) sobre el trabajo
en curso.

Si no se indicó una SPEC, audita todo lo que aparezca en `git diff` respecto a
`main`.

Cuando el veredicto llegue:

- **APROBADO** → resume los hallazgos `[CONOCIDO]` que quedaron y confirma que las
  tareas `BZ-NN` asociadas siguen abiertas en el kanban.
- **RECHAZADO** → **no arregles nada todavía**. Presenta la lista de hallazgos y
  pregunta cuáles abordar. Algunos serán deuda aceptada a propósito y arreglarlos
  sin preguntar deshace una decisión que ya se tomó.

En ningún caso ejecutes `wrangler deploy`, `supabase db push` ni `git push`
(Constitución 8.5).
