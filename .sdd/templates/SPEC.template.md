# SPEC-NNN — <título breve>

**Estado:** BORRADOR | APROBADA | SUPERADA
**Capa:** 1 lógica | 2 componentes | 3 workerd | 4 base de datos | Plataforma
**Autor:** · **Fecha:** AAAA-MM-DD
**Unidad destino:** `src/...` *(marcar si no existe todavía)*

---

## Contexto

Por qué existe esto. Qué problema real resuelve. Si es una especificación
retroactiva de código que ya corre, decirlo aquí.

## Fuera de alcance

Lista explícita. Es la sección que impide que la SPEC crezca sin control, y la
primera que se consulta cuando un agente propone "aprovechar y añadir".

## Vocabulario

Solo los términos que esta SPEC introduce. Los de dominio van en `GLOSSARY.md`.

---

## Requisitos (EARS)

> Cinco plantillas. Un requisito **ubicuo no lleva condición**; si la lleva, es
> dirigido por estado o por evento.

### [REQ-NNN] — Ubicuo
El sistema DEBE `<respuesta>`.

### [REQ-NNN] — Dirigido por evento
CUANDO `<disparador>`, el sistema DEBE `<respuesta>`.

### [REQ-NNN] — Dirigido por estado
MIENTRAS `<estado>`, el sistema DEBE `<respuesta>`.

### [REQ-NNN] — No deseado
SI `<condición>`, ENTONCES el sistema DEBE `<respuesta>`.

### [REQ-NNN] — Opcional
DONDE `<característica>`, el sistema DEBE `<respuesta>`.

---

## Contrato

```typescript
// Tipos y firmas. Sin implementación.
```

## Invariantes verificables

- **INV-1:** ...

> Un invariante que no se puede escribir como aserción no es un invariante: es una
> intención. Reformularlo o quitarlo.

## Riesgo de regresión

Qué se rompe si esto se implementa mal. Si la respuesta es "nada", probablemente la
SPEC sea demasiado trivial para existir — subir el grano.
