'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import {
  Wallet,
  TrendingUp,
  Scale,
  Package,
  Layers,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ShieldAlert,
  Printer,
  ChevronDown,
  Sparkles,
  DollarSign,
  PieChart,
  BarChart3,
  Flame,
  Star,
  ClipboardCheck,
} from 'lucide-react';

interface FinanceSummary {
  totalWarehouseValue: number;
  totalStockKg: number;
  averagePricePerKg: number;
  totalPositions: number;
  inStockPositions: number;
  outOfStockPositions: number;
  zeroPriceWithStockPositions: number;
  plannedStockValue: number;
  plannedStockKg: number;
}

interface CategoryStat {
  categoryName: string;
  totalValue: number;
  totalStockKg: number;
  averagePricePerKg: number;
  totalItems: number;
  inStockItems: number;
  sharePercent: number;
}

interface FinanceItem {
  id: string;
  productName: string;
  category: string;
  price: number;
  stockKg: number;
  totalValue: number;
  isPlanned: boolean;
  isNew: boolean;
  isHit: boolean;
  abcCategory: string | null;
  resultStatus: string | null;
  updatedAt: string;
  sharePercent?: number;
}

interface WeekOption {
  id: string;
  year: number;
  weekNumber: number;
  status: string;
  startDate: string;
  endDate: string;
  excelFileName?: string;
  excelFileUploadedAt?: string;
}

interface WeekDynamics {
  weekId: string;
  weekLabel: string;
  weekNumber: number;
  year: number;
  totalValue: number;
  totalStockKg: number;
}

interface FinancialAnalysisTabProps {
  currentWeek?: any;
}

export default function FinancialAnalysisTab({ currentWeek }: FinancialAnalysisTabProps) {
  const { user, hasPermission } = useAuth();
  const isAdmin = hasPermission('FULL_ACCESS');

  const [loading, setLoading] = useState<boolean>(true);
  const [selectedWeekId, setSelectedWeekId] = useState<string>('current');
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [topValueItems, setTopValueItems] = useState<FinanceItem[]>([]);
  const [items, setItems] = useState<FinanceItem[]>([]);
  const [allWeeks, setAllWeeks] = useState<WeekOption[]>([]);
  const [dynamics, setDynamics] = useState<WeekDynamics[]>([]);
  const [weekInfo, setWeekInfo] = useState<any>(null);

  // Фильтры и поиск таблицы
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK' | 'PLANNED' | 'NO_PRICE'>('IN_STOCK');
  const [sortBy, setSortBy] = useState<'value_desc' | 'value_asc' | 'stock_desc' | 'stock_asc' | 'price_desc' | 'name_asc'>('value_desc');
  const [page, setPage] = useState<number>(1);
  const pageSize = 50;

  // Форматирование денег
  const formatMoney = (val?: number) => {
    if (val === undefined || val === null) return '0 ₽';
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Форматирование веса
  const formatKg = (val?: number) => {
    if (val === undefined || val === null) return '0 кг';
    return new Intl.NumberFormat('ru-RU', {
      maximumFractionDigits: 1,
    }).format(val) + ' кг';
  };

  const loadFinancialData = async (weekId = selectedWeekId) => {
    try {
      setLoading(true);
      const url = weekId && weekId !== 'current'
        ? `/api/finance/stock-summary?weekId=${encodeURIComponent(weekId)}`
        : `/api/finance/stock-summary`;

      const res = await api.get(url);
      if (res.data.hasData) {
        setSummary(res.data.summary);
        setCategoryStats(res.data.categoryStats || []);
        setTopValueItems(res.data.topValueItems || []);
        setItems(res.data.items || []);
        setAllWeeks(res.data.allWeeks || []);
        setDynamics(res.data.dynamics || []);
        setWeekInfo(res.data.week);
      } else {
        setSummary(null);
        setCategoryStats([]);
        setItems([]);
      }
    } catch (err: any) {
      console.error('Failed to load finance data:', err);
      const msg = err.response?.data?.error || 'Не удалось загрузить финансовый анализ склада';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadFinancialData();
    }
  }, [isAdmin]);

  // Обработка смены недели
  const handleWeekChange = (newWeekId: string) => {
    setSelectedWeekId(newWeekId);
    setPage(1);
    loadFinancialData(newWeekId);
  };

  // Фильтрация и сортировка товаров
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Поиск
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.productName.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      );
    }

    // Категория
    if (selectedCategory !== 'ALL') {
      result = result.filter((i) => i.category === selectedCategory);
    }

    // Статус наличия
    if (stockFilter === 'IN_STOCK') {
      result = result.filter((i) => i.stockKg > 0);
    } else if (stockFilter === 'OUT_OF_STOCK') {
      result = result.filter((i) => i.stockKg <= 0);
    } else if (stockFilter === 'PLANNED') {
      result = result.filter((i) => i.isPlanned);
    } else if (stockFilter === 'NO_PRICE') {
      result = result.filter((i) => i.stockKg > 0 && i.price <= 0);
    }

    // Сортировка
    result.sort((a, b) => {
      switch (sortBy) {
        case 'value_desc':
          return b.totalValue - a.totalValue;
        case 'value_asc':
          return a.totalValue - b.totalValue;
        case 'stock_desc':
          return b.stockKg - a.stockKg;
        case 'stock_asc':
          return a.stockKg - b.stockKg;
        case 'price_desc':
          return b.price - a.price;
        case 'name_asc':
          return a.productName.localeCompare(b.productName, 'ru');
        default:
          return b.totalValue - a.totalValue;
      }
    });

    return result;
  }, [items, searchQuery, selectedCategory, stockFilter, sortBy]);

  // Суммы для отфильтрованного списка
  const filteredTotals = useMemo(() => {
    let sumValue = 0;
    let sumKg = 0;
    filteredItems.forEach((i) => {
      sumValue += i.totalValue;
      sumKg += i.stockKg;
    });
    return {
      count: filteredItems.length,
      sumValue,
      sumKg,
    };
  }, [filteredItems]);

  // Пагинация
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;

  // Экспорт в CSV (с UTF-8 BOM для безупречного открытия в Excel на русском)
  const handleExportCSV = () => {
    if (!filteredItems.length) {
      toast.error('Нет данных для выгрузки');
      return;
    }

    const headers = [
      '№',
      'Наименование товара',
      'Категория',
      'Оптовая цена (руб/кг)',
      'Остаток на складе (кг)',
      'Сумма остатка (руб)',
      'Доля от склада (%)',
      'В плане на неделю',
    ];

    const totalVal = summary?.totalWarehouseValue || 1;

    const rows = filteredItems.map((item, idx) => {
      const share = totalVal > 0 ? ((item.totalValue / totalVal) * 100).toFixed(2) + '%' : '0%';
      return [
        idx + 1,
        `"${item.productName.replace(/"/g, '""')}"`,
        `"${item.category.replace(/"/g, '""')}"`,
        item.price.toFixed(2),
        item.stockKg.toFixed(2),
        item.totalValue.toFixed(2),
        share,
        item.isPlanned ? 'Да' : 'Нет',
      ].join(';');
    });

    // Итоговая строка
    rows.push([
      '',
      '"ИТОГО ПО ФИЛЬТРУ"',
      '',
      '',
      filteredTotals.sumKg.toFixed(2),
      filteredTotals.sumValue.toFixed(2),
      '',
      '',
    ].join(';'));

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const weekLabel = weekInfo ? `nedelya_${weekInfo.weekNumber}_${weekInfo.year}` : 'tekushchaya';
    link.setAttribute('href', url);
    link.setAttribute('download', `topfish_sklad_finansy_${weekLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Отчет успешно выгружен в CSV!');
  };

  // Если пользователь не администратор
  if (!isAdmin) {
    return (
      <div className="bg-white rounded-3xl border border-rose-200 p-8 text-center max-w-xl mx-auto shadow-sm my-8">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          Доступ ограничен
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Вкладка «Анализ финансов» и расчет складской стоимости по оптовым ценам доступны только Администратору (Руководителю).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Верхняя шапка: Заголовок, выбор недели, экспорт и печать */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-indigo-900/40 relative overflow-hidden">
        {/* Фоновые декоративные круги */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold tracking-wide uppercase flex items-center gap-1.5 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
                Только для Администратора
              </span>
              {weekInfo?.status === 'IN_PROGRESS' && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold">
                  В работе
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Wallet className="w-8 h-8 text-emerald-400" />
              <span>Анализ финансов склада</span>
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Оценка складских остатков по актуальным оптовым ценам прайса: количество денежных средств, замороженных в товаре, и детальная структура по категориям.
            </p>
          </div>

          {/* Панель управления неделей и кнопки */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Выпадающий список недель */}
            <div className="relative">
              <select
                value={selectedWeekId}
                onChange={(e) => handleWeekChange(e.target.value)}
                className="appearance-none bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl px-4 py-2.5 pr-10 text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-400 transition cursor-pointer"
                title="Выберите производственную неделю для анализа"
              >
                <option value="current" className="bg-slate-900 text-white">
                  Текущая неделя {weekInfo?.weekNumber ? `(№${weekInfo.weekNumber})` : ''}
                </option>
                {allWeeks.map((w) => (
                  <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                    Неделя №{w.weekNumber} ({w.year}) — {w.status === 'CLOSED' ? 'Закрыта' : 'Активна'}
                  </option>
                ))}
              </select>
              <Calendar className="w-4 h-4 text-emerald-300 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Обновить */}
            <button
              onClick={() => loadFinancialData()}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition cursor-pointer disabled:opacity-50"
              title="Обновить расчеты"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {/* Выгрузка CSV */}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer"
              title="Скачать финансовую таблицу в Excel / CSV"
            >
              <Download className="w-4 h-4" />
              <span>Экспорт в Excel</span>
            </button>

            {/* Печать */}
            <button
              onClick={() => window.print()}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition cursor-pointer hidden sm:flex"
              title="Распечатать финансовую сводку"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loading && !summary ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 text-sm font-medium">
            Считаем общую сумму остатков по оптовым ценам...
          </p>
        </div>
      ) : summary ? (
        <>
          {/* ГЛАВНЫЕ KPI КАРТОЧКИ ФИНАНСОВ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Карточка 1: ОБЩАЯ СУММА ДЕНЕГ НА СКЛАДЕ (Главный фокус!) */}
            <div className="sm:col-span-2 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 sm:p-7 rounded-3xl shadow-lg shadow-emerald-600/20 relative overflow-hidden border border-emerald-500/40">
              <div className="absolute top-0 right-0 p-6 opacity-15 pointer-events-none">
                <Wallet className="w-32 h-32" />
              </div>

              <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold uppercase tracking-wider mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse" />
                    Общая стоимость остатков на складе
                  </div>
                  <div className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-1">
                    {formatMoney(summary.totalWarehouseValue)}
                  </div>
                  <p className="text-emerald-100/90 text-xs sm:text-sm font-medium">
                    Сумма всех физических остатков продукции умноженная на оптовую цену
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-emerald-400/30 flex items-center justify-between text-xs text-emerald-50">
                  <span>
                    Всего на складе: <strong className="text-white text-sm">{formatKg(summary.totalStockKg)}</strong>
                  </span>
                  <span>
                    Средняя цена: <strong className="text-white text-sm">{formatMoney(summary.averagePricePerKg)} / кг</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Карточка 2: Запланировано в производство */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-3">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  В плане производства
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {formatMoney(summary.plannedStockValue)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Объем: <strong>{formatKg(summary.plannedStockKg)}</strong> на этой неделе
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Доля от склада:</span>
                <span className="font-bold text-indigo-600">
                  {summary.totalWarehouseValue > 0
                    ? ((summary.plannedStockValue / summary.totalWarehouseValue) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>

            {/* Карточка 3: Позиции на складе */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold mb-3">
                  <Package className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Ассортимент в наличии
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {summary.inStockPositions}{' '}
                  <span className="text-sm font-semibold text-slate-400">
                    из {summary.totalPositions} поз.
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {summary.outOfStockPositions} позиций с нулевым остатком
                </p>
              </div>

              {/* Предупреждение если есть товары без цены */}
              {summary.zeroPriceWithStockPositions > 0 ? (
                <div
                  onClick={() => setStockFilter('NO_PRICE')}
                  className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-between text-xs text-amber-700 font-bold cursor-pointer hover:text-amber-800"
                >
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Без оптовой цены:
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px]">
                    {summary.zeroPriceWithStockPositions} поз.
                  </span>
                </div>
              ) : (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>У всех остатков указана цена</span>
                </div>
              )}
            </div>
          </div>

          {/* РАЗБИВКА ПО КАТЕГОРИЯМ: Где больше всего денег? */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-indigo-600" />
                  <span>Распределение финансов по категориям продукции</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Какая группа товаров аккумулирует основной капитал на складе
                </p>
              </div>
              {selectedCategory !== 'ALL' && (
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition cursor-pointer self-start sm:self-auto"
                >
                  Сбросить фильтр категории &times;
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryStats.map((cat) => {
                const isSelected = selectedCategory === cat.categoryName;
                return (
                  <div
                    key={cat.categoryName}
                    onClick={() =>
                      setSelectedCategory(isSelected ? 'ALL' : cat.categoryName)
                    }
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition leading-snug">
                        {cat.categoryName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-black shrink-0">
                        {cat.sharePercent}%
                      </span>
                    </div>

                    <div className="text-xl font-extrabold text-slate-900 mb-2">
                      {formatMoney(cat.totalValue)}
                    </div>

                    {/* Прогресс-бар доли от общей суммы */}
                    <div className="w-full bg-slate-200 rounded-full h-2 mb-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(cat.sharePercent, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Вес: <strong className="text-slate-700">{formatKg(cat.totalStockKg)}</strong></span>
                      <span>Средняя: <strong className="text-slate-700">{formatMoney(cat.averagePricePerKg)}/кг</strong></span>
                      <span>{cat.inStockItems} поз.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ТОП-10 САМЫХ ДОРОГОСТОЯЩИХ ПОЗИЦИЙ НА СКЛАДЕ */}
          {topValueItems.length > 0 && (
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                  <span>Топ самых ценных позиций на складе (по общей сумме денег)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Товары с наибольшей суммарной стоимостью остатков
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {topValueItems.slice(0, 6).map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3 hover:border-emerald-300 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                          idx === 0
                            ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-800'
                            : idx === 2
                            ? 'bg-amber-700 text-amber-100'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate" title={item.productName}>
                          {item.productName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {item.stockKg} кг × {item.price} ₽
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-black text-emerald-700">
                        {formatMoney(item.totalValue)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        {item.sharePercent}% склада
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ПОЛНАЯ ТАБЛИЦА ТОВАРОВ И ФИНАНСОВ */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Панель фильтров таблицы */}
            <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Реестр остатков и цен продукции
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
                    {filteredTotals.count} поз.
                  </span>
                </div>

                {/* Итого по фильтру */}
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs">
                  <span>
                    Итого в выборке:{' '}
                    <strong className="text-emerald-700 text-sm font-black">
                      {formatMoney(filteredTotals.sumValue)}
                    </strong>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span>
                    Вес: <strong className="text-slate-900">{formatKg(filteredTotals.sumKg)}</strong>
                  </span>
                </div>
              </div>

              {/* Поле поиска и быстрые фильтры */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                {/* Поиск */}
                <div className="lg:col-span-4 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Поиск по названию или категории..."
                    className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      &times;
                    </button>
                  )}
                </div>

                {/* Выбор категории */}
                <div className="lg:col-span-3">
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="ALL">Все категории ({categoryStats.length})</option>
                    {categoryStats.map((c) => (
                      <option key={c.categoryName} value={c.categoryName}>
                        {c.categoryName} ({c.inStockItems} в наличии)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Фильтр наличия */}
                <div className="lg:col-span-3">
                  <select
                    value={stockFilter}
                    onChange={(e) => {
                      setStockFilter(e.target.value as any);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium"
                  >
                    <option value="IN_STOCK">Только в наличии (остаток &gt; 0)</option>
                    <option value="ALL">Все позиции (включая нулевые)</option>
                    <option value="PLANNED">Только в плане недели</option>
                    <option value="OUT_OF_STOCK">Только нулевые остатки (0 кг)</option>
                    <option value="NO_PRICE">Без оптовой цены (с остатком)</option>
                  </select>
                </div>

                {/* Сортировка */}
                <div className="lg:col-span-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="value_desc">По сумме ₽ (убыв.)</option>
                    <option value="value_asc">По сумме ₽ (возр.)</option>
                    <option value="stock_desc">По остатку кг (убыв.)</option>
                    <option value="stock_asc">По остатку кг (возр.)</option>
                    <option value="price_desc">По цене ₽/кг (убыв.)</option>
                    <option value="name_asc">По названию (А-Я)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Таблица */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-700">
                <thead className="bg-slate-100/80 text-slate-600 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">№</th>
                    <th className="py-3 px-4">Товар</th>
                    <th className="py-3 px-4">Категория</th>
                    <th className="py-3 px-4 text-right">Оптовая цена</th>
                    <th className="py-3 px-4 text-right">Свободный остаток</th>
                    <th className="py-3 px-4 text-right bg-emerald-50/50 text-emerald-950 font-black">
                      Сумма на складе
                    </th>
                    <th className="py-3 px-4 text-right">Доля</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        По заданным фильтрам ничего не найдено
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item, idx) => {
                      const rowNum = (page - 1) * pageSize + idx + 1;
                      const totalVal = summary.totalWarehouseValue || 1;
                      const share =
                        totalVal > 0 && item.totalValue > 0
                          ? ((item.totalValue / totalVal) * 100).toFixed(1)
                          : '0.0';

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">
                            {rowNum}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {item.productName}
                              </span>
                              {item.isHit && (
                                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black flex items-center gap-0.5 shrink-0">
                                  <Flame className="w-3 h-3 text-amber-600" />
                                  ХИТ
                                </span>
                              )}
                              {item.isNew && (
                                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold shrink-0">
                                  Новинка
                                </span>
                              )}
                              {item.isPlanned && (
                                <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold shrink-0">
                                  В плане
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-xs">
                            {item.category}
                          </td>
                          <td className="py-3 px-4 text-right font-medium">
                            {item.price > 0 ? (
                              <span>{item.price.toLocaleString('ru-RU')} ₽</span>
                            ) : (
                              <span className="text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                                Нет цены
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium">
                            {item.stockKg > 0 ? (
                              <span className="text-slate-900">
                                {item.stockKg.toLocaleString('ru-RU')} кг
                              </span>
                            ) : (
                              <span className="text-slate-400">0 кг</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right bg-emerald-50/30">
                            <span className="font-black text-emerald-800 font-mono text-sm sm:text-base">
                              {formatMoney(item.totalValue)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-xs font-semibold text-slate-500">
                            {share}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Показано {paginatedItems.length} из {filteredItems.length} товаров
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Назад
                  </button>
                  <span className="px-2 font-bold text-slate-800">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Вперед
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
