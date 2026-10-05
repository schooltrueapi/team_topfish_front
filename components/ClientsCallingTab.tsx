'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Phone,
  Mail,
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
  Clock4,
  Send,
  PhoneMissed,
  AlertCircle,
  MessageSquare,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export interface Client {
  id: string;
  name: string;
  city: string;
  phones: string[];
  emails?: string[];
  category: string;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientStats {
  total: number;
  working: number;
  onDemand?: number;
  priceSent?: number;
  noAnswer?: number;
  wrongNumber?: number;
  other?: number;
  rejected?: number;
  blacklist: number;
  notWorking?: number;
  stopped?: number;
}

export interface CategoryMeta {
  label: string;
  shortLabel?: string;
  color: string;
  activeBg: string;
  badge: string;
  dot: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  hasNote?: boolean;
  noteLabel?: string;
  notePlaceholder?: string;
  notePromptTitle?: string;
}

export const CATEGORIES_CONFIG: Record<string, CategoryMeta> = {
  WORKING: {
    label: 'Работаем',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100',
    activeBg: 'bg-emerald-700 text-white',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
    description: 'Действующие клиенты',
  },
  ON_DEMAND: {
    label: 'По потребности',
    color: 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100',
    activeBg: 'bg-sky-700 text-white',
    badge: 'bg-sky-100 text-sky-800 border-sky-200',
    dot: 'bg-sky-500',
    icon: Clock4,
    description: 'Берут по мере надобности',
  },
  PRICE_SENT: {
    label: 'Скинули прайс',
    color: 'bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100',
    activeBg: 'bg-indigo-700 text-white',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    dot: 'bg-indigo-500',
    icon: Send,
    description: 'Отправлен прайс-лист',
  },
  NO_ANSWER: {
    label: 'Не отвечают',
    color: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
    activeBg: 'bg-amber-600 text-white',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    icon: PhoneMissed,
    description: 'Не берут трубку / сброс',
  },
  WRONG_NUMBER: {
    label: 'Неправильный номер',
    color: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200',
    activeBg: 'bg-slate-700 text-white',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    icon: AlertCircle,
    description: 'Номер не существует / чужой',
  },
  OTHER: {
    label: 'Другое',
    color: 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100',
    activeBg: 'bg-purple-700 text-white',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    dot: 'bg-purple-500',
    icon: MessageSquare,
    hasNote: true,
    noteLabel: 'Примечание',
    notePlaceholder: 'Впишите примечание к клиенту...',
    notePromptTitle: 'Укажите примечание',
    description: 'Особый статус с примечанием',
  },
  REJECTED: {
    label: 'Отказали',
    color: 'bg-orange-50 text-orange-900 border-orange-300 hover:bg-orange-100',
    activeBg: 'bg-orange-600 text-white',
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
    dot: 'bg-orange-500',
    icon: XCircle,
    hasNote: true,
    noteLabel: 'Причина отказа',
    notePlaceholder: 'Укажите причину отказа (дорого, есть поставщик и т.д.)...',
    notePromptTitle: 'Укажите причину отказа',
    description: 'Отказ от сотрудничества',
  },
  BLACKLIST: {
    label: 'В ЧС',
    color: 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100',
    activeBg: 'bg-rose-700 text-white',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    dot: 'bg-rose-500',
    icon: Ban,
    hasNote: true,
    noteLabel: 'Причина ЧС',
    notePlaceholder: 'Укажите причину добавления в ЧС (долг, конфликт и т.д.)...',
    notePromptTitle: 'Укажите причину ЧС',
    description: 'Черный список',
  },
  // Legacy
  NOT_WORKING: {
    label: 'Не работаем',
    color: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200',
    activeBg: 'bg-slate-700 text-white',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    icon: Users,
    description: 'Потенциальные клиенты',
  },
  STOPPED: {
    label: 'Перестали',
    color: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
    activeBg: 'bg-amber-600 text-white',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    icon: AlertTriangle,
    description: 'Бывшие клиенты',
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
    onDemand: 0,
    priceSent: 0,
    noAnswer: 0,
    wrongNumber: 0,
    other: 0,
    rejected: 0,
    blacklist: 0,
    notWorking: 0,
    stopped: 0,
  });
  const [loading, setLoading] = useState(true);

  // Фильтры
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Модальное окно добавления/редактирования
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Поля формы
  const [formName, setFormName] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCategory, setFormCategory] = useState<string>('ON_DEMAND');
  const [formComment, setFormComment] = useState('');
  const [formPhones, setFormPhones] = useState<string[]>(['']);
  const [formEmails, setFormEmails] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Быстрое добавление номера прямо в строке клиента
  const [quickPhoneClientId, setQuickPhoneClientId] = useState<string | null>(null);
  const [quickPhoneValue, setQuickPhoneValue] = useState('');
  const [isAddingQuickPhone, setIsAddingQuickPhone] = useState(false);

  // Быстрое добавление email прямо в строке клиента
  const [quickEmailClientId, setQuickEmailClientId] = useState<string | null>(null);
  const [quickEmailValue, setQuickEmailValue] = useState('');
  const [isAddingQuickEmail, setIsAddingQuickEmail] = useState(false);

  // Модальное окно быстрого ввода примечания / причины отказа / причины ЧС
  const [quickNoteModal, setQuickNoteModal] = useState<{
    isOpen: boolean;
    client: Client;
    newCategory: string;
    commentText: string;
    noteLabel: string;
    notePromptTitle: string;
    notePlaceholder: string;
    isPrompt: boolean;
  } | null>(null);

  // Быстрое копирование
  const [copiedText, setCopiedText] = useState<string | null>(null);

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
      setStats(
        res.data.stats || {
          total: 0,
          working: 0,
          onDemand: 0,
          priceSent: 0,
          noAnswer: 0,
          wrongNumber: 0,
          other: 0,
          rejected: 0,
          blacklist: 0,
          notWorking: 0,
          stopped: 0,
        }
      );
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

  // Копирование телефона или почты
  const handleCopyText = (text: string, type: 'phone' | 'email', e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`${type === 'email' ? 'Email скопирован' : 'Номер скопирован'}: ${text}`, { duration: 1500 });
    setTimeout(() => {
      setCopiedText((prev) => (prev === text ? null : prev));
    }, 2000);
  };

  // Изменение категории в строке таблицы
  const handleCategorySelectChange = async (client: Client, newCat: string) => {
    const cfg = CATEGORIES_CONFIG[newCat];
    if (cfg?.hasNote) {
      // Открываем модальное окно для ввода примечания / причины
      setQuickNoteModal({
        isOpen: true,
        client,
        newCategory: newCat,
        commentText: client.comment || '',
        noteLabel: cfg.noteLabel || 'Примечание',
        notePromptTitle: cfg.notePromptTitle || 'Укажите примечание',
        notePlaceholder: cfg.notePlaceholder || 'Впишите текст...',
        isPrompt: true,
      });
    } else {
      // Категория без обязательного примечания
      try {
        setClients((prev) =>
          prev.map((c) => (c.id === client.id ? { ...c, category: newCat } : c))
        );
        await api.put(`/api/clients/${client.id}`, { category: newCat });
        fetchClients(true);
        toast.success('Категория обновлена', { duration: 1500 });
      } catch (err: any) {
        toast.error('Ошибка сохранения категории');
        fetchClients(true);
      }
    }
  };

  // Сохранение быстрого примечания / причины
  const handleSaveQuickNote = async (includeComment = true) => {
    if (!quickNoteModal) return;
    const { client, newCategory, commentText } = quickNoteModal;
    const comment = includeComment ? (commentText.trim() || null) : null;

    try {
      setClients((prev) =>
        prev.map((c) =>
          c.id === client.id ? { ...c, category: newCategory, comment } : c
        )
      );
      await api.put(`/api/clients/${client.id}`, {
        category: newCategory,
        comment,
      });
      setQuickNoteModal(null);
      fetchClients(true);
      toast.success('Данные сохранены', { duration: 1500 });
    } catch (err: any) {
      toast.error('Ошибка сохранения');
      fetchClients(true);
    }
  };

  // Открытие редактора примечания по клику на бейдж / карандаш в строке
  const handleOpenQuickNoteEditor = (client: Client) => {
    const cfg = CATEGORIES_CONFIG[client.category] || CATEGORIES_CONFIG.OTHER;
    setQuickNoteModal({
      isOpen: true,
      client,
      newCategory: client.category,
      commentText: client.comment || '',
      noteLabel: cfg.noteLabel || 'Примечание',
      notePromptTitle: cfg.notePromptTitle || 'Редактирование примечания',
      notePlaceholder: cfg.notePlaceholder || 'Впишите текст...',
      isPrompt: false,
    });
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

  // Быстрое добавление email в строке
  const handleAddQuickEmail = async (clientId: string) => {
    if (!quickEmailValue.trim()) return;
    try {
      setIsAddingQuickEmail(true);
      await api.post(`/api/clients/${clientId}/emails`, {
        email: quickEmailValue.trim(),
      });
      toast.success('Email добавлен!');
      setQuickEmailClientId(null);
      setQuickEmailValue('');
      fetchClients(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка добавления email');
    } finally {
      setIsAddingQuickEmail(false);
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

  // Удаление email у клиента
  const handleDeleteEmail = async (clientId: string, email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Удалить email ${email} у этого клиента?`)) return;
    try {
      await api.delete(`/api/clients/${clientId}/emails`, {
        data: { email },
      });
      toast.success('Email удален');
      fetchClients(true);
    } catch (err: any) {
      toast.error('Не удалось удалить email');
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
    setFormCategory('ON_DEMAND');
    setFormComment('');
    setFormPhones(['']);
    setFormEmails([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: Client) => {
    setEditingClient(client);
    setFormName(client.name);
    setFormCity(client.city);
    setFormCategory(client.category || 'ON_DEMAND');
    setFormComment(client.comment || '');
    setFormPhones(client.phones?.length ? [...client.phones] : []);
    setFormEmails(client.emails?.length ? [...client.emails] : []);
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

  // Добавление/удаление полей email в форме
  const handleAddEmailField = () => {
    setFormEmails((prev) => [...prev, '']);
  };

  const handleEmailFieldChange = (index: number, val: string) => {
    setFormEmails((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleRemoveEmailField = (index: number) => {
    setFormEmails((prev) => prev.filter((_, i) => i !== index));
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

    const cleanedEmails = formEmails
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    try {
      setIsSubmitting(true);
      const payload = {
        name: formName.trim(),
        city: formCity.trim(),
        category: formCategory,
        comment: formComment.trim() || null,
        phones: cleanedPhones,
        emails: cleanedEmails,
      };

      if (editingClient) {
        await api.put(`/api/clients/${editingClient.id}`, payload);
        toast.success('Клиент успешно обновлен');
      } else {
        await api.post('/api/clients', payload);
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

  // Список основных категорий для фильтров и модалок
  const MAIN_CATEGORIES = [
    'WORKING',
    'ON_DEMAND',
    'PRICE_SENT',
    'NO_ANSWER',
    'WRONG_NUMBER',
    'OTHER',
    'REJECTED',
    'BLACKLIST',
  ];

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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5">
        {/* Все клиенты */}
        <button
          type="button"
          onClick={() => setSelectedCategory('ALL')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
            selectedCategory === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-800 shadow-md'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider opacity-75 truncate">
              Все клиенты
            </span>
            <Building2 className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'ALL' ? 'text-teal-400' : 'text-slate-400'}`} />
          </div>
          <div className="text-xl font-black">{stats.total}</div>
          <div className="text-[10px] opacity-75 mt-0.5 truncate">База обзвона</div>
        </button>

        {/* Работаем */}
        <button
          type="button"
          onClick={() => setSelectedCategory('WORKING')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
            selectedCategory === 'WORKING'
              ? 'bg-emerald-700 text-white border-emerald-700 ring-2 ring-emerald-500 shadow-md'
              : 'bg-emerald-50/50 text-emerald-950 border-emerald-200 hover:bg-emerald-100/60'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider truncate">Работаем</span>
            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'WORKING' ? 'text-white' : 'text-emerald-600'}`} />
          </div>
          <div className="text-xl font-black text-emerald-800">{stats.working}</div>
          <div className="text-[10px] opacity-75 mt-0.5 truncate">
            {stats.total > 0 ? `${Math.round((stats.working / stats.total) * 100)}% базы` : '0%'}
          </div>
        </button>

        {/* По потребности */}
        <button
          type="button"
          onClick={() => setSelectedCategory('ON_DEMAND')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
            selectedCategory === 'ON_DEMAND'
              ? 'bg-sky-700 text-white border-sky-700 ring-2 ring-sky-500 shadow-md'
              : 'bg-sky-50/50 text-sky-950 border-sky-200 hover:bg-sky-100/60'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider truncate">По треб.</span>
            <Clock4 className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'ON_DEMAND' ? 'text-white' : 'text-sky-600'}`} />
          </div>
          <div className="text-xl font-black text-sky-900">{stats.onDemand || 0}</div>
          <div className="text-[10px] opacity-75 mt-0.5 truncate">По потребности</div>
        </button>

        {/* Скинули прайс */}
        <button
          type="button"
          onClick={() => setSelectedCategory('PRICE_SENT')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
            selectedCategory === 'PRICE_SENT'
              ? 'bg-indigo-700 text-white border-indigo-700 ring-2 ring-indigo-500 shadow-md'
              : 'bg-indigo-50/50 text-indigo-950 border-indigo-200 hover:bg-indigo-100/60'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider truncate">Прайс</span>
            <Send className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'PRICE_SENT' ? 'text-white' : 'text-indigo-600'}`} />
          </div>
          <div className="text-xl font-black text-indigo-900">{stats.priceSent || 0}</div>
          <div className="text-[10px] opacity-75 mt-0.5 truncate">Скинули прайс</div>
        </button>

        {/* Не отвечают */}
        <button
          type="button"
          onClick={() => setSelectedCategory('NO_ANSWER')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
            selectedCategory === 'NO_ANSWER'
              ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400 shadow-md'
              : 'bg-amber-50/60 text-amber-950 border-amber-200 hover:bg-amber-100/70'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider truncate">Не ответ.</span>
            <PhoneMissed className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'NO_ANSWER' ? 'text-white' : 'text-amber-600'}`} />
          </div>
          <div className="text-xl font-black text-amber-900">{stats.noAnswer || 0}</div>
          <div className="text-[10px] opacity-75 mt-0.5 truncate">Гудки / сброс</div>
        </button>

        {/* Неправильный номер */}
        <button
          type="button"
          onClick={() => setSelectedCategory('WRONG_NUMBER')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
            selectedCategory === 'WRONG_NUMBER'
              ? 'bg-slate-800 text-white border-slate-800 ring-2 ring-slate-600 shadow-md'
              : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider truncate">Не тот №</span>
            <AlertCircle className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'WRONG_NUMBER' ? 'text-white' : 'text-slate-500'}`} />
          </div>
          <div className="text-xl font-black text-slate-800">{stats.wrongNumber || 0}</div>
          <div className="text-[10px] opacity-75 mt-0.5 truncate">Неверный номер</div>
        </button>

        {/* Другое */}
        <button
          type="button"
          onClick={() => setSelectedCategory('OTHER')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
            selectedCategory === 'OTHER'
              ? 'bg-purple-700 text-white border-purple-700 ring-2 ring-purple-500 shadow-md'
              : 'bg-purple-50/50 text-purple-950 border-purple-200 hover:bg-purple-100/60'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider truncate">Другое</span>
            <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'OTHER' ? 'text-white' : 'text-purple-600'}`} />
          </div>
          <div className="text-xl font-black text-purple-900">{stats.other || 0}</div>
          <div className="text-[10px] opacity-75 mt-0.5 truncate">С примечанием</div>
        </button>

        {/* Отказали */}
        <button
          type="button"
          onClick={() => setSelectedCategory('REJECTED')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
            selectedCategory === 'REJECTED'
              ? 'bg-orange-600 text-white border-orange-600 ring-2 ring-orange-400 shadow-md'
              : 'bg-orange-50/60 text-orange-950 border-orange-200 hover:bg-orange-100/70'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider truncate">Отказали</span>
            <XCircle className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'REJECTED' ? 'text-white' : 'text-orange-600'}`} />
          </div>
          <div className="text-xl font-black text-orange-900">{stats.rejected || 0}</div>
          <div className="text-[10px] opacity-75 mt-0.5 truncate">Причина отказа</div>
        </button>

        {/* В ЧС */}
        <button
          type="button"
          onClick={() => setSelectedCategory('BLACKLIST')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
            selectedCategory === 'BLACKLIST'
              ? 'bg-rose-700 text-white border-rose-700 ring-2 ring-rose-500 shadow-md'
              : 'bg-rose-50/60 text-rose-950 border-rose-200 hover:bg-rose-100/70'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider truncate">В ЧС</span>
            <Ban className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'BLACKLIST' ? 'text-white' : 'text-rose-600'}`} />
          </div>
          <div className="text-xl font-black text-rose-800">{stats.blacklist}</div>
          <div className="text-[10px] opacity-75 mt-0.5 truncate">Причина ЧС</div>
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
              placeholder="Поиск по названию, городу, телефону, email или примечанию..."
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
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Все ({stats.total})
          </button>

          {MAIN_CATEGORIES.map((catKey) => {
            const cfg = CATEGORIES_CONFIG[catKey];
            if (!cfg) return null;
            let count = 0;
            if (catKey === 'WORKING') count = stats.working;
            else if (catKey === 'ON_DEMAND') count = stats.onDemand || 0;
            else if (catKey === 'PRICE_SENT') count = stats.priceSent || 0;
            else if (catKey === 'NO_ANSWER') count = stats.noAnswer || 0;
            else if (catKey === 'WRONG_NUMBER') count = stats.wrongNumber || 0;
            else if (catKey === 'OTHER') count = stats.other || 0;
            else if (catKey === 'REJECTED') count = stats.rejected || 0;
            else if (catKey === 'BLACKLIST') count = stats.blacklist;

            const isSelected = selectedCategory === catKey;

            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setSelectedCategory(catKey)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? `${cfg.activeBg} shadow-2xs`
                    : `${cfg.color}`
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : cfg.dot} inline-block`}></span>
                <span>{cfg.label} ({count})</span>
              </button>
            );
          })}

          {/* Legacy фильтры, если есть клиенты с такими категориями */}
          {(stats.notWorking || 0) > 0 && (
            <button
              type="button"
              onClick={() => setSelectedCategory('NOT_WORKING')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                selectedCategory === 'NOT_WORKING'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Не работаем ({stats.notWorking})
            </button>
          )}

          {(stats.stopped || 0) > 0 && (
            <button
              type="button"
              onClick={() => setSelectedCategory('STOPPED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                selectedCategory === 'STOPPED'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Перестали ({stats.stopped})
            </button>
          )}

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
                  <th className="py-3.5 px-4 w-[26%]">Название магазина / Контрагент</th>
                  <th className="py-3.5 px-4 w-[13%]">Город</th>
                  <th className="py-3.5 px-4 w-[21%]">Категория / Примечание</th>
                  <th className="py-3.5 px-4 w-[32%]">Контакты (Телефон / Email)</th>
                  <th className="py-3.5 px-4 text-right w-[8%]">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {clients.map((client) => {
                  const cfg =
                    CATEGORIES_CONFIG[client.category as keyof typeof CATEGORIES_CONFIG] ||
                    CATEGORIES_CONFIG.ON_DEMAND;
                  const isQuickPhoneOpen = quickPhoneClientId === client.id;
                  const isQuickEmailOpen = quickEmailClientId === client.id;

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

                      {/* Категория (интерактивный селектор) + Примечание / Причина с показом при наведении */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1.5">
                          {/* Селектор категории */}
                          <div className="relative inline-block">
                            <select
                              value={client.category}
                              onChange={(e) => handleCategorySelectChange(client, e.target.value)}
                              className={`pl-2.5 pr-7 py-1 rounded-lg text-xs font-bold border transition cursor-pointer appearance-none shadow-2xs ${cfg.color}`}
                              title={client.comment ? `${cfg.noteLabel || 'Примечание'}: ${client.comment}` : undefined}
                            >
                              <option value="WORKING">🟢 Работаем</option>
                              <option value="ON_DEMAND">🔵 По потребности</option>
                              <option value="PRICE_SENT">🟣 Скинули прайс</option>
                              <option value="NO_ANSWER">🟡 Не отвечают</option>
                              <option value="WRONG_NUMBER">⚪ Неправильный номер</option>
                              <option value="OTHER">💬 Другое</option>
                              <option value="REJECTED">🟠 Отказали</option>
                              <option value="BLACKLIST">🔴 В ЧС</option>
                              {client.category === 'NOT_WORKING' && <option value="NOT_WORKING">⚪ Не работаем</option>}
                              {client.category === 'STOPPED' && <option value="STOPPED">🟠 Перестали</option>}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] opacity-60">
                              ▼
                            </div>
                          </div>

                          {/* Примечание / Причина (показывается при наведении hover-тултипом) */}
                          {client.comment ? (
                            <div
                              className="group/note relative flex items-center gap-1.5 max-w-[240px] px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100/90 border border-slate-200 text-slate-700 text-[11px] font-medium transition cursor-help shadow-2xs"
                              title={`${cfg.noteLabel || 'Примечание'}: ${client.comment}`}
                            >
                              <MessageSquare className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{client.comment}</span>

                              {/* Всплывающая подсказка при наведении (hover tooltip) */}
                              <div className="pointer-events-none absolute left-0 bottom-full mb-1.5 hidden group-hover/note:flex flex-col z-30 w-64 p-2.5 rounded-xl bg-slate-900 text-white text-xs shadow-2xl border border-slate-800 animate-in fade-in duration-150">
                                <span className="font-bold text-[10px] uppercase text-teal-400 mb-0.5 tracking-wider">
                                  {cfg.noteLabel || 'Примечание'}
                                </span>
                                <span className="leading-snug break-words font-normal text-slate-200">
                                  {client.comment}
                                </span>
                                <div className="absolute left-4 top-full w-2.5 h-2.5 bg-slate-900 rotate-45 -translate-y-1.5"></div>
                              </div>

                              {/* Кнопка быстрого изменения примечания */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenQuickNoteEditor(client);
                                }}
                                className="ml-auto p-0.5 text-slate-400 hover:text-teal-600 rounded transition cursor-pointer"
                                title="Редактировать примечание / причину"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            cfg.hasNote && (
                              <button
                                type="button"
                                onClick={() => handleOpenQuickNoteEditor(client)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-slate-400 hover:text-teal-700 hover:bg-teal-50 border border-dashed border-slate-300 hover:border-teal-300 transition cursor-pointer"
                                title={`Указать ${cfg.noteLabel?.toLowerCase() || 'примечание'}`}
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>+ {cfg.noteLabel || 'Примечание'}</span>
                              </button>
                            )
                          )}
                        </div>
                      </td>

                      {/* Контакты: Номера телефонов и Адреса Email */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1.5">
                          {/* Список существующих номеров и email */}
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {/* Номера телефонов */}
                            {client.phones && client.phones.length > 0 && client.phones.map((phone, pIdx) => {
                              const isCopied = copiedText === phone;
                              const cleanDigits = phone.replace(/[^\d+]/g, '');

                              return (
                                <div
                                  key={`p-${pIdx}`}
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
                                    onClick={(e) => handleCopyText(phone, 'phone', e)}
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
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                    title="Удалить этот номер"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}

                            {/* Адреса Email */}
                            {client.emails && client.emails.length > 0 && client.emails.map((email, eIdx) => {
                              const isCopied = copiedText === email;

                              return (
                                <div
                                  key={`e-${eIdx}`}
                                  className="inline-flex items-center gap-1 pl-2 pr-1.5 py-1 rounded-lg bg-sky-50/80 border border-sky-200 text-sky-950 text-xs font-semibold group/email hover:bg-sky-100/80 transition shadow-2xs"
                                >
                                  <a
                                    href={`mailto:${email}`}
                                    className="flex items-center gap-1 hover:text-sky-700 hover:underline"
                                    title="Отправить письмо на почту"
                                  >
                                    <Mail className="w-3 h-3 text-sky-600 shrink-0" />
                                    <span>{email}</span>
                                  </a>

                                  {/* Скопировать */}
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyText(email, 'email', e)}
                                    className="p-1 text-slate-400 hover:text-sky-700 rounded transition cursor-pointer"
                                    title="Скопировать email"
                                  >
                                    {isCopied ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>

                                  {/* Удалить конкретный email */}
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteEmail(client.id, email, e)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                    title="Удалить этот email"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}

                            {(!client.phones || client.phones.length === 0) &&
                              (!client.emails || client.emails.length === 0) && (
                                <span className="text-slate-400 italic text-[11px]">
                                  Контакты не указаны
                                </span>
                              )}

                            {/* Кнопки быстрого добавления телефона и email */}
                            {!isQuickPhoneOpen && !isQuickEmailOpen && (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickPhoneClientId(client.id);
                                    setQuickPhoneValue('');
                                    setQuickEmailClientId(null);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 border border-dashed border-slate-300 hover:border-teal-300 text-xs font-medium transition cursor-pointer"
                                  title="Добавить номер телефона"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ Телефон</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickEmailClientId(client.id);
                                    setQuickEmailValue('');
                                    setQuickPhoneClientId(null);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-600 border border-dashed border-slate-300 hover:border-sky-300 text-xs font-medium transition cursor-pointer"
                                  title="Добавить электронную почту"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ Email</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Инлайн форма быстрого добавления телефона */}
                          {isQuickPhoneOpen && (
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
                                className="px-2.5 py-1 text-xs bg-white border border-teal-400 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 w-44 shadow-inner"
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

                          {/* Инлайн форма быстрого добавления email */}
                          {isQuickEmailOpen && (
                            <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                              <input
                                type="email"
                                autoFocus
                                value={quickEmailValue}
                                onChange={(e) => setQuickEmailValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddQuickEmail(client.id);
                                  if (e.key === 'Escape') setQuickEmailClientId(null);
                                }}
                                placeholder="zakaz@company.ru"
                                className="px-2.5 py-1 text-xs bg-white border border-sky-400 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 w-48 shadow-inner"
                              />
                              <button
                                type="button"
                                disabled={isAddingQuickEmail || !quickEmailValue.trim()}
                                onClick={() => handleAddQuickEmail(client.id)}
                                className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-2xs"
                              >
                                {isAddingQuickEmail ? '...' : 'Сохранить'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuickEmailClientId(null)}
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

      {/* 4. Модальное окно быстрого ввода примечания / причины */}
      {quickNoteModal && quickNoteModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setQuickNoteModal(null)}
              className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  {quickNoteModal.notePromptTitle}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[280px]">
                  {quickNoteModal.client.name} • {quickNoteModal.client.city}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {quickNoteModal.noteLabel}
              </label>
              <textarea
                autoFocus
                rows={3}
                value={quickNoteModal.commentText}
                onChange={(e) =>
                  setQuickNoteModal((prev) =>
                    prev ? { ...prev, commentText: e.target.value } : null
                  )
                }
                placeholder={quickNoteModal.notePlaceholder}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition resize-none"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickNoteModal(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                >
                  Отмена
                </button>
                {quickNoteModal.isPrompt && (
                  <button
                    type="button"
                    onClick={() => handleSaveQuickNote(false)}
                    className="px-3.5 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
                  >
                    Без примечания
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSaveQuickNote(true)}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Модальное окно создания / редактирования клиента */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200 my-8">
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
                    ? 'Измените данные клиента, категорию или контакты'
                    : 'Заполните информацию о контрагенте, телефоны или email'}
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MAIN_CATEGORIES.map((catKey) => {
                    const cfg = CATEGORIES_CONFIG[catKey];
                    if (!cfg) return null;
                    const Icon = cfg.icon;
                    const isSelected = formCategory === catKey;

                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => setFormCategory(catKey)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer text-center ${
                          isSelected
                            ? `${cfg.activeBg} shadow-sm ring-1 ring-slate-900/10`
                            : `${cfg.color}`
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="leading-tight">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Поле примечания / причины (динамически в зависимости от категории) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {CATEGORIES_CONFIG[formCategory]?.hasNote
                      ? CATEGORIES_CONFIG[formCategory]?.noteLabel
                      : 'Примечание к клиенту (необязательно)'}
                  </label>
                  {CATEGORIES_CONFIG[formCategory]?.hasNote && (
                    <span className="text-[10px] text-teal-600 font-semibold">
                      Показывается при наведении
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  placeholder={
                    CATEGORIES_CONFIG[formCategory]?.notePlaceholder ||
                    'Впишите примечание или дополнительную информацию...'
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                />
              </div>

              {/* Номера телефонов (динамический список) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-teal-600" />
                    <span>Номера телефонов</span>
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

                {formPhones.length === 0 ? (
                  <div className="py-2.5 px-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-500">
                    <span>Номера телефонов не указаны</span>
                    <button
                      type="button"
                      onClick={handleAddPhoneField}
                      className="text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Добавить номер</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
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
                        <button
                          type="button"
                          onClick={() => handleRemovePhoneField(idx)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer shrink-0"
                          title="Удалить этот номер"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Электронная почта (Email) (динамический список) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-sky-600" />
                    <span>Электронная почта (Email)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddEmailField}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Добавить email</span>
                  </button>
                </div>

                {formEmails.length === 0 ? (
                  <div className="py-2.5 px-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-500">
                    <span>Электронная почта не указана</span>
                    <button
                      type="button"
                      onClick={handleAddEmailField}
                      className="text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Добавить email</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {formEmails.map((email, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => handleEmailFieldChange(idx, e.target.value)}
                            placeholder={`Email ${idx + 1} (например: opt@ribatrade.ru)`}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveEmailField(idx)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer shrink-0"
                          title="Удалить этот email"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-1 italic">
                  * Можно указать только телефон, только email или оба контакта
                </p>
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
