'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import api from '@/lib/api';
import PositionHistoryModal from './PositionHistoryModal';
import toast from 'react-hot-toast';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Calendar,
  ArrowUpDown,
  Flame,
  Star,
  Sparkles,
  Info,
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileDown,
  History,
  Layers,
} from 'lucide-react';

// ─── Типы ──────────────────────────────────────────────────────────────────

interface StockPoint {
  weekId: string;
  weekLabel: string;
  shortLabel: string;
  uploadedAt: string;
  stockKg: number;
}

interface PositionRow {
  productName: string;
  category: string;
  currentStockKg: number;
  currentPrice: number;
  isNew: boolean;
  isHit: boolean;
  isPlanned: boolean;
  abcCategory: string | null;
  resultStatus: string | null;
  isStagnant?: boolean;
  statusBadge?: { text: string; color: string; reason: string } | null;
  stockHistory: StockPoint[];
  stockDelta: number | null;
  changesCount: number;
  weeksCount: number;
}

interface UploadRecord {
  weekId: string;
  year: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  weekStatus: string;
  fileName: string;
  uploadedAt: string;
  savedExcelFile: string | null;
  canDownload: boolean;
  stats: {
    total: number;
    created: number;
    updated: number;
    novelties: number;
    outOfStock: number;
  } | null;
  changes: {
    hitsCount: number;
    noveltiesCount: number;
    outOfStockCount: number;
    backInStockCount: number;
    priceChangesCount: number;
    movedToTrashCount: number;
  } | null;
}

interface WeekSummary {
  weekId: string;
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  uploadedAt: string;
  category: string;
  price: number;
  finalStockKg: number;
  isNew: boolean;
  isPlanned: boolean;
  isHit: boolean;
  abcCategory: string | null;
  resultStatus: string | null;
  isDeleted: boolean;
  savedExcelFile: string | null;
  fileName: string | null;
}

interface PositionHistory {
  productName: string;
  category: string | null;
  currentStockKg: number;
  currentPrice: number;
  isNew: boolean;
  isHit: boolean;
  abcCategory: string | null;
  historyPoints: { weekId: string; weekNumber: number; year: number; at: string; stockKg: number }[];
  weekSummaries: WeekSummary[];
}

// ─── Мини-спарклайн (SVG) ──────────────────────────────────────────────────

function Sparkline({ points, width = 80, height = 28 }: { points: number[]; width?: number; height?: number }) {
  if (points.length < 2) {
    return (
      <div style={{ width, height }} className="flex items-center justify-center text-slate-300 text-[10px]">
        —
      </div>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const xStep = width / (points.length - 1);
  const coords = points.map((v, i) => ({
    x: i * xStep,
    y: height - 4 - ((v - min) / range) * (height - 8),
  }));

  const pathD = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  // Цвет: последнее значение больше первого — зелёный, меньше — красный, равно — серый
  const first = points[0];
  const last = points[points.length - 1];
  const color = last > first + 0.1 ? '#10b981' : last < first - 0.1 ? '#ef4444' : '#94a3b8';

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Area fill */}
      <defs>
        <linearGradient id={`sg-${points.join('-').slice(0, 20)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path
        d={`${pathD} L ${coords[coords.length - 1].x.toFixed(1)} ${height} L 0 ${height} Z`}
        fill={`url(#sg-${points.join('-').slice(0, 20)})`}
      />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Last point dot */}
      <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="2.5" fill={color} />
    </svg>
  );
}

// ─── Основной компонент вкладки ─────────────────────────────────────────────

export default function StockAnalyticsTab() {
  // Вкладки: positions | uploads
  const [activeSection, setActiveSection] = useState<'positions' | 'uploads'>('positions');

  // Состояние позиций
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [positionsTotal, setPositionsTotal] = useState(0);
  const [positionsPage, setPositionsPage] = useState(1);
  const [positionsTotalPages, setPositionsTotalPages] = useState(1);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

  // Фильтры
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [statusCounts, setStatusCounts] = useState<{
    all: number;
    hits: number;
    catA: number;
    catB: number;
    catC: number;
    stagnant: number;
    newItems: number;
  } | null>(null);
  const [sortBy, setSortBy] = useState('name_asc');

  const statusBadgeColorMap: Record<string, string> = {
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  // Состояние загрузок
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [uploadsLoading, setUploadsLoading] = useState(true);

  // Модальное окно истории позиции
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  // Debounce поиска
  const searchTimer = useRef<any>(null);

  const loadPositions = useCallback(
    async (page = 1, search = searchQuery, category = selectedCategory, sort = sortBy, status = selectedStatus) => {
      try {
        setPositionsLoading(true);
        const params = new URLSearchParams({
          page: String(page),
          sortBy: sort,
        });
        if (search.trim()) params.append('search', search.trim());
        if (category !== 'ALL') params.append('category', category);
        if (status !== 'ALL') params.append('status', status);

        const res = await api.get(`/api/stock-analytics/positions?${params.toString()}`);
        setPositions(res.data.positions || []);
        setPositionsTotal(res.data.total || 0);
        setPositionsPage(res.data.page || 1);
        setPositionsTotalPages(res.data.totalPages || 1);
        if (res.data.categories?.length > 0) setCategories(res.data.categories);
        if (res.data.statusCounts) setStatusCounts(res.data.statusCounts);
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Ошибка загрузки позиций');
      } finally {
        setPositionsLoading(false);
      }
    },
    [searchQuery, selectedCategory, sortBy, selectedStatus]
  );

  const loadUploads = useCallback(async () => {
    try {
      setUploadsLoading(true);
      const res = await api.get('/api/stock-analytics/uploads');
      setUploads(res.data.uploads || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка загрузки истории файлов');
    } finally {
      setUploadsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPositions(1);
    loadUploads();
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPositionsPage(1);
      loadPositions(1, val, selectedCategory, sortBy, selectedStatus);
    }, 350);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setPositionsPage(1);
    loadPositions(1, searchQuery, cat, sortBy, selectedStatus);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setPositionsPage(1);
    loadPositions(1, searchQuery, selectedCategory, sortBy, status);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setPositionsPage(1);
    loadPositions(1, searchQuery, selectedCategory, sort, selectedStatus);
  };

  const handlePageChange = (p: number) => {
    setPositionsPage(p);
    loadPositions(p, searchQuery, selectedCategory, sortBy, selectedStatus);
  };

  const handleDownloadFile = async (savedExcelFile: string, fallbackName?: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('topfish_control_token') : null;
      const resp = await api.get(`/api/stock-analytics/download/${encodeURIComponent(savedExcelFile)}`, {
        responseType: 'blob',
        params: token ? { token } : undefined,
      });

      const blob = new Blob([resp.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');

      let dlName = fallbackName || savedExcelFile;
      const cd = resp.headers?.['content-disposition'] || resp.headers?.['Content-Disposition'];
      if (cd) {
        const m = cd.match(/filename\*=UTF-8''([^;]+)/i) || cd.match(/filename="?([^";]+)"?/i);
        if (m && m[1]) {
          try {
            dlName = decodeURIComponent(m[1]);
          } catch {
            dlName = m[1];
          }
        }
      } else if (!fallbackName) {
        const parts = savedExcelFile.split('_');
        if (parts.length >= 3) {
          dlName = parts.slice(2).join('_');
        }
      }

      link.href = blobUrl;
      link.download = dlName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error('Download error:', err);
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const j = JSON.parse(text);
          toast.error(j.error || 'Ошибка скачивания файла');
          return;
        } catch {
          // ignore
        }
      }
      toast.error(err?.response?.data?.error || 'Не удалось скачать файл');
    }
  };

  const formatDate = (s: string) => {
    if (!s) return '—';
    return new Date(s).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatKg = (v: number) =>
    new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(v) + ' кг';

  const weekStatusLabel: Record<string, string> = {
    PLANNING: 'Планирование',
    IN_PROGRESS: 'В работе',
    REVIEWING: 'Итоги',
    CLOSED: 'Закрыта',
  };
  const weekStatusColor: Record<string, string> = {
    PLANNING: 'bg-amber-50 text-amber-700 border-amber-200',
    IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
    REVIEWING: 'bg-purple-50 text-purple-700 border-purple-200',
    CLOSED: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  const abcColors: Record<string, string> = {
    A: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    B: 'bg-sky-100 text-sky-700 border-sky-200',
    C: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const sortOptions = [
    { value: 'name_asc', label: 'По названию (А→Я)' },
    { value: 'stock_desc', label: 'По остатку (↓)' },
    { value: 'changes_desc', label: 'Больше изменений' },
    { value: 'delta_desc', label: 'Прирост (↓)' },
    { value: 'abc', label: 'По ABC' },
  ];

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-300">
      {/* Шапка */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-cyan-900/40 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Аналитика склада
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3 mb-1">
            <Package className="w-8 h-8 text-cyan-400" />
            <span>Аналитика позиций склада</span>
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            История изменений остатков по каждой позиции с каждым загруженным файлом 1С. Нажмите на значок{' '}
            <span className="inline-flex items-center gap-0.5 bg-white/10 px-1.5 py-0.5 rounded text-cyan-200 font-semibold text-[11px]">
              <History className="w-3 h-3" /> История
            </span>{' '}
            рядом с позицией, чтобы увидеть детальную динамику и данные по каждой неделе.
          </p>
        </div>
      </div>

      {/* Переключатель секций */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-1.5 flex items-center gap-1">
        <button
          onClick={() => setActiveSection('positions')}
          className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSection === 'positions'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4 text-cyan-400" />
          <span>Позиции и остатки</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeSection === 'positions' ? 'bg-slate-800 text-cyan-300' : 'bg-slate-100 text-slate-600'}`}>
            {positionsTotal}
          </span>
        </button>
        <button
          onClick={() => setActiveSection('uploads')}
          className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSection === 'uploads'
              ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-indigo-300" />
          <span>Загруженные файлы</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeSection === 'uploads' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {uploads.length}
          </span>
        </button>
      </div>

      {/* ══ Секция «Позиции» ══ */}
      {activeSection === 'positions' && (
        <div className="space-y-4">
          {/* Фильтры */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row gap-3">
            {/* Поиск */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Поиск по названию..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              />
            </div>
            {/* Категория */}
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
            >
              <option value="ALL">Все категории</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {/* Сортировка */}
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {/* Экспорт в CSV */}
            <button
              onClick={() => {
                if (positions.length === 0) {
                  toast.error('Нет данных для экспорта');
                  return;
                }
                const headers = ['Позиция', 'Категория', 'ABC', 'Остаток (кг)', 'Цена (₽)', 'Стоимость (₽)', 'Дельта (кг)', 'Изменений'];
                const rows = positions.map(p => [
                  `"${p.productName.replace(/"/g, '""')}"`,
                  `"${(p.category || '').replace(/"/g, '""')}"`,
                  p.abcCategory || '',
                  p.currentStockKg,
                  p.currentPrice,
                  Math.round(p.currentStockKg * p.currentPrice),
                  p.stockDelta ?? '',
                  p.changesCount,
                ]);
                const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `analitika_sklada_${new Date().toISOString().slice(0, 10)}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Экспорт в CSV"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Экспорт CSV</span>
            </button>

            {/* Обновить */}
            <button
              onClick={() => loadPositions(positionsPage)}
              disabled={positionsLoading}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition cursor-pointer disabled:opacity-50"
              title="Обновить"
            >
              <RefreshCw className={`w-4 h-4 ${positionsLoading ? 'animate-spin text-cyan-500' : ''}`} />
            </button>
          </div>

          {/* Быстрые фильтры по статусам и категориям спроса */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'ALL', label: 'Все позиции', count: statusCounts?.all },
              { id: 'HIT', label: '🔥 Хиты', count: statusCounts?.hits, color: 'text-orange-700 bg-orange-50 border-orange-200' },
              { id: 'CAT_A', label: '⭐ Категория А', count: statusCounts?.catA, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
              { id: 'CAT_B', label: '🔷 Категория B', count: statusCounts?.catB, color: 'text-blue-700 bg-blue-50 border-blue-200' },
              { id: 'CAT_C', label: '🔸 Категория C', count: statusCounts?.catC, color: 'text-violet-700 bg-violet-50 border-violet-200' },
              { id: 'STAGNANT', label: '❗ Не продается', count: statusCounts?.stagnant, color: 'text-rose-700 bg-rose-50 border-rose-200' },
              { id: 'NEW', label: '✨ Новинки', count: statusCounts?.newItems, color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
            ].map((pill) => {
              const active = selectedStatus === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => handleStatusChange(pill.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : pill.color || 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{pill.label}</span>
                  {pill.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        active ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                      }`}
                    >
                      {pill.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Таблица позиций */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {positionsLoading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span>Загрузка позиций...</span>
              </div>
            ) : positions.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">Позиции не найдены</p>
                <p className="text-sm mt-1">Попробуйте изменить фильтры или загрузите файл 1С</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Позиция
                        </th>
                        <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                          Статус / ABC
                        </th>
                        <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Остаток
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                          Динамика
                        </th>
                        <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                          Изменений
                        </th>
                        <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          История
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((pos) => {
                        const sparkData = pos.stockHistory.map((p) => p.stockKg);
                        const delta = pos.stockDelta;
                        return (
                          <tr
                            key={pos.productName}
                            className="border-b border-slate-50 hover:bg-slate-50/60 transition"
                          >
                            {/* Название */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-800 leading-tight truncate max-w-xs">
                                    {pos.productName}
                                  </div>
                                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                    <span>{pos.category}</span>
                                    {pos.statusBadge && (
                                      <span
                                        title={pos.statusBadge.reason}
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-help ${
                                          statusBadgeColorMap[pos.statusBadge.color] || 'bg-slate-50 text-slate-700 border-slate-200'
                                        }`}
                                      >
                                        {pos.statusBadge.text}
                                      </span>
                                    )}
                                    {pos.isPlanned && (
                                      <span className="px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">В плане</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* ABC / Статус */}
                            <td className="py-3 px-3 text-center hidden sm:table-cell">
                              {pos.statusBadge ? (
                                <span
                                  title={pos.statusBadge.reason}
                                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border cursor-help ${
                                    statusBadgeColorMap[pos.statusBadge.color] || 'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {pos.statusBadge.text}
                                </span>
                              ) : pos.abcCategory ? (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${abcColors[pos.abcCategory] || ''}`}>
                                  {pos.abcCategory}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs">—</span>
                              )}
                            </td>

                            {/* Остаток */}
                            <td className="py-3 px-3 text-right">
                              <div className="flex flex-col items-end gap-0.5">
                                <span className={`font-bold text-sm ${pos.currentStockKg <= 0 ? 'text-rose-500' : 'text-slate-800'}`}>
                                  {formatKg(pos.currentStockKg)}
                                </span>
                                {delta !== null && Math.abs(delta) > 0.01 && (
                                  <span
                                    className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                                      delta > 0 ? 'text-emerald-500' : 'text-rose-500'
                                    }`}
                                  >
                                    {delta > 0 ? (
                                      <TrendingUp className="w-2.5 h-2.5" />
                                    ) : (
                                      <TrendingDown className="w-2.5 h-2.5" />
                                    )}
                                    {delta > 0 ? '+' : ''}{delta.toFixed(1)} кг
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Спарклайн */}
                            <td className="py-3 px-4 hidden md:table-cell">
                              <div className="flex justify-center">
                                <Sparkline points={sparkData} width={88} height={28} />
                              </div>
                            </td>

                            {/* Число изменений */}
                            <td className="py-3 px-3 text-center hidden lg:table-cell">
                              <div className="flex flex-col items-center">
                                <span className={`text-xs font-bold ${pos.changesCount > 0 ? 'text-cyan-600' : 'text-slate-300'}`}>
                                  {pos.changesCount > 0 ? pos.changesCount : '—'}
                                </span>
                                <span className="text-[10px] text-slate-400">/ {pos.weeksCount} нед.</span>
                              </div>
                            </td>

                            {/* Кнопка истории */}
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => setSelectedPosition(pos.productName)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-600 hover:text-cyan-700 border border-cyan-200 text-xs font-semibold transition cursor-pointer"
                                title="Показать историю остатков"
                              >
                                <History className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">История</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Пагинация */}
                {positionsTotalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500">
                      {positionsTotal} позиций • Страница {positionsPage} из {positionsTotalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePageChange(positionsPage - 1)}
                        disabled={positionsPage <= 1}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30 transition cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: Math.min(5, positionsTotalPages) }, (_, i) => {
                        const offset = Math.max(0, Math.min(positionsPage - 3, positionsTotalPages - 5));
                        const p = i + 1 + offset;
                        return (
                          <button
                            key={p}
                            onClick={() => handlePageChange(p)}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                              p === positionsPage
                                ? 'bg-cyan-500 text-white'
                                : 'hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => handlePageChange(positionsPage + 1)}
                        disabled={positionsPage >= positionsTotalPages}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30 transition cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ Секция «Загруженные файлы» ══ */}
      {activeSection === 'uploads' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Все файлы 1С, загруженные в систему. Файлы, загруженные после обновления, доступны для скачивания.
            </p>
            <button
              onClick={loadUploads}
              disabled={uploadsLoading}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer disabled:opacity-50"
              title="Обновить список"
            >
              <RefreshCw className={`w-4 h-4 ${uploadsLoading ? 'animate-spin text-cyan-500' : ''}`} />
            </button>
          </div>

          {uploadsLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-400 bg-white rounded-2xl border border-slate-200">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span>Загрузка...</span>
            </div>
          ) : uploads.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Файлы ещё не загружались</p>
            </div>
          ) : (
            <div className="space-y-2">
              {uploads.map((u) => (
                <div
                  key={`${u.weekId}-${u.uploadedAt}`}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row sm:items-start gap-4"
                >
                  {/* Иконка файла */}
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  </div>

                  {/* Информация */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-slate-800 truncate max-w-xs">{u.fileName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${weekStatusColor[u.weekStatus] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {weekStatusLabel[u.weekStatus] || u.weekStatus}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Неделя №{u.weekNumber} ({u.year})
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(u.uploadedAt)}
                      </span>
                    </div>

                    {/* Статистика загрузки */}
                    {u.stats && (
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full text-slate-600 font-medium">
                          Всего: {u.stats.total} поз.
                        </span>
                        {u.stats.novelties > 0 && (
                          <span className="text-xs bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full text-teal-700 font-medium">
                            Новинок: {u.stats.novelties}
                          </span>
                        )}
                        {u.stats.outOfStock > 0 && (
                          <span className="text-xs bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-rose-700 font-medium">
                            Под заказ: {u.stats.outOfStock}
                          </span>
                        )}
                        {u.changes && u.changes.priceChangesCount > 0 && (
                          <span className="text-xs bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-amber-700 font-medium">
                            Цены: {u.changes.priceChangesCount}
                          </span>
                        )}
                        {u.changes && u.changes.hitsCount > 0 && (
                          <span className="text-xs bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full text-orange-700 font-medium">
                            🔥 Хиты: {u.changes.hitsCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Кнопка скачивания */}
                  <div className="shrink-0">
                    {u.canDownload ? (
                      <button
                        onClick={() => handleDownloadFile(u.savedExcelFile!, u.fileName)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold shadow-sm shadow-cyan-500/25 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Скачать
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        Файл не сохранён
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Пояснение */}
          {uploads.some((u) => !u.canDownload) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                <strong>Файлы без кнопки «Скачать»</strong> были загружены до введения функции постоянного хранения.
                Начиная с этого обновления все новые загрузки автоматически сохраняются и доступны для скачивания.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Модальное окно истории позиции */}
      {selectedPosition && (
        <PositionHistoryModal
          productName={selectedPosition}
          onClose={() => setSelectedPosition(null)}
        />
      )}
    </div>
  );
}
