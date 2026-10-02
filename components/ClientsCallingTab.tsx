'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Phone,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Users,
  Copy,
  Check,
  Pencil,
  Trash2,
  X,
  Building2,
  MapPin,
  Filter,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export interface Client {
  id: string;
  name: string;
  city: string;
  phones: string[];
  category: 'WORKING' | 'NOT_WORKING' | 'STOPPED' | 'BLACKLIST' | string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientStats {
  total: number;
  working: number;
  notWorking: number;
  stopped: number;
  blacklist: number;
}

const CATEGORIES_CONFIG = {
  WORKING: {
    label: 'Работаем',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100',
    activeBg: 'bg-emerald-600 text-white',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  NOT_WORKING: {
    label: 'Не работаем',
    color: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200',
    activeBg: 'bg-slate-700 text-white',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    icon: Users,
  },
  STOPPED: {
    label: 'Перестали',
    color: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
    activeBg: 'bg-amber-600 text-white',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    icon: AlertTriangle,
  },
  BLACKLIST: {
    label: 'ЧС',
    color: 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100',
    activeBg: 'bg-rose-600 text-white',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    dot: 'bg-rose-500',
    icon: Ban,
  },
};

interface ClientsCallingTabProps {
  onCountChange?: (count: number) => void;
}

export default function ClientsCallingTab({ onCountChange }: ClientsCallingTabProps) {
  const { user } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [stats, setStats] = useState<ClientStats>({
    total: 0,
    working: 0,
    notWorking: 0,
    stopped: 0,
    blacklist: 0,
  });
  const [loading, setLoading] = useState(true);

  // Фильтры
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'WORKING' | 'NOT_WORKING' | 'STOPPED' | 'BLACKLIST'>('ALL');

  // Модальное окно добавления/редактирования
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Поля формы
  const [formName, setFormName] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCategory, setFormCategory] = useState<'WORKING' | 'NOT_WORKING' | 'STOPPED' | 'BLACKLIST'>('WORKING');
  const [formPhones, setFormPhones] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Быстрое добавление номера прямо в строке клиента
  const [quickPhoneClientId, setQuickPhoneClientId] = useState<string | null>(null);
  const [quickPhoneValue, setQuickPhoneValue] = useState('');
  const [isAddingQuickPhone, setIsAddingQuickPhone] = useState(false);

  // Быстрое копирование
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Загрузка данных
  const fetchClients = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get('/api/clients', {
        params: {
          search: search.trim() || undefined,
          city: selectedCity !== 'ALL' ? selectedCity : undefined,
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        },
      });

      setClients(res.data.items || []);
      setStats(res.data.stats || { total: 0, working: 0, notWorking: 0, stopped: 0, blacklist: 0 });
      setCities(res.data.cities || []);
      if (onCountChange && res.data.stats?.total !== undefined) {
        onCountChange(res.data.stats.total);
      }
    } catch (err: any) {
      console.error('Ошибка загрузки клиентов:', err);
      toast.error('Не удалось загрузить базу клиентов');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [selectedCity, selectedCategory]);

  // Поиск с дебаунсом
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Защита от утечки данных: запрет Ctrl+A (выделение), Ctrl+P (печать), Ctrl+S (сохранение), выделения и контекстного меню
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      // Блокировка Ctrl+A (Выделить всё) вне полей ввода формы
      if (isCtrlOrCmd && key === 'a' && !isInput) {
        e.preventDefault();
        window.getSelection()?.removeAllRanges();
        toast.error('Выделение клиентской базы отключено', { id: 'select-protected', duration: 1500 });
        return;
      }

      // Блокировка Ctrl+P (Печать / Экспорт в PDF)
      if (isCtrlOrCmd && key === 'p') {
        e.preventDefault();
        toast.error('Печать и выгрузка клиентской базы запрещены', { id: 'print-protected', duration: 2000 });
        return;
      }

      // Блокировка Ctrl+S (Сохранение HTML)
      if (isCtrlOrCmd && key === 's') {
        e.preventDefault();
        toast.error('Сохранение клиентской базы запрещено', { id: 'save-protected', duration: 2000 });
        return;
      }

      // Блокировка Ctrl+C при выделении вне полей ввода
      if (isCtrlOrCmd && key === 'c' && !isInput) {
        const selection = window.getSelection()?.toString();
        if (selection && selection.length > 0) {
          e.preventDefault();
          window.getSelection()?.removeAllRanges();
          toast.error('Копирование фрагментов базы запрещено', { id: 'copy-protected', duration: 1500 });
        }
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (!isInput) {
        e.preventDefault();
        window.getSelection()?.removeAllRanges();
      }
    };

    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (!isInput) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('selectstart', handleSelectStart);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, []);

  // Копирование телефона
  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    toast.success(`Номер скопирован: ${phone}`, { duration: 1500 });
    setTimeout(() => {
      setCopiedPhone((prev) => (prev === phone ? null : prev));
    }, 2000);
  };

  // Быстрое изменение категории в 1 клик
  const handleChangeCategory = async (clientId: string, newCat: string) => {
    try {
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, category: newCat } : c))
      );

      await api.put(`/api/clients/${clientId}`, { category: newCat });
      fetchClients(true);
      toast.success('Категория обновлена', { duration: 1500 });
    } catch (err: any) {
      toast.error('Ошибка сохранения категории');
      fetchClients(true);
    }
  };

  // Быстрое добавление номера в строке
  const handleAddQuickPhone = async (clientId: string) => {
    if (!quickPhoneValue.trim()) return;
    try {
      setIsAddingQuickPhone(true);
      await api.post(`/api/clients/${clientId}/phones`, {
        phone: quickPhoneValue.trim(),
      });
      toast.success('Номер добавлен!');
      setQuickPhoneClientId(null);
      setQuickPhoneValue('');
      fetchClients(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка добавления номера');
    } finally {
      setIsAddingQuickPhone(false);
    }
  };

  // Удаление номера у клиента
  const handleDeletePhone = async (clientId: string, phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Удалить номер ${phone} у этого клиента?`)) return;
    try {
      await api.delete(`/api/clients/${clientId}/phones`, {
        data: { phone },
      });
      toast.success('Номер удален');
      fetchClients(true);
    } catch (err: any) {
      toast.error('Не удалось удалить номер');
    }
  };

  // Удаление клиента
  const handleDeleteClient = async (client: Client) => {
    if (!confirm(`Вы действительно хотите удалить клиента "${client.name}" (${client.city})?`)) {
      return;
    }
    try {
      await api.delete(`/api/clients/${client.id}`);
      toast.success('Клиент удален');
      fetchClients(true);
    } catch (err: any) {
      toast.error('Ошибка удаления клиента');
    }
  };

  // Открытие модалки создания/редактирования
  const handleOpenCreateModal = () => {
    setEditingClient(null);
    setFormName('');
    setFormCity(selectedCity !== 'ALL' ? selectedCity : cities[0] || 'Нижневартовск');
    setFormCategory('WORKING');
    setFormPhones(['']);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: Client) => {
    setEditingClient(client);
    setFormName(client.name);
    setFormCity(client.city);
    setFormCategory((client.category as any) || 'WORKING');
    setFormPhones(client.phones?.length ? [...client.phones] : ['']);
    setIsModalOpen(true);
  };

  // Добавление/удаление полей телефонов в форме
  const handleAddPhoneField = () => {
    setFormPhones((prev) => [...prev, '']);
  };

  const handlePhoneFieldChange = (index: number, val: string) => {
    setFormPhones((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleRemovePhoneField = (index: number) => {
    setFormPhones((prev) => prev.filter((_, i) => i !== index));
  };

  // Сохранение формы
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Укажите название клиента');
      return;
    }
    if (!formCity.trim()) {
      toast.error('Укажите город');
      return;
    }

    const cleanedPhones = formPhones
      .map((p) => p.trim())
      .filter(Boolean);

    try {
      setIsSubmitting(true);
      if (editingClient) {
        await api.put(`/api/clients/${editingClient.id}`, {
          name: formName.trim(),
          city: formCity.trim(),
          category: formCategory,
          phones: cleanedPhones,
        });
        toast.success('Клиент успешно обновлен');
      } else {
        await api.post('/api/clients', {
          name: formName.trim(),
          city: formCity.trim(),
          category: formCategory,
          phones: cleanedPhones,
        });
        toast.success('Клиент успешно добавлен в базу');
      }

      setIsModalOpen(false);
      fetchClients(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка при сохранении клиента');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="protected-clients-view select-none space-y-6 pb-12"
      onContextMenu={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          toast.error('Контекстное меню базы клиентов отключено', { id: 'ctx-disabled', duration: 1500 });
        }
      }}
      onDragStart={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
    >
      {/* Предупреждение при попытке печати страницы */}
      <div className="protected-clients-print-warning p-10 text-center font-bold text-rose-600 text-lg bg-rose-50 border border-rose-300 rounded-2xl">
        🔒 Печать и экспорт базы клиентов строго запрещены политикой безопасности TopFish Control.
      </div>

      {/* 1. KPI карточки категорий (клик по карточке фильтрует список) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Все клиенты */}
        <button
          type="button"
          onClick={() => setSelectedCategory('ALL')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
            selectedCategory === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-800 shadow-md'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-75">
              Все клиенты
            </span>
            <Building2 className={`w-4 h-4 ${selectedCategory === 'ALL' ? 'text-teal-400' : 'text-slate-400'}`} />
          </div>
          <div className="text-2xl font-black">{stats.total}</div>
          <div className="text-[11px] opacity-75 mt-0.5">В базе обзвона</div>
        </button>

        {/* Работаем */}
        <button
          type="button"
          onClick={() => setSelectedCategory('WORKING')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
            selectedCategory === 'WORKING'
              ? 'bg-emerald-700 text-white border-emerald-700 ring-2 ring-emerald-500 shadow-md'
              : 'bg-emerald-50/50 text-emerald-950 border-emerald-200 hover:bg-emerald-100/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Работаем</span>
            <CheckCircle2 className={`w-4 h-4 ${selectedCategory === 'WORKING' ? 'text-white' : 'text-emerald-600'}`} />
          </div>
          <div className="text-2xl font-black text-emerald-800">
            {stats.working}
          </div>
          <div className="text-[11px] opacity-75 mt-0.5">
            {stats.total > 0 ? `${Math.round((stats.working / stats.total) * 100)}% от базы` : '0%'}
          </div>
        </button>

        {/* Не работаем */}
        <button
          type="button"
          onClick={() => setSelectedCategory('NOT_WORKING')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
            selectedCategory === 'NOT_WORKING'
              ? 'bg-slate-800 text-white border-slate-800 ring-2 ring-slate-600 shadow-md'
              : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Не работаем</span>
            <Users className={`w-4 h-4 ${selectedCategory === 'NOT_WORKING' ? 'text-white' : 'text-slate-500'}`} />
          </div>
          <div className="text-2xl font-black">{stats.notWorking}</div>
          <div className="text-[11px] opacity-75 mt-0.5">Потенциальные / лиды</div>
        </button>

        {/* Перестали */}
        <button
          type="button"
          onClick={() => setSelectedCategory('STOPPED')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
            selectedCategory === 'STOPPED'
              ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400 shadow-md'
              : 'bg-amber-50/60 text-amber-950 border-amber-200 hover:bg-amber-100/70'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Перестали</span>
            <AlertTriangle className={`w-4 h-4 ${selectedCategory === 'STOPPED' ? 'text-white' : 'text-amber-600'}`} />
          </div>
          <div className="text-2xl font-black text-amber-900">
            {stats.stopped}
          </div>
          <div className="text-[11px] opacity-75 mt-0.5">Закрылись / пауза</div>
        </button>

        {/* ЧС */}
        <button
          type="button"
          onClick={() => setSelectedCategory('BLACKLIST')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
            selectedCategory === 'BLACKLIST'
              ? 'bg-rose-700 text-white border-rose-700 ring-2 ring-rose-500 shadow-md'
              : 'bg-rose-50/60 text-rose-950 border-rose-200 hover:bg-rose-100/70'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">ЧС</span>
            <Ban className={`w-4 h-4 ${selectedCategory === 'BLACKLIST' ? 'text-white' : 'text-rose-600'}`} />
          </div>
          <div className="text-2xl font-black text-rose-800">
            {stats.blacklist}
          </div>
          <div className="text-[11px] opacity-75 mt-0.5">Черный список</div>
        </button>
      </div>

      {/* 2. Панель управления и фильтров */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Поиск */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию клиента, городу или номеру телефона..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Фильтр по городу */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[190px]">
              <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white cursor-pointer appearance-none transition"
              >
                <option value="ALL">Все города ({cities.length})</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                ▼
              </div>
            </div>

            {/* Защитный бейдж */}
            <div
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-semibold shrink-0 select-none"
              title="Выгрузка, печать и копирование закрыты политикой безопасности"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">База защищена</span>
            </div>

            {/* Кнопка добавления клиента */}
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-teal-600/20 transition cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить клиента</span>
            </button>
          </div>
        </div>

        {/* Быстрые фильтры по категориям */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Категория:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Все ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('WORKING')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              selectedCategory === 'WORKING'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            Работаем ({stats.working})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('NOT_WORKING')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              selectedCategory === 'NOT_WORKING'
                ? 'bg-slate-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
            Не работаем ({stats.notWorking})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('STOPPED')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              selectedCategory === 'STOPPED'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
            Перестали ({stats.stopped})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('BLACKLIST')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              selectedCategory === 'BLACKLIST'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
            ЧС ({stats.blacklist})
          </button>

          <span className="ml-auto text-xs text-slate-400 font-medium">
            Найдено: <strong className="text-slate-700">{clients.length}</strong>
          </span>
        </div>
      </div>

      {/* 3. Список клиентов */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-sm font-semibold">Загрузка базы клиентов...</span>
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Клиенты не найдены</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search || selectedCity !== 'ALL' || selectedCategory !== 'ALL'
              ? 'Попробуйте сбросить фильтры поиска или выбрать другой город.'
              : 'База клиентов пуста. Вы можете добавить первого клиента с помощью кнопки выше.'}
          </p>
          {(search || selectedCity !== 'ALL' || selectedCategory !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedCity('ALL');
                setSelectedCategory('ALL');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 w-[28%]">Название магазина / Контрагент</th>
                  <th className="py-3.5 px-4 w-[14%]">Город</th>
                  <th className="py-3.5 px-4 w-[18%]">Категория</th>
                  <th className="py-3.5 px-4 w-[32%]">Номера телефонов</th>
                  <th className="py-3.5 px-4 text-right w-[8%]">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {clients.map((client) => {
                  const cfg =
                    CATEGORIES_CONFIG[client.category as keyof typeof CATEGORIES_CONFIG] ||
                    CATEGORIES_CONFIG.NOT_WORKING;
                  const isQuickAddOpen = quickPhoneClientId === client.id;

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Название */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm align-top">
                        <div className="flex items-start gap-2">
                          <span className="leading-snug">{client.name}</span>
                        </div>
                      </td>

                      {/* Город */}
                      <td className="py-3.5 px-4 align-top">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                          <MapPin className="w-3 h-3 text-teal-600" />
                          <span>{client.city}</span>
                        </span>
                      </td>

                      {/* Категория (интерактивный селектор) */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="relative inline-block">
                          <select
                            value={client.category}
                            onChange={(e) => handleChangeCategory(client.id, e.target.value)}
                            className={`pl-2.5 pr-7 py-1 rounded-lg text-xs font-bold border transition cursor-pointer appearance-none ${cfg.color}`}
                          >
                            <option value="WORKING">🟢 Работаем</option>
                            <option value="NOT_WORKING">⚪ Не работаем</option>
                            <option value="STOPPED">🟠 Перестали</option>
                            <option value="BLACKLIST">🔴 ЧС</option>
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] opacity-60">
                            ▼
                          </div>
                        </div>
                      </td>

                      {/* Номера телефонов */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1.5">
                          {/* Список существующих номеров */}
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {client.phones && client.phones.length > 0 ? (
                              client.phones.map((phone, pIdx) => {
                                const isCopied = copiedPhone === phone;
                                const cleanDigits = phone.replace(/[^\d+]/g, '');

                                return (
                                  <div
                                    key={pIdx}
                                    className="inline-flex items-center gap-1 pl-2 pr-1.5 py-1 rounded-lg bg-teal-50/70 border border-teal-200 text-teal-950 text-xs font-semibold group/phone hover:bg-teal-100/70 transition shadow-2xs"
                                  >
                                    <a
                                      href={`tel:${cleanDigits}`}
                                      className="flex items-center gap-1 hover:text-teal-700 hover:underline"
                                      title="Позвонить"
                                    >
                                      <Phone className="w-3 h-3 text-teal-600 shrink-0" />
                                      <span>{phone}</span>
                                    </a>

                                    {/* Скопировать */}
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopyPhone(phone, e)}
                                      className="p-1 text-slate-400 hover:text-teal-700 rounded transition cursor-pointer"
                                      title="Скопировать номер"
                                    >
                                      {isCopied ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>

                                    {/* Удалить конкретный номер */}
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeletePhone(client.id, phone, e)}
                                      className="p-1 text-slate-300 hover:text-rose-600 rounded transition cursor-pointer opacity-50 group-hover/phone:opacity-100"
                                      title="Удалить этот номер"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              })
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">
                                Номера не указаны
                              </span>
                            )}

                            {/* Кнопка быстрого добавления номера */}
                            {!isQuickAddOpen && (
                              <button
                                type="button"
                                onClick={() => {
                                  setQuickPhoneClientId(client.id);
                                  setQuickPhoneValue('');
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 border border-dashed border-slate-300 hover:border-teal-300 text-xs font-medium transition cursor-pointer"
                                title="Добавить номер телефона"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Добавить номер</span>
                              </button>
                            )}
                          </div>

                          {/* Инлайн форма быстрого добавления номера */}
                          {isQuickAddOpen && (
                            <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                              <input
                                type="text"
                                autoFocus
                                value={quickPhoneValue}
                                onChange={(e) => setQuickPhoneValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddQuickPhone(client.id);
                                  if (e.key === 'Escape') setQuickPhoneClientId(null);
                                }}
                                placeholder="+7 (___) ___-__-__"
                                className="px-2.5 py-1 text-xs bg-white border border-teal-400 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 w-48 shadow-inner"
                              />
                              <button
                                type="button"
                                disabled={isAddingQuickPhone || !quickPhoneValue.trim()}
                                onClick={() => handleAddQuickPhone(client.id)}
                                className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-2xs"
                              >
                                {isAddingQuickPhone ? '...' : 'Сохранить'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuickPhoneClientId(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Действия */}
                      <td className="py-3.5 px-4 text-right align-top">
                        <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(client)}
                            className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition cursor-pointer"
                            title="Редактировать клиента"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClient(client)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Удалить клиента"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Футер таблицы */}
          <div className="p-3 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Показано клиентов: {clients.length}</span>
            <span>Всего в базе: {stats.total}</span>
          </div>
        </div>
      )}

      {/* 4. Модальное окно создания / редактирования клиента */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
            {/* Крестик закрытия */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Заголовок */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  {editingClient ? 'Редактирование клиента' : 'Новый клиент в базу обзвона'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingClient
                    ? 'Измените данные клиента или номера телефонов'
                    : 'Заполните информацию о контрагенте и контактные номера'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Название */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Название магазина / Контрагент <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Например: Пивной рай ООО Визит, ИП Иванов..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                />
              </div>

              {/* Город */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Город <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    list="cities-list"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="Например: Нижневартовск, Сургут, Стрежевой..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  />
                  <datalist id="cities-list">
                    {cities.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Категория */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Категория клиента <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormCategory('WORKING')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                      formCategory === 'WORKING'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Работаем</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormCategory('NOT_WORKING')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                      formCategory === 'NOT_WORKING'
                        ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <span>Не работаем</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormCategory('STOPPED')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                      formCategory === 'STOPPED'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Перестали</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormCategory('BLACKLIST')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                      formCategory === 'BLACKLIST'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <Ban className="w-4 h-4 shrink-0" />
                    <span>ЧС</span>
                  </button>
                </div>
              </div>

              {/* Номера телефонов (динамический список) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Номера телефонов
                  </label>
                  <button
                    type="button"
                    onClick={handleAddPhoneField}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Добавить номер</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {formPhones.map((phone, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => handlePhoneFieldChange(idx, e.target.value)}
                          placeholder={`Номер ${idx + 1} (например: 89224194014 или 20604)`}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                        />
                      </div>
                      {formPhones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePhoneField(idx)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                          title="Удалить поле"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Кнопки действий */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting
                    ? 'Сохранение...'
                    : editingClient
                    ? 'Сохранить изменения'
                    : 'Создать клиента'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
