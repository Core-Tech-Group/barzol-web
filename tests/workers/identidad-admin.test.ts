import { describe, expect, it } from 'vitest';
import { ADMIN_EMAIL_DOMAIN, usernameToSyntheticEmail } from '@shared/lib/auth/authClient';

/**
 * SPEC-909 — la derivación del email del administrador.
 *
 * **Esta función decide quién puede entrar al panel y no tenía ni un test.** El
 * panel pide *usuario*, no email; Supabase Auth exige un email; el puente es
 * esta línea. Que sea corta no la hace poco importante: es el único sitio donde
 * se decide, y tiene que dar el mismo resultado al crear el usuario y al
 * entrar, para siempre.
 *
 * `BZ-96` fue exactamente eso desde el otro lado: el usuario de Auth se creó con
 * un email que no deriva de su `username`, así que el login preguntó por una
 * dirección que no existe y Supabase respondió lo mismo que ante una contraseña
 * equivocada. Se probó la contraseña una y otra vez. La contraseña estaba bien.
 *
 * **Por qué esto corre en la suite de workerd y no en la de lógica pura.**
 * `usernameToSyntheticEmail` ES pura —una plantilla de cadena—, pero vive junto a
 * `createSupabaseServerClient` en un módulo que importa `cloudflare:workers`, así
 * que en Node ni siquiera se puede cargar. Esa es la razón real de que nunca
 * tuviera tests. Separarla a su propio archivo es lo que corresponde y toca
 * `src/`: queda propuesto en SPEC-909, no se hace de rebote aquí.
 */

describe('SPEC-909 · usernameToSyntheticEmail · determinismo (REQ-1021)', () => {
  it('[TEST-909-01] ignora mayúsculas y espacios alrededor (INV-1)', () => {
    // Arrange — lo que alguien escribe de verdad en un formulario de login.
    const escrito = ['admin', 'Admin', 'ADMIN', '  admin  ', '\tAdmin\n'];

    // Act
    const emails = escrito.map(usernameToSyntheticEmail);

    // Assert — si dos formas del mismo usuario derivaran emails distintos,
    // entrar dependería de cómo se escribió el nombre esa vez.
    expect(new Set(emails).size).toBe(1);
    expect(emails[0]).toBe('admin@barzol.internal');
  });

  it('[TEST-909-02] el resultado tiene una sola @ y termina en el dominio (INV-2)', () => {
    // Act
    const email = usernameToSyntheticEmail('admin');

    // Assert
    expect(email.split('@')).toHaveLength(2);
    expect(email.endsWith(`@${ADMIN_EMAIL_DOMAIN}`)).toBe(true);
  });

  it('[TEST-909-03] depende solo de su argumento (REQ-1020)', () => {
    // Arrange / Act — dos llamadas separadas, mismo argumento.
    const a = usernameToSyntheticEmail('admin');
    const b = usernameToSyntheticEmail('admin');

    // Assert — el email no se guarda en ninguna parte: se vuelve a derivar en
    // cada login. Si dejara de ser puro, el usuario dejaría de existir.
    expect(a).toBe(b);
    expect(a).toBe(`admin@${ADMIN_EMAIL_DOMAIN}`);
  });

  it('[TEST-909-03] usuarios distintos derivan emails distintos', () => {
    // Assert — sin esto dos administradores compartirían identidad en Auth.
    expect(usernameToSyntheticEmail('admin')).not.toBe(usernameToSyntheticEmail('editor'));
  });
});

describe('SPEC-909 · ADMIN_EMAIL_DOMAIN · es interno (INV-3)', () => {
  it('[TEST-909-04] usa `.internal`, que no es enrutable', () => {
    // Assert — el dominio no debe poder recibir correo. Si apuntara a uno real,
    // los emails sintéticos pasarían a ser direcciones que existen de verdad, y
    // una cuenta interna se convertiría en un buzón alcanzable desde fuera.
    expect(ADMIN_EMAIL_DOMAIN).toMatch(/\.internal$/);
  });

  it('[TEST-909-04] cambiarlo es una migración, no una edición', () => {
    // Assert — el valor se fija aquí a propósito. Este test falla si alguien lo
    // cambia, y esa es toda su función: los usuarios de Auth ya dados de alta
    // llevan el dominio anterior dentro de su email, así que cambiar la
    // constante deja fuera a TODOS los administradores existentes, sin error de
    // compilación y con el síntoma de BZ-96 — "usuario o contraseña
    // incorrectos". Si este test falla, lo que hace falta es migrar auth.users.
    expect(ADMIN_EMAIL_DOMAIN).toBe('barzol.internal');
  });
});
