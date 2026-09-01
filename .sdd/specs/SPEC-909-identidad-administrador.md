# SPEC-909 — Identidad del administrador

**Estado:** BORRADOR — pendiente de aprobación humana
**Capa:** Plataforma / autenticación · **Fecha:** 2026-09-01
**Unidad destino:** `src/shared/lib/auth/authClient.ts` *(existe, sin tests)* · `src/pages/api/auth/login.ts`
**Objetivo:** `https://barzol-web.barzolweb3d.workers.dev/admin/login`
**Abre:** `BZ-96`

---

## Contexto

El panel de administración rechaza el login del despliegue nuevo:

```json
{ "level": "error", "message": "[login] Supabase error: Invalid login credentials 400" }
```

**No es la contraseña.** Reproducido contra Supabase Auth el 2026-09-01, con la
misma contraseña en los dos intentos:

```
POST /auth/v1/token?grant_type=password
  admin@barzol.internal      → Invalid login credentials
  <correo personal del dueño>    → OK, uid <uid del usuario>
```

El usuario existe, está confirmado y su contraseña es correcta. Lo que no
coincide es **el email con el que se le busca**.

### Por qué el sistema busca un email que nadie escribió

El panel pide **usuario**, no email — `admin`. Supabase Auth exige un email. El
puente es `usernameToSyntheticEmail()`, que arma
`${username}@barzol.internal` de forma determinista al crear y al entrar, para
no tener que guardar ni consultar ese email en ningún sitio.

Ese diseño **funciona sólo si el usuario de Auth se creó con exactamente ese
email**. Aquí se creó con el correo personal del dueño de la cuenta, así que el
login busca `admin@barzol.internal`, que no existe, y Supabase responde lo mismo
que respondería ante una contraseña equivocada.

### Todo lo demás está bien, y eso es parte del problema

La fila del perfil es correcta, y su policy `"self read"` funciona:

```json
[{ "id": "<uid del usuario>",
   "username": "admin", "name": "Administrador", "role": "admin" }]
```

El `id` de `admin_profile` **coincide** con el de `auth.users`, así que la FK y
`auth.uid()` están bien y las policies de escritura funcionarían. El email está
confirmado. El único desajuste es entre `admin_profile.username` = `admin` y
`auth.users.email` = `<correo personal del dueño>`.

**Son dos sitios que deben concordar por convención y nada los compara.** Cuando
divergen, el síntoma es un mensaje que culpa a las credenciales, así que se
prueba la contraseña una y otra vez — que es exactamente lo que pasó.

> El mensaje de Supabase es deliberadamente ambiguo: distinguir "no existe" de
> "contraseña incorrecta" permitiría enumerar usuarios. Esta SPEC **no propone
> cambiarlo**. Propone que el sistema sepa decir, del lado servidor, con qué
> email preguntó.

## Fuera de alcance

- Cambiar el mensaje que ve el visitante. Sigue siendo *"Usuario o contraseña
  incorrectos"*, sin distinguir causas: distinguirlas es enumeración de usuarios.
- Sustituir el email sintético por otro mecanismo de identidad. Funciona; lo que
  falló fue el alta.
- Gestión de varios administradores, alta desde el panel, o recuperación de
  contraseña. Hoy el admin se crea a mano y así se queda.
- Rotar la contraseña del administrador. Es decisión humana (Constitución 8.5).

## Vocabulario

| Término | Significa |
| :--- | :--- |
| **email sintético** | `${username}@barzol.internal`, derivado y nunca almacenado |
| **alta del admin** | crear el usuario en Auth **y** su fila en `admin_profile` |
| **identidad concordante** | `admin_profile.username` y el email de `auth.users` derivan uno del otro |

---

## Requisitos (EARS)

### [REQ-1020] — Ubicuo · el email se deriva, no se elige
El sistema DEBE derivar el email de Auth del `username` mediante
`usernameToSyntheticEmail()`, y ese valor DEBE ser el mismo al crear el usuario y
al iniciar sesión.

> Es la premisa de todo el diseño. Un alta que elige otro email deja el sistema
> sin forma de encontrar a su propio administrador.

### [REQ-1021] — Ubicuo · determinismo de la derivación
`usernameToSyntheticEmail()` DEBE devolver el mismo email para el mismo
`username` con independencia de mayúsculas y espacios alrededor, y NO DEBE
depender de nada externo a su argumento.

> Hoy lo cumple —`trim()` y `toLowerCase()`— pero **no tiene ni un test**. Es la
> función que decide quién puede entrar al panel.

### [REQ-1022] — No deseado · alta con un email que no deriva del username
SI el usuario de Auth se crea con un email que no es
`usernameToSyntheticEmail(<username de su admin_profile>)`, ENTONCES el alta DEBE
considerarse incompleta, aunque el login de Supabase acepte ese email por otra vía.

> Es el defecto de `BZ-96`. `auth.users.email` era `<correo personal del dueño>` con
> `admin_profile.username` = `admin`: cada pieza válida por separado, el conjunto
> inservible.

### [REQ-1023] — Ubicuo · el alta son dos filas concordantes
El alta DEBE crear el usuario en `auth.users` **auto-confirmado** y su fila en
`admin_profile` con el **mismo `id`**, y ambas DEBEN cumplir REQ-1022.

> Con el `id` distinto, el login entra y ninguna escritura pasa el RLS. Con el
> email distinto, el login no entra. Son dos fallos distintos con dos síntomas
> distintos, y el runbook los trata como un solo paso.

### [REQ-1024] — Dirigido por evento · el servidor dice con qué email preguntó
CUANDO un intento de login falle, el sistema DEBE registrar en el log del
servidor el email sintético que utilizó, y NO DEBE incluirlo en la respuesta HTTP.

> El log decía `Invalid login credentials 400` y nada más, así que no había forma
> de ver que estaba preguntando por `admin@barzol.internal`. Con el email en el
> log, `BZ-96` se diagnostica de un vistazo en vez de probando contraseñas.
>
> El email sintético **no es un secreto**: se deriva del usuario que el visitante
> acaba de escribir. Va al log del servidor, nunca al cuerpo de la respuesta,
> porque en la respuesta sí permitiría enumerar usuarios.

### [REQ-1025] — No deseado · la contraseña nunca se registra
SI se registra información de un intento de login, ENTONCES NO DEBE incluir la
contraseña, ni completa, ni truncada, ni su longitud.

### [REQ-1026] — Dirigido por estado · mientras el email no concuerde
MIENTRAS el email de `auth.users` no derive del `username` de su
`admin_profile`, el despliegue DEBE considerarse incompleto aunque el humo pase.

> Las siete sondas de `SPEC-901` son de solo lectura anónima: **ninguna entra al
> panel**, así que todas pasarían con el administrador inaccesible.

---

## Contrato

```typescript
// src/shared/lib/auth/authClient.ts — ya existe, sin cambios de firma
export const ADMIN_EMAIL_DOMAIN = 'barzol.internal';
export function usernameToSyntheticEmail(username: string): string;
```

La corrección de `BZ-96` **no es código**: es cambiar el email del usuario en
Auth a `admin@barzol.internal`. Cambiar el email conserva el `id`, así que
`admin_profile` y las policies siguen siendo válidas sin tocar nada más.

## Invariantes verificables

- **INV-1:** `usernameToSyntheticEmail('Admin ') === usernameToSyntheticEmail('admin')`.
- **INV-2:** el resultado siempre termina en `@${ADMIN_EMAIL_DOMAIN}` y contiene
  exactamente una `@`.
- **INV-3:** `ADMIN_EMAIL_DOMAIN` no es un dominio real enrutable. Es interno y no
  recibe correo; si algún día apunta a uno real, los emails sintéticos pasan a ser
  direcciones que existen.
- **INV-4:** ningún log del proyecto contiene la contraseña de un intento de login.

## Riesgo de regresión

**Cambiar `ADMIN_EMAIL_DOMAIN` deja fuera a todos los administradores existentes
en el mismo commit**, sin error de compilación y sin test que lo note: los
usuarios de Auth siguen creados con el dominio anterior y el login empieza a
buscar direcciones que no existen. El síntoma sería idéntico al de `BZ-96` —
*"Usuario o contraseña incorrectos"*— y la causa, invisible.

Es exactamente la clase de constante que parece configuración y es en realidad
parte de la identidad de cada usuario ya dado de alta. Cambiarla es una
migración de `auth.users`, no una edición.

---

## Plan de pruebas

| ID | Verifica | Cómo |
| :--- | :--- | :--- |
| `[TEST-909-01]` | REQ-1021, INV-1 | mayúsculas y espacios dan el mismo email |
| `[TEST-909-02]` | REQ-1021, INV-2 | forma del resultado: una `@`, dominio al final |
| `[TEST-909-03]` | REQ-1020 | el email deriva del username y de nada más |
| `[TEST-909-04]` | INV-3 | `ADMIN_EMAIL_DOMAIN` usa un TLD reservado y no enrutable |
| `[TEST-909-05]` | REQ-1022, REQ-1023 | manual: el alta concuerda con `admin_profile` |
| `[TEST-909-06]` | REQ-1024, REQ-1025 | el log del fallo nombra el email y no la contraseña |
| `[TEST-909-07]` | REQ-1026 | manual: entrar al panel antes de dar el despliegue por bueno |

`TEST-909-05` y `-07` son manuales por construcción: exigen credenciales reales
contra un Supabase vivo, y `SPEC-901` prohíbe que una sonda automática escriba o
se autentique contra producción.

---

## Estado verificado el 2026-09-01

| Comprobación | Resultado |
| :--- | :--- |
| login con `admin@barzol.internal` | **Invalid login credentials** |
| login con el correo personal del dueño | **OK**, el mismo uid |
| email confirmado | sí |
| fila en `admin_profile` | **correcta**, `username='admin'`, `role='admin'` |
| `id` de `admin_profile` = `id` de `auth.users` | **sí** |
| policy `"self read"` de `admin_profile` | **funciona** |

Todo el alta es correcta salvo el email. Por eso el fallo es de una sola pieza y
se corrige en el panel, sin desplegar nada.
