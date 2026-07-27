export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
}

export function jsonResponse<T>(data: T, status = 200): Response {
  const body: ApiResponse<T> = { success: true, data, message: null };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 500): Response {
  const body: ApiResponse<null> = { success: false, data: null, message };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
