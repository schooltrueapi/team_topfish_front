'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, Role } from '@/context/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  X,
  ShieldPlus,
  UserPlus,
  Users,
  Shield,
  Pencil,
  Trash2,
  Check,
  CheckSquare,
  UploadCloud,
  Lock,
} from 'lucide-react';

interface RolesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PERMISSION_CONFIG = [
  {
    id: 'FULL_ACCESS',
    name: 'Полный доступ',
    description: 'Все функции, закрытие недель и управление ролями',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Shield,
  },
  {
    id: 'UPLOAD_1C',
    name: 'Загрузка файла 1С',
    description: 'Загрузка и пересчет прайс-листов 1С на неделю',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
    icon: UploadCloud,
  },
  {
    id: 'TOGGLE_PLAN',
    name: 'Отметка в плане',
    description: 'Отметка товаров в производственный план недели',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: CheckSquare,
  },
];

export default function RolesModal({ isOpen, onClose }: RolesModalProps) {
  const { roles, fetchRoles, createRole, updateRole, deleteRole, createUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles');

  // Форма создания роли
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [rolePermissions, setRolePermissions] = useState<string[]>(['TOGGLE_PLAN']);
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  // Состояние редактирования роли
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Форма пользователя
  const [userName, setUserName] = useState('');
  const [userLogin, setUserLogin] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRoleId, setUserRoleId] = useState('');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Список существующих пользователей
  const [usersList, setUsersList] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/auth/users');
      setUsersList(res.data);
    } catch (e) {}
  };

  if (!isOpen) return null;

  // Переключение чекбокса прав при создании
  const toggleCreatePermission = (permId: string) => {
    if (permId === 'FULL_ACCESS') {
      if (rolePermissions.includes('FULL_ACCESS')) {
        setRolePermissions([]);
      } else {
        setRolePermissions(['FULL_ACCESS', 'UPLOAD_1C', 'TOGGLE_PLAN']);
      }
      return;
    }

    setRolePermissions((prev) => {
      const exists = prev.includes(permId);
      const next = exists ? prev.filter((p) => p !== permId) : [...prev, permId];
      if (exists && prev.includes('FULL_ACCESS')) {
        return next.filter((p) => p !== 'FULL_ACCESS');
      }
      return next;
    });
  };

  // Переключение чекбокса прав при редактировании
  const toggleEditPermission = (permId: string) => {
    if (permId === 'FULL_ACCESS') {
      if (editPermissions.includes('FULL_ACCESS')) {
        setEditPermissions([]);
      } else {
        setEditPermissions(['FULL_ACCESS', 'UPLOAD_1C', 'TOGGLE_PLAN']);
      }
      return;
    }

    setEditPermissions((prev) => {
      const exists = prev.includes(permId);
      const next = exists ? prev.filter((p) => p !== permId) : [...prev, permId];
      if (exists && prev.includes('FULL_ACCESS')) {
        return next.filter((p) => p !== 'FULL_ACCESS');
      }
      return next;
    });
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;
    setIsSubmittingRole(true);
    const ok = await createRole(roleName.trim(), roleDesc.trim(), rolePermissions);
    setIsSubmittingRole(false);
    if (ok) {
      setRoleName('');
      setRoleDesc('');
      setRolePermissions(['TOGGLE_PLAN']);
    }
  };

  const startEditRole = (r: Role) => {
    setEditingRoleId(r.id);
    setEditName(r.name);
    setEditDesc(r.description || '');
    setEditPermissions(r.permissions || []);
  };

  const cancelEditRole = () => {
    setEditingRoleId(null);
    setEditName('');
    setEditDesc('');
    setEditPermissions([]);
  };

  const handleSaveEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoleId || !editName.trim()) return;
    setIsUpdatingRole(true);
    const ok = await updateRole(editingRoleId, {
      name: editName.trim(),
      description: editDesc.trim(),
      permissions: editPermissions,
    });
    setIsUpdatingRole(false);
    if (ok) {
      cancelEditRole();
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if ((role._count?.users || 0) > 0) {
      toast.error('Нельзя удалить роль, назначенную сотрудникам');
      return;
    }
    if (!confirm(`Удалить роль "${role.name}"?`)) return;
    await deleteRole(role.id);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userLogin.trim() || !userPassword) return;
    setIsSubmittingUser(true);
    const ok = await createUser(userName.trim(), userLogin.trim(), userPassword, userRoleId || undefined);
    setIsSubmittingUser(false);
    if (ok) {
      setUserName('');
      setUserLogin('');
      setUserPassword('');
      setUserRoleId('');
      fetchUsers();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Шапка */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                Управление ролями и сотрудниками
              </h3>
              <p className="text-xs text-slate-500">
                Создание и настройка прав доступа для должностей цеха
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Переключатель вкладок */}
        <div className="flex border-b border-slate-200 bg-slate-100/60 px-5 pt-2">
          <button
            onClick={() => setActiveTab('roles')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'roles'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldPlus className="w-4 h-4" />
            <span>Роли и права ({roles.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Сотрудники ({usersList.length})</span>
          </button>
        </div>

        {/* Тело вкладки: Роли */}
        {activeTab === 'roles' && (
          <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Форма создания роли */}
            <form onSubmit={handleCreateRole} className="p-4 bg-purple-50/50 border border-purple-200/80 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <ShieldPlus className="w-4 h-4 text-purple-600" />
                  Создать новую роль
                </h4>
                <span className="text-[11px] text-purple-600">Назначьте необходимые права</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Название должности/роли *
                  </label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="Например: Мастер цеха, Бригадир..."
                    className="w-full px-3 py-2 text-xs border border-purple-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Описание обязанностей
                  </label>
                  <input
                    type="text"
                    value={roleDesc}
                    onChange={(e) => setRoleDesc(e.target.value)}
                    placeholder="Краткое описание..."
                    className="w-full px-3 py-2 text-xs border border-purple-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Выбор прав доступа */}
              <div>
                <label className="block text-[11px] font-bold text-purple-950 uppercase tracking-tight mb-2">
                  Права доступа для этой роли:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {PERMISSION_CONFIG.map((perm) => {
                    const isChecked = rolePermissions.includes(perm.id);
                    const Icon = perm.icon;
                    return (
                      <div
                        key={perm.id}
                        onClick={() => toggleCreatePermission(perm.id)}
                        className={`cursor-pointer p-3 rounded-xl border transition flex flex-col justify-between ${
                          isChecked
                            ? 'bg-purple-100/70 border-purple-400 ring-2 ring-purple-400/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Icon className={`w-3.5 h-3.5 ${isChecked ? 'text-purple-700' : 'text-slate-400'}`} />
                            {perm.name}
                          </span>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isChecked ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1.5 leading-tight">
                          {perm.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmittingRole || !roleName.trim()}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <ShieldPlus className="w-4 h-4" />
                  <span>{isSubmittingRole ? 'Создание роли...' : 'Создать роль'}</span>
                </button>
              </div>
            </form>

            {/* Список ролей и их прав */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Существующие роли и выданные права
                </h4>
                <span className="text-xs text-slate-400 font-medium">
                  Нажмите «Редактировать», чтобы изменить права
                </span>
              </div>

              <div className="space-y-3">
                {roles.map((r) => {
                  const isEditing = editingRoleId === r.id;
                  const rolePerms = r.permissions || [];

                  if (isEditing) {
                    return (
                      <form
                        key={r.id}
                        onSubmit={handleSaveEditRole}
                        className="p-4 bg-purple-50/80 border-2 border-purple-400 rounded-2xl space-y-3.5 shadow-sm animate-in fade-in duration-150"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-purple-900 uppercase flex items-center gap-1.5">
                            <Pencil className="w-3.5 h-3.5" />
                            Редактирование роли «{r.name}»
                          </span>
                          <button
                            type="button"
                            onClick={cancelEditRole}
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            Отмена
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                              Название роли
                            </label>
                            <input
                              type="text"
                              required
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-purple-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                              Описание
                            </label>
                            <input
                              type="text"
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-purple-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>

                        {/* Переключатели прав в форме редактирования */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1.5">
                            Права роли:
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {PERMISSION_CONFIG.map((perm) => {
                              const isChecked = editPermissions.includes(perm.id);
                              const Icon = perm.icon;
                              return (
                                <div
                                  key={perm.id}
                                  onClick={() => toggleEditPermission(perm.id)}
                                  className={`cursor-pointer p-2.5 rounded-xl border transition flex flex-col justify-between ${
                                    isChecked
                                      ? 'bg-purple-100 border-purple-400 ring-2 ring-purple-400/20'
                                      : 'bg-white border-slate-200 hover:border-purple-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                      <Icon className={`w-3 h-3 ${isChecked ? 'text-purple-700' : 'text-slate-400'}`} />
                                      {perm.name}
                                    </span>
                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                                      isChecked ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300 bg-white'
                                    }`}>
                                      {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={cancelEditRole}
                            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200/60 rounded-lg transition"
                          >
                            Отмена
                          </button>
                          <button
                            type="submit"
                            disabled={isUpdatingRole || !editName.trim()}
                            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50"
                          >
                            {isUpdatingRole ? 'Сохранение...' : 'Сохранить изменения'}
                          </button>
                        </div>
                      </form>
                    );
                  }

                  return (
                    <div
                      key={r.id}
                      className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-slate-300 transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{r.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                              {r._count?.users || 0} сотр.
                            </span>
                            {r.name === 'Руководитель' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200 flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Системная
                              </span>
                            )}
                          </div>
                          {r.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
                          )}
                        </div>

                        {/* Кнопки действий */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditRole(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 rounded-lg text-xs font-semibold border border-slate-200 hover:border-purple-200 transition"
                            title="Редактировать роль и права"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Редактировать</span>
                          </button>

                          {r.name !== 'Руководитель' && (r._count?.users || 0) === 0 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRole(r)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Удалить роль"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Бейджи выданных прав */}
                      <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-slate-400 mr-1">Права:</span>
                        {rolePerms.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">
                            Нет специальных прав (только просмотр)
                          </span>
                        ) : (
                          rolePerms.map((p) => {
                            const config = PERMISSION_CONFIG.find((c) => c.id === p);
                            if (!config) return null;
                            const Icon = config.icon;
                            return (
                              <span
                                key={p}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${config.badgeClass}`}
                              >
                                <Icon className="w-3 h-3" />
                                {config.name}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Тело вкладки: Сотрудники */}
        {activeTab === 'users' && (
          <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Форма добавления сотрудника */}
            <form onSubmit={handleCreateUser} className="p-4 bg-teal-50/60 border border-teal-200 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4" />
                Добавить сотрудника
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="ФИО или Имя (например: Мария Иванова)..."
                  className="px-3 py-2 text-xs border border-teal-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <select
                  value={userRoleId}
                  onChange={(e) => setUserRoleId(e.target.value)}
                  className="px-3 py-2 text-xs border border-teal-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Выберите роль сотрудника...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  value={userLogin}
                  onChange={(e) => setUserLogin(e.target.value)}
                  placeholder="Логин для входа..."
                  className="px-3 py-2 text-xs border border-teal-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <input
                  type="password"
                  required
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="Пароль..."
                  className="px-3 py-2 text-xs border border-teal-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmittingUser || !userName.trim() || !userLogin.trim()}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                {isSubmittingUser ? 'Добавление...' : '+ Добавить сотрудника'}
              </button>
            </form>

            {/* Список сотрудников */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Сотрудники цеха
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                {usersList.map((u) => (
                  <div key={u.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{u.name}</span>
                      <span className="text-slate-400 ml-2">(@{u.username})</span>
                    </div>
                    <div>
                      {u.role ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold text-[11px] border border-purple-200">
                          {u.role.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Без роли</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
