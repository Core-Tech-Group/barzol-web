#!/usr/bin/env bash
# Hook Stop.
#
# Impide que el agente declare la tarea terminada con el suite en rojo.
#
# NO ESTÁ ACTIVADO, y no debe activarse antes de BZ-57: si los scripts npm no
# existen todavía, este hook bloquea CADA turno del agente. Ver README.md.
#
# Códigos de salida: 0 = permite terminar · 2 = la tarea no está terminada.
set -euo pipefail

# Si el tooling aún no existe, no hay nada que verificar y tampoco hay que
# fingir que se verificó. Se avisa y se deja pasar.
if ! npm run typecheck --silent >/dev/null 2>&1; then
  if ! grep -q '"typecheck"' package.json 2>/dev/null; then
    echo "AVISO: no existe 'npm run typecheck' todavía (BZ-57). Gate omitido." >&2
    exit 0
  fi
  echo "GATE: typecheck falla. La tarea NO está terminada." >&2
  exit 2
fi

if ! grep -q '"test"' package.json 2>/dev/null; then
  echo "AVISO: no existe 'npm run test' todavía (BZ-57). Gate parcial." >&2
  exit 0
fi

if ! npm run test --silent >/dev/null 2>&1; then
  echo "GATE: hay tests en rojo. La tarea NO está terminada." >&2
  exit 2
fi

exit 0
