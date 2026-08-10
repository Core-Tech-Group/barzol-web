// Los guardados de admin recargan la página al terminar (para traer el
// estado real del servidor) — un Toast normal desaparecería antes de que se
// vea, porque el reload destruye el componente. Se guarda el mensaje en
// sessionStorage antes de recargar, y la isla lo lee una vez al montar.
const KEY = 'admin-success-message';

export function queueSuccessMessage(message: string) {
  sessionStorage.setItem(KEY, message);
}

export function consumeSuccessMessage(): string | null {
  const message = sessionStorage.getItem(KEY);
  if (message) sessionStorage.removeItem(KEY);
  return message;
}
