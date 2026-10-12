'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Clock,
  RefreshCw,
  Copy,
  Edit3,
  Scale,
  Check,
  X,
  ShieldAlert,
  Info,
} from 'lucide-react';

interface PastMonthSales {
  year: number;
  month: number;
  soldKg: number;
}

interface MonthlyItem {
  id: string | null;
  productName: string;
  category: string;
  currentStockKg: number;
  latestPrice: number;
  plannedKg: number;
  autoProducedKg: number;
  manualProducedKg: number | null;
  producedKg: number;
  remainingKg: number;
  isOverproduced: boolean;
  overproducedKg: number;
  progressPercent: number;
  recommendedKg: number;
  pastSalesHistory: PastMonthSales[];
  soldThisMonthKg: number;
  isStagnant?: boolean;
  comment: string | null;
  status: 'OVERPRODUCED' | 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' | 'NO_PLAN';
  updatedAt: string | null;
}

interface SummaryData {
  totalPlannedKg: number;
  totalProducedKg: number;
  totalRemainingKg: number;
  totalOverproducedKg: number;
  overproducedItemsCount: number;
  completedItemsCount: number;
  inProgressItemsCount: number;
  stagnantItemsCount?: number;
  totalPositionsWithPlan: number;
  totalPositionsCount: number;
}

const MONTH_NAMES = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

export default function MonthlyPlanTab() {
  const { hasPermission } = useAuth();
  const canEditPlan = hasPermission('TOGGLE_PLAN') || hasPermission('FULL_ACCESS');

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<MonthlyItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalPlannedKg: 0,
    totalProducedKg: 0,
    totalRemainingKg: 0,
    totalOverproducedKg: 0,
    overproducedItemsCount: 0,
    completedItemsCount: 0,
    inProgressItemsCount: 0,
    stagnantItemsCount: 0,
    totalPositionsWithPlan: 0,
    totalPositionsCount: 0,
  });

  // Фильтры и поиск
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERPRODUCED' | 'STAGNANT' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_PLAN'>('ALL');

  // Редактирование лимита в таблице
  const [editingPlanMap, setEditingPlanMap] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Модальное окно ручной корректировки факта
  const [manualModalItem, setManualModalItem] = useState<MonthlyItem | null>(null);
  const [manualInputVal, setManualInputVal] = useState<string>('');
  const [manualCommentVal, setManualCommentVal] = useState<string>('');

  // Модальное окно копирования плана из предыдущего месяца
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyOverwrite, setCopyOverwrite] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Модальное окно детализации рекомендации (информационное)
  const [inspectRecommendationItem, setInspectRecommendationItem] = useState<MonthlyItem | null>(null);

  // Загрузка данных
  const fetchMonthlyPlan = useCallback(async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get('/api/monthly-plan', {
        params: {
          year: selectedYear,
          month: selectedMonth,
        },
      });

      setItems(res.data.items || []);
      setCategories(res.data.categories || []);
      setSummary(res.data.summary || {
        totalPlannedKg: 0,
        totalProducedKg: 0,
        totalRemainingKg: 0,
        totalOverproducedKg: 0,
        overproducedItemsCount: 0,
        completedItemsCount: 0,
        inProgressItemsCount: 0,
        stagnantItemsCount: 0,
        totalPositionsWithPlan: 0,
        totalPositionsCount: 0,
      });

      // Инициализируем локальные инпуты плана
      const initMap: Record<string, string> = {};
      for (const it of res.data.items || []) {
        initMap[it.productName] = it.plannedKg > 0 ? String(it.plannedKg) : '';
      }
      setEditingPlanMap(initMap);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка загрузки месячного плана');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchMonthlyPlan();
  }, [fetchMonthlyPlan]);

  // Навигация по месяцам
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Сохранение лимита по позиции
  const handleSavePlan = async (item: MonthlyItem, valueToSave?: number) => {
    if (!canEditPlan) return;

    const rawVal = valueToSave !== undefined
      ? valueToSave
      : parseFloat(editingPlanMap[item.productName] || '0');

    const cleanVal = isNaN(rawVal) ? 0 : Math.max(0, rawVal);

    setSavingKey(item.productName);
    try {
      await api.post('/api/monthly-plan/item', {
        year: selectedYear,
        month: selectedMonth,
        productName: item.productName,
        category: item.category,
        plannedKg: cleanVal,
        manualProducedKg: item.manualProducedKg,
      });

      setItems((prev) =>
        prev.map((it) => {
          if (it.productName !== item.productName) return it;
          const plannedKg = cleanVal;
          const producedKg = it.producedKg;
          const remainingKg = plannedKg > 0 ? Math.max(0, Math.round((plannedKg - producedKg) * 10) / 10) : 0;
          const isOverproduced = plannedKg > 0 && producedKg > plannedKg;
          const overproducedKg = isOverproduced ? Math.round((producedKg - plannedKg) * 10) / 10 : 0;
          const progressPercent = plannedKg > 0
            ? Math.round((producedKg / plannedKg) * 100)
            : (producedKg > 0 ? 100 : 0);

          let status: MonthlyItem['status'] = 'NO_PLAN';
          if (plannedKg > 0) {
            if (isOverproduced) status = 'OVERPRODUCED';
            else if (producedKg >= plannedKg) status = 'COMPLETED';
            else if (producedKg > 0) status = 'IN_PROGRESS';
            else status = 'NOT_STARTED';
          }

          return {
            ...it,
            plannedKg,
            remainingKg,
            isOverproduced,
            overproducedKg,
            progressPercent,
            status,
          };
        })
      );

      setEditingPlanMap((prev) => ({
        ...prev,
        [item.productName]: cleanVal > 0 ? String(cleanVal) : '',
      }));

      toast.success(`Лимит для "${item.productName}" сохранен: ${cleanVal} кг`, {
        duration: 2000,
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка сохранения лимита');
    } finally {
      setSavingKey(null);
    }
  };

  // Копирование из предыдущего месяца
  const handleCopyPreviousMonth = async () => {
    setIsCopying(true);
    try {
      let fromYear = selectedYear;
      let fromMonth = selectedMonth - 1;
      if (fromMonth <= 0) {
        fromMonth = 12;
        fromYear -= 1;
      }

      const res = await api.post('/api/monthly-plan/copy-from-month', {
        fromYear,
        fromMonth,
        toYear: selectedYear,
        toMonth: selectedMonth,
        overwrite: copyOverwrite,
      });

      toast.success(`Скопировано ${res.data.copiedCount} позиций из ${MONTH_NAMES[fromMonth - 1]} ${fromYear}`);
      setIsCopyModalOpen(false);
      fetchMonthlyPlan(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка копирования плана');
    } finally {
      setIsCopying(false);
    }
  };

  // Ручная корректировка факта выпуска
  const handleSaveManualFact = async () => {
    if (!manualModalItem) return;

    const cleanFact = manualInputVal.trim() === ''
      ? null
      : Math.max(0, parseFloat(manualInputVal) || 0);

    try {
      await api.post('/api/monthly-plan/item', {
        year: selectedYear,
        month: selectedMonth,
        productName: manualModalItem.productName,
        category: manualModalItem.category,
        plannedKg: manualModalItem.plannedKg,
        manualProducedKg: cleanFact,
        comment: manualCommentVal || null,
      });

      toast.success('Фактический вес обновлен');
      setManualModalItem(null);
      fetchMonthlyPlan(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка сохранения фактического веса');
    }
  };

  // Сброс ручного факта к авто-расчету 1С
  const handleResetManualFact = async (item: MonthlyItem) => {
    try {
      await api.post('/api/monthly-plan/item', {
        year: selectedYear,
        month: selectedMonth,
        productName: item.productName,
        category: item.category,
        plannedKg: item.plannedKg,
        manualProducedKg: null,
      });

      toast.success('Возвращен автоматический расчет факта из прайсов 1С');
      fetchMonthlyPlan(true);
    } catch (err: any) {
      toast.error('Ошибка сброса');
    }
  };

  // Фильтрованные позиции
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Поиск
      if (search) {
        const query = search.toLowerCase();
        const matchesName = item.productName.toLowerCase().includes(query);
        const matchesCat = item.category.toLowerCase().includes(query);
        if (!matchesName && !matchesCat) return false;
      }

      // Категория
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }

      // Статус
      if (statusFilter === 'OVERPRODUCED' && !item.isOverproduced) return false;
      if (statusFilter === 'STAGNANT' && !item.isStagnant) return false;
      if (statusFilter === 'IN_PROGRESS' && item.status !== 'IN_PROGRESS' && item.status !== 'NOT_STARTED') return false;
      if (statusFilter === 'COMPLETED' && item.status !== 'COMPLETED') return false;
      if (statusFilter === 'NO_PLAN' && item.plannedKg > 0) return false;

      return true;
    });
  }, [items, search, selectedCategory, statusFilter]);

  // Общий процент выполнения по цеху
  const overallPercent = summary.totalPlannedKg > 0
    ? Math.round((summary.totalProducedKg / summary.totalPlannedKg) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ─── ВЕРХНЯЯ ПАНЕЛЬ: ВЫБОР МЕСЯЦА И БЫСТРЫЕ ДЕЙСТВИЯ ─── */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Селектор месяца */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-white rounded-lg text-slate-700 transition cursor-pointer shadow-2xs"
              title="Предыдущий месяц"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 px-4 py-1 text-slate-900 font-black text-base sm:text-lg select-none min-w-[170px] justify-center">
              <Calendar className="w-5 h-5 text-teal-600" />
              <span>
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </span>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-white rounded-lg text-slate-700 transition cursor-pointer shadow-2xs"
              title="Следующий месяц"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Быстрый переход в текущий месяц */}
          {(selectedMonth !== currentDate.getMonth() + 1 || selectedYear !== currentDate.getFullYear()) && (
            <button
              onClick={() => {
                setSelectedMonth(currentDate.getMonth() + 1);
                setSelectedYear(currentDate.getFullYear());
              }}
              className="px-3 py-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl border border-teal-200 transition cursor-pointer"
            >
              Вернуться в текущий месяц
            </button>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="flex flex-wrap items-center gap-2.5">
          {canEditPlan && (
            <button
              onClick={() => setIsCopyModalOpen(true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
              title="Скопировать лимиты из прошлого месяца"
            >
              <Copy className="w-4 h-4 text-slate-600" />
              <span>Копировать из пред. месяца</span>
            </button>
          )}

          {/* Обновить */}
          <button
            onClick={() => fetchMonthlyPlan(true)}
            disabled={refreshing}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer border border-slate-200"
            title="Обновить данные"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── СВОДНЫЕ KPI-КАРТОЧКИ (4 КЛЮЧЕВЫХ ВИДЖЕТА) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Карточка 1: Общий лимит месяца */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Лимит на месяц
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {summary.totalPlannedKg.toLocaleString('ru-RU')}
            </span>
            <span className="text-sm font-bold text-slate-600">кг</span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Задано для {summary.totalPositionsWithPlan} из {summary.totalPositionsCount} позиций
          </p>
        </div>

        {/* Карточка 2: Сделано (факт 1С) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Сделано (факт 1С)
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {summary.totalProducedKg.toLocaleString('ru-RU')}
            </span>
            <span className="text-sm font-bold text-slate-600">кг</span>
            <span className={`ml-auto text-xs font-extrabold px-2 py-0.5 rounded-full ${
              overallPercent >= 100
                ? 'bg-emerald-100 text-emerald-800'
                : overallPercent >= 80
                ? 'bg-blue-100 text-blue-800'
                : 'bg-slate-100 text-slate-700'
            }`}>
              {overallPercent}%
            </span>
          </div>
          <div className="mt-2.5 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                overallPercent > 100
                  ? 'bg-gradient-to-r from-emerald-500 to-rose-500'
                  : overallPercent >= 80
                  ? 'bg-emerald-500'
                  : 'bg-teal-500'
              }`}
              style={{ width: `${Math.min(100, overallPercent)}%` }}
            />
          </div>
        </div>

        {/* Карточка 3: Осталось сделать */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Осталось до лимита
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {summary.totalRemainingKg.toLocaleString('ru-RU')}
            </span>
            <span className="text-sm font-bold text-slate-600">кг</span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {summary.completedItemsCount} позиций закрыто полностью
          </p>
        </div>

        {/* Карточка 4: ПЕРЕБОР ВЫПУСКА */}
        <div className={`rounded-2xl p-5 border shadow-xs relative overflow-hidden transition-all ${
          summary.overproducedItemsCount > 0
            ? 'bg-gradient-to-br from-rose-50 via-red-50/70 to-rose-100/50 border-rose-300 ring-2 ring-rose-500/20'
            : 'bg-white border-slate-200/80'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${
              summary.overproducedItemsCount > 0 ? 'text-rose-900' : 'text-slate-600'
            }`}>
              ПЕРЕБОР ВЫПУСКА
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              summary.overproducedItemsCount > 0
                ? 'bg-rose-500 text-white shadow-xs shadow-rose-500/30 animate-pulse'
                : 'bg-slate-100 text-slate-600'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-black tracking-tight ${
              summary.overproducedItemsCount > 0 ? 'text-rose-600' : 'text-slate-400'
            }`}>
              {summary.overproducedItemsCount > 0
                ? `+${summary.totalOverproducedKg.toLocaleString('ru-RU')}`
                : '0'}
            </span>
            <span className="text-sm font-bold text-slate-600">кг</span>
            {summary.overproducedItemsCount > 0 && (
              <span className="ml-auto text-xs font-black px-2 py-0.5 rounded-full bg-rose-600 text-white animate-bounce">
                {summary.overproducedItemsCount} поз.
              </span>
            )}
          </div>
          <p className={`mt-1 text-xs font-medium ${
            summary.overproducedItemsCount > 0 ? 'text-rose-700 font-semibold' : 'text-slate-600'
          }`}>
            {summary.overproducedItemsCount > 0
              ? '⚠️ Внимание: объем превысил месячный лимит цеха!'
              : 'Вся продукция в пределах установленного лимита'}
          </p>
        </div>
      </div>

      {/* ─── ПАНЕЛЬ ФИЛЬТРОВ И ПОИСКА ─── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Быстрые фильтры по статусу */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Все позиции ({items.length})
          </button>

          <button
            onClick={() => setStatusFilter('OVERPRODUCED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'OVERPRODUCED'
                ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/30'
                : summary.overproducedItemsCount > 0
                ? 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>ПЕРЕБОР ({summary.overproducedItemsCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('STAGNANT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'STAGNANT'
                ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/30'
                : (summary.stagnantItemsCount || 0) > 0
                ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>⏳ Долго лежит ({summary.stagnantItemsCount || 0})</span>
          </button>

          <button
            onClick={() => setStatusFilter('IN_PROGRESS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            В работе ({summary.inProgressItemsCount})
          </button>

          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Выполнено ({summary.completedItemsCount})
          </button>

          <button
            onClick={() => setStatusFilter('NO_PLAN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'NO_PLAN'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Без лимита ({items.filter((i) => i.plannedKg === 0).length})
          </button>
        </div>

        {/* Категории и Поиск */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Селектор категории */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            <option value="ALL">Все категории ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Строка поиска */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по рыбе..."
              className="w-full pl-9 pr-8 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500 placeholder-slate-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── ТАБЛИЦА МЕСЯЧНОГО ПЛАНА ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
            <span className="text-sm font-semibold">Загрузка данных месячного плана...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <Scale className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-bold text-slate-800">Позиции не найдены</p>
            <p className="text-xs text-slate-400 mt-1">
              Попробуйте изменить параметры поиска или сбросить фильтры
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500 select-none">
                  <th className="py-3.5 px-4">Наименование продукции</th>
                  <th className="py-3.5 px-3 text-center min-w-[150px]">
                    <span className="inline-flex items-center gap-1 text-amber-800">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      💡 Спрос (3 мес)
                    </span>
                  </th>
                  <th className="py-3.5 px-3 text-center min-w-[135px]">
                    🎯 Месячный лимит (кг)
                  </th>
                  <th className="py-3.5 px-3 text-center min-w-[120px]">
                    ⚖️ Сделано (кг)
                  </th>
                  <th className="py-3.5 px-3 text-center min-w-[110px]">
                    Осталось
                  </th>
                  <th className="py-3.5 px-4 min-w-[200px]">
                    Прогресс выполнения
                  </th>
                  <th className="py-3.5 px-4 text-center min-w-[140px]">
                    Статус
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredItems.map((item) => {
                  const isOver = item.isOverproduced;
                  const isEditing = savingKey === item.productName;

                  return (
                    <tr
                      key={item.productName}
                      className={`transition-colors ${
                        isOver
                          ? 'bg-rose-50/40 hover:bg-rose-50/70 border-l-4 border-l-rose-500'
                          : item.status === 'COMPLETED'
                          ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* 1. Название и категория */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 leading-snug">
                          {item.productName}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-600">
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700">
                            {item.category}
                          </span>
                          {item.isStagnant && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold border border-amber-300 text-[10px] inline-flex items-center gap-0.5">
                              ⏳ Долго лежит без движения
                            </span>
                          )}
                          <span>•</span>
                          <span>
                            Склад 1С: <b className="text-slate-800">{item.currentStockKg} кг</b>
                          </span>
                          {item.soldThisMonthKg > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-medium">
                                Продано в тек. месяце: {item.soldThisMonthKg} кг
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* 2. Информационная рекомендация по среднему расходу за 3 месяца */}
                      <td className="py-3.5 px-3 text-center">
                        {item.recommendedKg > 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <button
                              onClick={() => setInspectRecommendationItem(item)}
                              className="font-black text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1 rounded-lg transition cursor-pointer text-xs flex items-center gap-1 shadow-2xs"
                              title="Нажмите для просмотра продаж за каждый из 3 месяцев"
                            >
                              <span>~{item.recommendedKg} кг</span>
                              <Info className="w-3.5 h-3.5 text-amber-600" />
                            </button>
                            <span className="text-[10px] text-slate-600 mt-0.5">
                              спрос за 3 мес.
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-semibold">—</span>
                        )}
                      </td>

                      {/* 3. Месячный лимит (кг) (инлайн-ввод) */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1 justify-center">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            disabled={!canEditPlan || isEditing}
                            value={editingPlanMap[item.productName] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingPlanMap((prev) => ({
                                ...prev,
                                [item.productName]: val,
                              }));
                            }}
                            onBlur={() => handleSavePlan(item)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            placeholder="0"
                            className={`w-20 px-2 py-1.5 text-center font-black text-xs rounded-xl border transition-all focus:outline-hidden focus:ring-2 ${
                              isOver
                                ? 'border-rose-300 bg-rose-50/50 text-rose-950 focus:ring-rose-500'
                                : item.plannedKg > 0
                                ? 'border-slate-300 bg-white text-slate-900 focus:ring-teal-500 font-black'
                                : 'border-dashed border-slate-300 bg-slate-50 text-slate-400 focus:ring-teal-500'
                            }`}
                          />
                          <span className="text-[11px] font-bold text-slate-600">кг</span>
                        </div>
                      </td>

                      {/* 4. Сделано (факт по 1С или ручная правка) */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          <div className="flex flex-col items-center">
                            <span className={`font-black text-xs ${
                              isOver ? 'text-rose-700' : 'text-slate-900'
                            }`}>
                              {item.producedKg} кг
                            </span>
                            {item.manualProducedKg !== null ? (
                              <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1 rounded-sm">
                                Ручной ввод
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-600">
                                по прайсам 1С
                              </span>
                            )}
                          </div>

                          {/* Кнопка правки факта мастером */}
                          {canEditPlan && (
                            <button
                              onClick={() => {
                                setManualModalItem(item);
                                setManualInputVal(
                                  item.manualProducedKg !== null ? String(item.manualProducedKg) : String(item.producedKg)
                                );
                                setManualCommentVal(item.comment || '');
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
                              title="Скорректировать сделанный вес вручную"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* 5. Осталось сделать */}
                      <td className="py-3.5 px-3 text-center">
                        {item.plannedKg > 0 ? (
                          item.remainingKg === 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> 0 кг
                            </span>
                          ) : (
                            <span className="font-extrabold text-slate-700">
                              {item.remainingKg} кг
                            </span>
                          )
                        ) : (
                          <span className="text-slate-300 font-semibold">—</span>
                        )}
                      </td>

                      {/* 6. Прогресс-бар */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className={isOver ? 'text-rose-700 font-black' : 'text-slate-600'}>
                              {item.progressPercent}%
                            </span>
                            <span className="text-[10px] text-slate-600">
                              {item.producedKg} / {item.plannedKg > 0 ? item.plannedKg : '—'} кг
                            </span>
                          </div>

                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isOver
                                  ? 'bg-gradient-to-r from-red-500 via-rose-600 to-red-600 animate-pulse'
                                  : item.progressPercent >= 100
                                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500'
                                  : item.progressPercent >= 80
                                  ? 'bg-gradient-to-r from-teal-500 to-emerald-400'
                                  : 'bg-gradient-to-r from-sky-500 to-teal-500'
                              }`}
                              style={{
                                width: `${item.plannedKg > 0 ? Math.min(100, item.progressPercent) : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 7. Статус и Детектор ПЕРЕБОРА */}
                      <td className="py-3.5 px-4 text-center">
                        {isOver ? (
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-xs shadow-rose-600/30 animate-pulse">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              ПЕРЕБОР: +{item.overproducedKg} кг
                            </span>
                            <span className="text-[10px] text-rose-800 font-bold">
                              Превышен лимит!
                            </span>
                          </div>
                        ) : item.status === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Лимит закрыт
                          </span>
                        ) : item.status === 'IN_PROGRESS' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            В работе
                          </span>
                        ) : item.status === 'NOT_STARTED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                            Не начато
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Лимит не задан
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── МОДАЛКА: ИНФОРМАЦИЯ О ПРОДАЖАХ ЗА 3 МЕСЯЦА (ТОЛЬКО СПРАВКА) ─── */}
      {inspectRecommendationItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-black text-slate-900 text-sm">
                  Анализ продаж за 3 месяца
                </h3>
              </div>
              <button
                onClick={() => setInspectRecommendationItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4">
              <p className="font-bold text-slate-900 text-sm">
                {inspectRecommendationItem.productName}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Категория: {inspectRecommendationItem.category}
              </p>

              <div className="mt-4 bg-amber-50/60 rounded-xl p-3 border border-amber-200/80">
                <span className="text-xs font-bold text-amber-900 block">
                  💡 Среднемесячный объем продаж:
                </span>
                <span className="text-2xl font-black text-amber-900 mt-1 block">
                  ~{inspectRecommendationItem.recommendedKg} кг / месяц
                </span>
                <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                  Рассчитано автоматически на основе фактического расхода (отгрузок клиентам) по еженедельным прайсам 1С за последние 3 месяца.
                </p>
              </div>

              {/* Разбивка по месяцам */}
              <div className="mt-4 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Фактические продажи по месяцам:
                </span>
                {inspectRecommendationItem.pastSalesHistory.map((h) => (
                  <div
                    key={`${h.year}_${h.month}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold"
                  >
                    <span className="text-slate-700">
                      {MONTH_NAMES[h.month - 1]} {h.year}
                    </span>
                    <span className="font-black text-slate-900">
                      {h.soldKg} кг
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setInspectRecommendationItem(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── МОДАЛКА: РУЧНАЯ КОРРЕКТИРОВКА ФАКТА ВЫПУСКА ─── */}
      {manualModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="font-black text-slate-900 text-sm">
                  Корректировка факта выпуска
                </h3>
              </div>
              <button
                onClick={() => setManualModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <span className="font-bold text-slate-900 text-sm block">
                  {manualModalItem.productName}
                </span>
                <span className="text-xs text-slate-500">
                  Автоматический расчет по прайсам 1С: <b>{manualModalItem.autoProducedKg} кг</b>
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Фактический сделанный вес (кг):
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={manualInputVal}
                  onChange={(e) => setManualInputVal(e.target.value)}
                  placeholder={`Авто: ${manualModalItem.autoProducedKg}`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Оставьте пустым, чтобы вернуть авто-подсчет из прироста прайсов 1С.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Примечание / комментарий мастера:
                </label>
                <textarea
                  rows={2}
                  value={manualCommentVal}
                  onChange={(e) => setManualCommentVal(e.target.value)}
                  placeholder="Например: дофасовка вне партии или списание брака..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              {manualModalItem.manualProducedKg !== null ? (
                <button
                  onClick={() => {
                    handleResetManualFact(manualModalItem);
                    setManualModalItem(null);
                  }}
                  className="text-xs font-bold text-rose-600 hover:underline"
                >
                  Сбросить к авто 1С
                </button>
              ) : <div />}

              <div className="flex gap-2">
                <button
                  onClick={() => setManualModalItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveManualFact}
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition cursor-pointer"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── МОДАЛКА: КОПИРОВАНИЕ ПЛАНА ИЗ ПРОШЛОГО МЕСЯЦА ─── */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Copy className="w-4 h-4" />
                </div>
                <h3 className="font-black text-slate-900 text-sm">
                  Копирование лимитов
                </h3>
              </div>
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Скопировать запланированные лимиты (кг) из предыдущего месяца в{' '}
                <b>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</b>?
              </p>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyOverwrite}
                  onChange={(e) => setCopyOverwrite(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Перезаписать уже заданные значения текущего месяца
                </span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Отмена
              </button>
              <button
                onClick={handleCopyPreviousMonth}
                disabled={isCopying}
                className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {isCopying ? 'Копирование...' : 'Скопировать лимиты'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
