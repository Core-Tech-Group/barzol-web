#!/usr/bin/env bash
# Hook PreToolUse sobre Write|Edit.
#
# Impide escribir lógica de negocio o endpoints sin una SPEC que los cubra
# (Constitución, Regla 2.1). Es la única capa determinista del proceso SDD:
# no depende de que el modelo recuerde la regla.
#
# NO ESTÁ ACTIVADO. Ver .claude/hooks/README.md y la tarea BZ-56.
#
# Códigos de salida: 0 = permite · 2 = deniega la llamada.
set -euo pipefail

INPUT=$(cat)

# Sin jq no se puede leer la ruta del archivo. Fallar abierto sería peor que
# inútil: daría la falsa impresión de que el guardia está funcionando.
if ! command -v jq >/dev/null 2>&1; then
  echo "BLOQUEADO: el guardia SDD necesita 'jq' y no está en el PATH." >&2
  echo "Instálalo o desactiva el hook en .claude/settings.json." >&2
  exit 2
fi

FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
[[ -z "$FILE" ]] && exit 0

# Rutas reales de este repo: la lógica vive en src/shared/lib/, no en src/lib/.
if [[ "$FILE" != *"/src/shared/lib/"* && "$FILE" != *"/src/pages/api/"* ]]; then
  exit 0
fi

# Los tipos compartidos son contratos, no lógica.
[[ "$FILE" == *"/src/shared/types/"* ]] && exit 0

if ! ls .sdd/specs/SPEC-*.md >/dev/null 2>&1; then
  echo "BLOQUEADO: no existe ninguna SPEC en .sdd/specs/ (Constitución 2.1)." >&2
  exit 2
fi

# ¿Alguna spec o plan menciona este archivo por su nombre?
BASE=$(basename "$FILE")
if ! grep -rqF "$BASE" .sdd/specs/ .sdd/plans/ 2>/dev/null; then
  echo "BLOQUEADO: '$BASE' no aparece en ninguna SPEC ni PLAN." >&2
  echo "Escribe primero la especificación: /sdd-spec" >&2
  echo "Constitución, Reglas 2.1 y 2.4." >&2
  exit 2
fi

exit 0
