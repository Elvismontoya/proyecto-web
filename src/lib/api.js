// src/lib/api.js
const BASE = import.meta.env.VITE_API_URL;

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parse(res) {
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function apiGet(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { ...authHeader() } });
  return parse(res);
}

export async function apiPost(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
  });
  return parse(res);
}

export async function apiPut(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
  });
  return parse(res);
}

export async function apiDel(path) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: { ...authHeader() },
  });
  return parse(res);
}
