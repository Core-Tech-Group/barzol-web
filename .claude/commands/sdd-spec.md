---
description: Fase SPEC — redacta una especificación EARS y su plan de pruebas
argument-hint: <descripción de la unidad a especificar>
---

Fase SPEC de SDD para: $ARGUMENTS

1. Lee `.sdd/CONSTITUTION.md` y `.sdd/GLOSSARY.md`.
2. Revisa si ya existe una SPEC que cubra esto. Si existe, **no crees otra**:
   propón la enmienda como diff y detente.
3. Inspecciona el código real relacionado antes de especificar nada. Si estás
   especificando algo que ya corre, la SPEC documenta el **comportamiento actual**,
   incluidos los defectos — marcados como tales, con la tarea `BZ-NN` que los
   corregirá.
4. Escribe `.sdd/specs/SPEC-NNN-<slug>.md` desde `.sdd/templates/SPEC.template.md`:
   - Numeración: `001`–`099` dominio, `900`–`999` plataforma.
   - Requisitos en EARS con las cinco plantillas correctas. Un requisito **ubicuo
     no lleva condición**.
   - Sección *Fuera de alcance* explícita.
   - Invariantes escritos como aserciones ejecutables.
   - Contrato de tipos, sin implementación.
5. Escribe `.sdd/plans/SPEC-NNN.plan.md` desde `.sdd/templates/PLAN.template.md`:
   matriz cerrada de casos, tabla de cobertura REQ→TEST, reglas para el agente.
6. **No escribas ni una línea bajo `src/` ni bajo `tests/`.**
7. Actualiza `.sdd/TRACEABILITY.md`.

Reporta: qué REQ definiste, qué decisiones tuviste que asumir y qué queda sin
verificar. Marca los supuestos explícitamente (Constitución 10.2).

Después de esto **para y espera revisión humana**. La aprobación de la SPEC no es
tuya.
