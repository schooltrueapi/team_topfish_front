'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import api from '@/lib/api';
import PositionHistoryModal from './PositionHistoryModal';
import DateUploadModal from './DateUploadModal';
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
  Plus,
  Trash2,
  CalendarCheck,
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

  // Модальное окно загрузки файла на выбранную дату
  const [isDateUploadOpen, setIsDateUploadOpen] = useState(false);
  const [selectedGapDate, setSelectedGapDate] = useState<Date | null>(null);
  const [selectedGapWeekId, setSelectedGapWeekId] = useState<string | undefined>(undefined);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

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

  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const handleDownloadFile = async (savedExcelFile: string, fallbackName?: string) => {
    try {
      setDownloadingFile(savedExcelFile);
      const token = typeof window !== 'undefined' ? localStorage.getItem('topfish_control_token') : null;
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
      const downloadUrl = `${apiBase}/api/stock-analytics/download/${encodeURIComponent(savedExcelFile)}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

      // Прямое нативное скачивание браузером без ожидания и зависания в буфере Axios
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fallbackName || savedExcelFile);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Скачивание файла началось');
    } catch (err: any) {
      console.error('Download error:', err);
      toast.error('Не удалось скачать файл');
    } finally {
      setTimeout(() => setDownloadingFile(null), 1500);
    }
  };

  const handleDeleteUpload = async (u: UploadRecord) => {
    const dStr = u.uploadedAt
      ? new Date(u.uploadedAt).toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
    const confirmMsg = `Удалить выгрузку "${u.fileName}" (${dStr})?\n\nВнимание: точка остатков на эту дату будет удалена из графиков динамики.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const fileKey = u.savedExcelFile || u.uploadedAt;
      setDeletingFile(fileKey);
      await api.delete('/api/stock-analytics/upload', {
        data: {
          weekId: u.weekId,
          savedExcelFile: u.savedExcelFile,
          fileName: u.fileName,
          uploadedAt: u.uploadedAt,
        },
      });
      toast.success('Выгрузка успешно удалена');
      loadUploads();
      loadPositions(positionsPage);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка удаления файла');
    } finally {
      setDeletingFile(null);
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

  const formatDaysPlural = (count: number) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod100 >= 11 && mod100 <= 19) return `${count} дней`;
    if (mod10 === 1) return `${count} день`;
    if (mod10 >= 2 && mod10 <= 4) return `${count} дня`;
    return `${count} дней`;
  };

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">История всех выгрузок 1С</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Загружайте ежедневные файлы для непрерывной аналитики и отслеживания тенденций продаж
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setSelectedGapDate(null);
                  setSelectedGapWeekId(undefined);
                  setIsDateUploadOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-xs shadow-md shadow-teal-500/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <Calendar className="w-4 h-4" />
                <span>Загрузить файл на дату</span>
              </button>
              <button
                onClick={loadUploads}
                disabled={uploadsLoading}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer disabled:opacity-50"
                title="Обновить список"
              >
                <RefreshCw className={`w-4 h-4 ${uploadsLoading ? 'animate-spin text-cyan-500' : ''}`} />
              </button>
            </div>
          </div>

          {uploadsLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-400 bg-white rounded-2xl border border-slate-200">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span>Загрузка...</span>
            </div>
          ) : uploads.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-slate-700">Файлы ещё не загружались</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Загрузите первый файл 1С для начала сбора истории остатков
              </p>
              <button
                onClick={() => {
                  setSelectedGapDate(null);
                  setSelectedGapWeekId(undefined);
                  setIsDateUploadOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-md shadow-teal-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Загрузить файл 1С</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {uploads.map((u, idx) => {
                // Вычисляем пропуск между текущим и следующим (более ранним) файлом строго по календарным дням
                const currentUploadedAt = u.uploadedAt ? new Date(u.uploadedAt) : null;
                const nextUploadedAt = uploads[idx + 1]?.uploadedAt ? new Date(uploads[idx + 1].uploadedAt) : null;

                let gapDays = 0;
                let gapStartDateStr = '';
                let gapEndDateStr = '';
                let suggestedGapDate: Date | null = null;

                if (currentUploadedAt && nextUploadedAt) {
                  const currentDay = new Date(currentUploadedAt.getFullYear(), currentUploadedAt.getMonth(), currentUploadedAt.getDate());
                  const prevDay = new Date(nextUploadedAt.getFullYear(), nextUploadedAt.getMonth(), nextUploadedAt.getDate());

                  const dayDiff = Math.round((currentDay.getTime() - prevDay.getTime()) / (1000 * 60 * 60 * 24));
                  const missingCount = dayDiff - 1;

                  if (missingCount >= 1) {
                    gapDays = missingCount;
                    const startD = new Date(prevDay.getFullYear(), prevDay.getMonth(), prevDay.getDate() + 1);
                    const endD = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate() - 1);

                    gapStartDateStr = startD.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
                    gapEndDateStr = endD.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });

                    // Предлагаем загрузить первый пропущенный день
                    suggestedGapDate = startD;
                  }
                }

                const fileKey = u.savedExcelFile || u.uploadedAt;
                const isDeleting = deletingFile === fileKey;

                return (
                  <React.Fragment key={`${u.weekId}-${u.savedExcelFile || u.uploadedAt}-${idx}`}>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row sm:items-start gap-4">
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

                      {/* Кнопки действий */}
                      <div className="shrink-0 flex items-center gap-2 self-start sm:self-center">
                        {u.canDownload ? (
                          <button
                            onClick={() => handleDownloadFile(u.savedExcelFile!, u.fileName)}
                            disabled={downloadingFile === u.savedExcelFile}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-400 text-white text-xs font-bold shadow-sm shadow-cyan-500/25 transition cursor-pointer"
                          >
                            {downloadingFile === u.savedExcelFile ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Скачивание...</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                <span>Скачать</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-xs">
                            <AlertTriangle className="w-3 h-3" />
                            Файл не сохранён
                          </div>
                        )}

                        <button
                          onClick={() => handleDeleteUpload(u)}
                          disabled={isDeleting}
                          className="p-2 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer disabled:opacity-40"
                          title="Удалить выгрузку из истории"
                        >
                          {isDeleting ? (
                            <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Разделитель-уведомление о пропущенных днях */}
                    {gapDays >= 1 && (
                      <div className="my-2 p-3 rounded-2xl bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 border border-dashed border-amber-300 shadow-2xs flex items-center justify-between gap-3 flex-wrap animate-in fade-in duration-200">
                        <div className="flex items-center gap-2.5 text-xs text-amber-900">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                          <span>
                            <strong>Пропуск выгрузки: {formatDaysPlural(gapDays)}</strong>
                            {' '}без данных ({gapDays === 1 ? gapStartDateStr : `${gapStartDateStr} — ${gapEndDateStr}`})
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedGapDate(suggestedGapDate);
                            setSelectedGapWeekId(u.weekId);
                            setIsDateUploadOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shadow-sm shadow-amber-500/20 transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Заполнить пропуск на {gapStartDateStr}</span>
                        </button>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
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

      {/* Модальное окно загрузки файла на выбранную дату */}
      {isDateUploadOpen && (
        <DateUploadModal
          isOpen={isDateUploadOpen}
          onClose={() => {
            setIsDateUploadOpen(false);
            setSelectedGapDate(null);
            setSelectedGapWeekId(undefined);
          }}
          onSuccess={() => {
            loadUploads();
            loadPositions(positionsPage);
          }}
          initialDate={selectedGapDate || undefined}
          initialWeekId={selectedGapWeekId}
        />
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
