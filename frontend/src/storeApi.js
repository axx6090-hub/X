export const STATIC_MODE = process.env.REACT_APP_STATIC_CATALOG === 'true';
export async function api(path, options = {}) {
  const response = await fetch('/api' + path, {
    credentials: 'same-origin', ...options,
    headers: { ...(options.body instanceof Blob ? {} : { 'Content-Type': 'application/json' }), 'X-Tokkma-Request': '1', ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || 'تعذر الاتصال بالمتجر. حاول مرة أخرى'), { status: response.status });
  return data;
}
export const writeApi = (path, method, body) => api(path, { method, body: JSON.stringify(body) });
