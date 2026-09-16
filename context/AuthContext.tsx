'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export interface User {
  id: string;
  name: string;
  username: string;
  role?: string;
  roleId?: string;
  permissions?: string[];
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
  _count?: { users: number };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  roles: Role[];
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  fetchRoles: () => Promise<void>;
  createRole: (name: string, description?: string, permissions?: string[]) => Promise<boolean>;
  updateRole: (id: string, data: { name?: string; description?: string; permissions?: string[] }) => Promise<boolean>;
  deleteRole: (id: string) => Promise<boolean>;
  createUser: (name: string, username: string, password: string, roleId?: string) => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('topfish_control_token');
      const savedUser = localStorage.getItem('topfish_control_user');

      if (savedToken && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          const res = await api.get('/api/auth/me');
          setUser(res.data);
          localStorage.setItem('topfish_control_user', JSON.stringify(res.data));
        } catch (e) {
          console.warn('Токен авторизации недействителен или устарел, очищаем сессию.');
          localStorage.removeItem('topfish_control_token');
          localStorage.removeItem('topfish_control_user');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await api.get('/api/auth/roles');
      setRoles(res.data);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    // Руководитель всегда имеет полный доступ ко всем функциям
    if (user.role === 'Руководитель') return true;
    const perms = user.permissions || [];
    if (perms.includes('FULL_ACCESS')) return true;
    return perms.includes(permission);
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await api.post('/api/auth/login', { username, password });
      const { token, user: loggedUser } = res.data;
      localStorage.setItem('topfish_control_token', token);
      localStorage.setItem('topfish_control_user', JSON.stringify(loggedUser));
      setUser(loggedUser);
      toast.success(`Добро пожаловать, ${loggedUser.name}!`);
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Ошибка входа';
      toast.error(msg);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('topfish_control_token');
    localStorage.removeItem('topfish_control_user');
    setUser(null);
    toast.success('Вы вышли из системы');
    window.location.href = '/login';
  };

  const createRole = async (name: string, description?: string, permissions: string[] = []): Promise<boolean> => {
    try {
      await api.post('/api/auth/roles', { name, description, permissions });
      toast.success(`Роль "${name}" успешно создана!`);
      await fetchRoles();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка создания роли');
      return false;
    }
  };

  const updateRole = async (
    id: string,
    data: { name?: string; description?: string; permissions?: string[] }
  ): Promise<boolean> => {
    try {
      await api.put(`/api/auth/roles/${id}`, data);
      toast.success('Роль успешно обновлена!');
      await fetchRoles();
      // Если изменена роль текущего авторизованного пользователя — освежаем профиль
      if (user?.roleId === id) {
        const meRes = await api.get('/api/auth/me');
        setUser(meRes.data);
        localStorage.setItem('topfish_control_user', JSON.stringify(meRes.data));
      }
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка обновления роли');
      return false;
    }
  };

  const deleteRole = async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/api/auth/roles/${id}`);
      toast.success('Роль успешно удалена!');
      await fetchRoles();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка удаления роли');
      return false;
    }
  };

  const createUser = async (name: string, username: string, password: string, roleId?: string): Promise<boolean> => {
    try {
      await api.post('/api/auth/users', { name, username, password, roleId });
      toast.success(`Сотрудник "${name}" добавлен!`);
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка создания сотрудника');
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        roles,
        login,
        logout,
        fetchRoles,
        createRole,
        updateRole,
        deleteRole,
        createUser,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
