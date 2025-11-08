// src/hooks/useAuth.js
import { useMemo } from 'react';

export default function useAuth() {
  const token = localStorage.getItem('token');
  const rol = (localStorage.getItem('rol') || '').toLowerCase();
  return useMemo(() => ({
    isAuth: !!token,
    rol,
    hasRole: (...roles) => roles.map(r => String(r).toLowerCase()).includes(rol)
  }), [token, rol]);
}
