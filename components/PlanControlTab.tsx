'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import PositionHistoryModal from './PositionHistoryModal';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Search,
  RefreshCw,
  BarChart3,
  Calendar,
  Layers,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Info,
  CheckSquare,
  Square,
  Package,
  Award,
  Filter,
} from 'lucide-react';

export interface PlanControlItem {
  id: string;
  productName: string;
  category: string;
  price: number | null;
  startStockKg: number;
  currentStockKg: number;
  totalInflowKg: number;
  totalOutflowKg: number;
  netDeltaKg: number;
  isPlanned: boolean;
  plannedKg: number | null;
  resultStatus: string | null;
  reasonComment: string | null;
  controlStatus: 'UNPLANNED' | 'SUSPICIOUS_DONE' | 'CONFIRMED_DONE' | 'PLANNED_INCOMPLETE' | 'REGULAR';
  badgeText: string;
  badgeType: 'danger' | 'warning' | 'success' | 'info' | 'neutral';
  explanation: string;
  historyPointsCount: number;
}

export interface PlanControlStats {
  unplannedCount: number;
  unplannedTotalKg: number;
  suspiciousDoneCount: number;
  confirmedDoneCount: number;
  confirmedTotalKg: number;
  plannedNotDoneCount: number;
  totalPlanned: number;
  totalItems: number;
  honestyRate: number;
}

export interface PlanControlWeek {
  id: string;
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  status: string;
  excelFileName?: string | null;
  excelFileUploadedAt?: string | null;
}

interface PlanControlTabProps {
  currentWeek: any;
  viewingWeek?: any;
  weeksHistory?: any[];
  onSelectWeek?: (weekId: string) => void;
}

export default function PlanControlTab({
  currentWeek,
  viewingWeek,
  weeksHistory = [],
  onSelectWeek,
}: PlanControlTabProps) {
  const activeWeek = viewingWeek || currentWeek;
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<{
    week: PlanControlWeek | null;
    stats: PlanControlStats | null;
    items: PlanControlItem[];
  }>({
    week: null,
    stats: null,
    items: [],
  });

  // Фильтры и поиск
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'suspicious' | 'unplanned' | 'confirmed' | 'incomplete' | 'regular'
  >('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Модалка графика остатков
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<string | null>(null);

  // Загрузка данных аудита плана
  const fetchData = useCallback(async (weekId: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/api/weeks/${weekId}/plan-control`);
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to fetch plan control data:', err);
      toast.error(err?.response?.data?.error || 'Ошибка загрузки данных контроля плана');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeWeek?.id) {
      fetchData(activeWeek.id);
    }
  }, [activeWeek?.id, fetchData]);

  // Список категорий для выпадающего списка
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const it of data.items) {
      if (it.category) set.add(it.category);
    }
    return Array.from(set).sort();
  }, [data.items]);

  // Фильтрация позиций
  const filteredItems = useMemo(() => {
    return data.items.filter((item) => {
      // Поиск по названию
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.productName.toLowerCase().includes(q);
        const matchesCat = item.category.toLowerCase().includes(q);
        if (!matchesName && !matchesCat) return false;
      }

      // Фильтр по категории
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Фильтр по статусу контроля
      if (statusFilter === 'suspicious') {
        return item.controlStatus === 'SUSPICIOUS_DONE';
      }
      if (statusFilter === 'unplanned') {
        return item.controlStatus === 'UNPLANNED';
      }
      if (statusFilter === 'confirmed') {
        return item.controlStatus === 'CONFIRMED_DONE';
      }
      if (statusFilter === 'incomplete') {
        return item.controlStatus === 'PLANNED_INCOMPLETE';
      }
      if (statusFilter === 'regular') {
        return item.controlStatus === 'REGULAR';
      }

      return true;
    });
  }, [data.items, searchQuery, selectedCategory, statusFilter]);

  const stats = data.stats;

  const formatDateRange = (start?: string, end?: string) => {
    if (!start || !end) return '';
    const d1 = new Date(start);
    const d2 = new Date(end);
    return `${d1.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} — ${d2.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  return (
    <div className="space-y-6">
      {/* ═══ Шапка раздела для администратора ═══ */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-rose-900/40 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/25 text-rose-200 border border-rose-400/30 text-xs font-black uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                Служба контроля руководства
              </span>
              {data.week && (
                <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold border border-white/15">
                  Неделя №{data.week.weekNumber} ({data.week.year})
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Контроль выпуска: План vs Факт 1С</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Автоматическая сверка утвержденных галочек плана с реальным движением остатков по файлам 1С.
              Выявляет попытки фиктивной отметки «Сделано» при отсутствии прихода, а также самовольный выпуск продукции без плана.
            </p>
          </div>

          {/* Переключатель недели и кнопка обновления */}
          <div className="flex items-center gap-3 self-start lg:self-center shrink-0">
            {weeksHistory && weeksHistory.length > 0 && onSelectWeek && (
              <div className="relative">
                <select
                  value={activeWeek?.id || ''}
                  onChange={(e) => onSelectWeek(e.target.value)}
                  className="bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl px-3.5 py-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-rose-400/50 cursor-pointer appearance-none pr-8"
                >
                  {weeksHistory.map((w: any) => (
                    <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                      Неделя №{w.weekNumber} ({w.year}) {w.id === currentWeek?.id ? '• Текущая' : '• Архив'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            <button
              onClick={() => activeWeek?.id && fetchData(activeWeek.id)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/20 text-white text-xs font-bold transition border border-white/20 cursor-pointer disabled:opacity-50"
              title="Пересчитать и обновить данные аудита"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Обновить</span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Карточки KPI аудита (Светофор) ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Карточка 1: Сомнительное "Сделано" (Подозрение на обман) */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'suspicious' ? 'all' : 'suspicious')}
          className={`cursor-pointer rounded-2xl p-5 border transition shadow-sm relative overflow-hidden flex flex-col justify-between ${
            statusFilter === 'suspicious'
              ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold tracking-wider text-amber-700">
              Сомнительное «Сделано»
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-amber-950">
              {stats?.suspiciousDoneCount ?? 0}
            </div>
            <div className="text-xs text-amber-800 font-medium mt-1">
              позиций нажато «Сделано», но прихода в 1С нет
            </div>
          </div>
          <div className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
            <span>{statusFilter === 'suspicious' ? 'Фильтр активен ✓' : 'Показать сомнительные →'}</span>
          </div>
        </div>

        {/* Карточка 2: Вне плана (Партизанщина) */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'unplanned' ? 'all' : 'unplanned')}
          className={`cursor-pointer rounded-2xl p-5 border transition shadow-sm relative overflow-hidden flex flex-col justify-between ${
            statusFilter === 'unplanned'
              ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-rose-400 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold tracking-wider text-rose-700">
              Вне плана (Самовольно)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-rose-950">
              {stats?.unplannedCount ?? 0}
            </div>
            <div className="text-xs text-rose-800 font-medium mt-1">
              позиций пришло в 1С без галочки в плане ({stats?.unplannedTotalKg ?? 0} кг)
            </div>
          </div>
          <div className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
            <span>{statusFilter === 'unplanned' ? 'Фильтр активен ✓' : 'Показать внеплановые →'}</span>
          </div>
        </div>

        {/* Карточка 3: Честно подтвержденный выпуск */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'confirmed' ? 'all' : 'confirmed')}
          className={`cursor-pointer rounded-2xl p-5 border transition shadow-sm relative overflow-hidden flex flex-col justify-between ${
            statusFilter === 'confirmed'
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-700">
              Подтверждено 1С
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-emerald-950">
              {stats?.confirmedDoneCount ?? 0}
            </div>
            <div className="text-xs text-emerald-800 font-medium mt-1">
              в плане стояло, факт прихода зафиксирован (+{stats?.confirmedTotalKg ?? 0} кг)
            </div>
          </div>
          <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
            <span>{statusFilter === 'confirmed' ? 'Фильтр активен ✓' : 'Показать подтвержденные →'}</span>
          </div>
        </div>

        {/* Карточка 4: Достоверность плана (Индекс доверия) */}
        <div className="rounded-2xl p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-300">
              Достоверность плана
            </span>
            <Award className="w-5 h-5 text-amber-400" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-white">
              {stats?.honestyRate ?? 0}%
            </div>
            <div className="text-xs text-slate-300 mt-1">
              {stats?.confirmedDoneCount ?? 0} из {stats?.totalPlanned ?? 0} плановых позиций честно подтверждены
            </div>
          </div>
          <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (stats?.honestyRate ?? 0) >= 80
                  ? 'bg-emerald-400'
                  : (stats?.honestyRate ?? 0) >= 50
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, stats?.honestyRate ?? 0))}%` }}
            />
          </div>
        </div>
      </div>

      {/* ═══ Панель фильтров, категорий и поиска ═══ */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Поиск */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск по наименованию рыбы или категории..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Фильтр по категории */}
          {categories.length > 0 && (
            <div className="w-full md:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
              >
                <option value="all">Все категории ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Быстрые фильтры-таблетки */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Все позиции ({data.items.length})
          </button>

          <button
            onClick={() => setStatusFilter('suspicious')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'suspicious'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Сомнительное «Сделано» ({stats?.suspiciousDoneCount ?? 0})</span>
          </button>

          <button
            onClick={() => setStatusFilter('unplanned')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'unplanned'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Вне плана ({stats?.unplannedCount ?? 0})</span>
          </button>

          <button
            onClick={() => setStatusFilter('confirmed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'confirmed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Подтверждено 1С ({stats?.confirmedDoneCount ?? 0})</span>
          </button>

          <button
            onClick={() => setStatusFilter('incomplete')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'incomplete'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>В плане, не завершено ({stats?.plannedNotDoneCount ?? 0})</span>
          </button>
        </div>
      </div>

      {/* ═══ Таблица позиций аудита плана ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-700">
              Результаты сверки
            </span>
            <span className="text-xs text-slate-500 font-medium">
              (Отображено: {filteredItems.length} из {data.items.length} позиций)
            </span>
          </div>

          <div className="text-xs text-slate-400 font-medium hidden sm:flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Кликните на «График остатков» для открытия наглядной кривой динамики</span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-600">Анализируем движение остатков по файлам 1С...</p>
            <p className="text-xs text-slate-400">Сопоставляем утвержденный план с хронологией загрузок</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Позиций по заданным критериям не найдено</p>
            <p className="text-xs text-slate-400">Попробуйте сбросить фильтры или изменить поисковый запрос</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-600 select-none">
                  <th className="py-3 px-4">Наименование продукции</th>
                  <th className="py-3 px-3 text-center">План</th>
                  <th className="py-3 px-3 text-center">Отметка цеха</th>
                  <th className="py-3 px-4">Движение 1С за неделю</th>
                  <th className="py-3 px-4">Вердикт контроля</th>
                  <th className="py-3 px-4 text-right">История остатка</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredItems.map((item) => {
                  const isSuspicious = item.controlStatus === 'SUSPICIOUS_DONE';
                  const isUnplanned = item.controlStatus === 'UNPLANNED';
                  const isConfirmed = item.controlStatus === 'CONFIRMED_DONE';

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-slate-50/80 ${
                        isSuspicious
                          ? 'bg-amber-50/40 hover:bg-amber-50/70'
                          : isUnplanned
                          ? 'bg-rose-50/40 hover:bg-rose-50/70'
                          : isConfirmed
                          ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                          : ''
                      }`}
                    >
                      {/* Наименование и категория */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {item.productName}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-500 font-medium">
                            {item.category}
                          </span>
                          {item.price !== null && item.price !== undefined && (
                            <span className="text-[10px] text-slate-400">
                              • {item.price.toLocaleString('ru-RU')} ₽
                            </span>
                          )}
                        </div>
                      </td>

                      {/* План (галочка) */}
                      <td className="py-3.5 px-3 text-center">
                        {item.isPlanned ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-black shadow-2xs">
                              ✓
                            </span>
                            <span className="text-[10px] text-teal-700 font-extrabold mt-0.5">
                              В плане
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center font-bold">
                              —
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                              Без плана
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Отметка цеха (resultStatus) */}
                      <td className="py-3.5 px-3 text-center">
                        {item.resultStatus === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Сделано</span>
                          </span>
                        ) : item.resultStatus === 'FORGOTTEN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Забыли</span>
                          </span>
                        ) : item.resultStatus === 'NO_RAW_MATERIAL' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-100 text-red-800 text-[11px] font-bold">
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            <span>Нет сырья</span>
                          </span>
                        ) : item.resultStatus === 'OTHER' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 text-[11px] font-bold">
                            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                            <span>Другое</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-medium">
                            В процессе
                          </span>
                        )}
                      </td>

                      {/* Движение остатков по 1С за неделю */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">
                              Было → Стало
                            </div>
                            <div className="font-bold text-slate-800">
                              {item.startStockKg.toFixed(1)} →{' '}
                              <span className="text-slate-900 font-black">
                                {item.currentStockKg.toFixed(1)} кг
                              </span>
                            </div>
                          </div>

                          <div className="border-l border-slate-200 pl-3">
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">
                              Приход / Расход
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-extrabold">
                              {item.totalInflowKg > 0 ? (
                                <span className="text-emerald-600">
                                  +{item.totalInflowKg.toFixed(1)} кг
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">0 кг</span>
                              )}
                              <span className="text-slate-300">/</span>
                              {item.totalOutflowKg > 0 ? (
                                <span className="text-rose-600">
                                  -{item.totalOutflowKg.toFixed(1)} кг
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">0 кг</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Вердикт контроля */}
                      <td className="py-3.5 px-4">
                        <div>
                          {isSuspicious ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black shadow-2xs">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{item.badgeText}</span>
                            </span>
                          ) : isUnplanned ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-100 text-rose-900 border border-rose-300 text-xs font-black shadow-2xs">
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>{item.badgeText}</span>
                            </span>
                          ) : isConfirmed ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{item.badgeText}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 font-medium">
                              {item.badgeText}
                            </span>
                          )}
                          <div className="text-[11px] text-slate-500 mt-1 max-w-sm leading-tight">
                            {item.explanation}
                          </div>
                        </div>
                      </td>

                      {/* Кнопка наглядного графика остатка */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedProductForHistory(item.productName)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs transition shadow-2xs cursor-pointer border border-slate-200/80 whitespace-nowrap"
                          title="Открыть график остатков и хронологию файлов 1С"
                        >
                          <BarChart3 className="w-3.5 h-3.5 text-cyan-600" />
                          <span>График остатков</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ Модальное окно «Наглядный график изменения остатков» (как на скриншоте) ═══ */}
      {selectedProductForHistory && (
        <PositionHistoryModal
          productName={selectedProductForHistory}
          onClose={() => setSelectedProductForHistory(null)}
        />
      )}
    </div>
  );
}
