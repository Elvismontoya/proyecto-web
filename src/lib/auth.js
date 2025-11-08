// src/lib/auth.js
import { apiPost } from './api';

export async function login(usuario, password) {
  const { token, rol } = await apiPost('/api/auth/login', { usuario, password });
  localStorage.setItem('token', token);
  localStorage.setItem('rol', rol);
  return { token, rol };
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('rol');
}

export function isAuth() {
  return !!localStorage.getItem('token');
}

export function getRole() {
  return (localStorage.getItem('rol') || '').toLowerCase();
}
