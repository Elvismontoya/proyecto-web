export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`/api${path}`, opts);
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Error ${res.status}`);
  }
  // intenta parsear JSON; si no, devuelve texto
  try { return await res.json(); } catch { return await res.text(); }
}
