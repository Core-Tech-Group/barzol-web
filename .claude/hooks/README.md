# Hooks SDD — escritos pero **NO activados**

Los scripts de este directorio existen pero **no están conectados** a
`.claude/settings.json`. Es deliberado.

## Por qué no están activos

Un `PreToolUse` sobre `Write|Edit` que deniega escrituras en `src/` sin SPEC
funciona exactamente como se anuncia — incluido el caso en que estás arreglando
un incidente en producción a las once de la noche y el hook te bloquea porque el
archivo no aparece en ninguna spec.

Hoy `.sdd/specs/` cubre tres archivos de `src/shared/lib/`. Activar el guardia
ahora bloquearía prácticamente **todo** el trabajo del repositorio.

Se activan cuando la cobertura de specs lo justifique. Es la tarea `BZ-56` del
tablero, y es una decisión humana, no del agente.

## Cómo activarlos, cuando toque

En `.claude/settings.json`:

```jsonc
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": ".claude/hooks/guard-no-src-without-spec.sh" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": ".claude/hooks/gate-on-stop.sh" }
        ]
      }
    ]
  }
}
```

`gate-on-stop.sh` requiere que `npm run typecheck` y `npm run test` existan —
es decir, después de `BZ-57`. Activarlo antes bloquea **cada** turno del agente
con un fallo de script no encontrado.

## Nota sobre Windows

El entorno principal de este proyecto es Windows 11. Los hooks son scripts `sh` y
necesitan Git Bash en el `PATH` para ejecutarse. `guard-no-src-without-spec.sh`
usa `jq`; si no está instalado, **el hook falla y bloquea toda escritura**.

Comprobar antes de activar:

```bash
which bash jq
```

## Los hooks son la única capa determinista

Las reglas de `.claude/rules/` dependen de que el modelo las tenga presentes. Los
hooks no dependen de nada: se ejecutan o no se ejecutan. Por eso valen la pena
pese a la fricción — y por eso no se activan a la ligera.
