'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  History,
  BarChart3,
  Calendar,
  X,
  FileDown,
  FileSpreadsheet,
  Clock,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Package,
  Flame,
  Star,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

export interface StatusEvent {
  id: string;
  type: string;
  title: string;
  badge: string;
  badgeColor: string;
  date: string;
  fileName: string | null;
  savedExcelFile: string | null;
  weekNumber?: number;
  year?: number;
  reason: string;
  details?: string;
  fromCategory?: string;
  toCategory?: string;
}

export interface PositionHistory {
  productName: string;
  category: string | null;
  currentStockKg: number;
  currentPrice: number;
  isNew: boolean;
  isHit: boolean;
  abcCategory: string | null;
  historyPoints: { weekId: string; weekNumber: number; year: number; at: string; stockKg: number }[];
  weekSummaries: {
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
    statusBadge?: { text: string; color: string; reason: string } | null;
  }[];
  statusEvents?: StatusEvent[];
}

interface PositionHistoryModalProps {
  productName: string;
  onClose: () => void;
}

// ─── SVG График динамики остатка ──────────────────────────────────────────────
function HistoryChart({ points }: { points: { at: string; stockKg: number }[] }) {
  if (points.length === 0) {
    return <div className="text-center text-slate-400 py-6 text-xs">Нет точек для графика</div>;
  }

  const values = points.map((p) => p.stockKg);
  const W = 620;
  const H = 160;
  const PL = 48;
  const PR = 16;
  const PT = 12;
  const PB = 34;

  const minY = 0;
  const maxY = Math.max(...values, 1);
  const rangeY = maxY - minY || 1;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  const toX = (i: number) => PL + (i / Math.max(points.length - 1, 1)) * innerW;
  const toY = (v: number) => PT + innerH - ((v - minY) / rangeY) * innerH;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.stockKg).toFixed(1)}`)
    .join(' ');

  const areaD = `${pathD} L ${toX(points.length - 1).toFixed(1)} ${H - PB} L ${PL} ${H - PB} Z`;

  const yTicks = [0, 0.33, 0.66, 1].map((t) => ({
    v: minY + t * rangeY,
    y: toY(minY + t * rangeY),
  }));

  const firstVal = values[0];
  const lastVal = values[values.length - 1];
  const strokeColor = lastVal > firstVal ? '#06b6d4' : lastVal < firstVal ? '#f43f5e' : '#64748b';

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-full" style={{ minWidth: '320px' }}>
        <defs>
          <linearGradient id="pos-chart-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Сетка Y */}
        {yTicks.map((t) => (
          <g key={t.v}>
            <line x1={PL} y1={t.y} x2={W - PR} y2={t.y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
            <text x={PL - 6} y={t.y + 3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="500">
              {t.v < 1 ? t.v.toFixed(1) : Math.round(t.v)}
            </text>
          </g>
        ))}

        {/* Заливка области */}
        <path d={areaD} fill="url(#pos-chart-grad)" />

        {/* Линия */}
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Точки */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(p.stockKg)} r="4" fill={strokeColor} stroke="#ffffff" strokeWidth="2" />
          </g>
        ))}

        {/* Даты по оси X */}
        {points
          .filter((_, i) => {
            const step = Math.max(1, Math.ceil(points.length / 8));
            return i % step === 0 || i === points.length - 1;
          })
          .map((p) => {
            const origIdx = points.indexOf(p);
            const d = new Date(p.at);
            const label = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            return (
              <text key={origIdx} x={toX(origIdx)} y={H - PB + 14} textAnchor="middle" fontSize="8.5" fill="#94a3b8">
                {label}
              </text>
            );
          })}

        <text transform={`rotate(-90, 10, ${H / 2})`} x={10} y={H / 2} textAnchor="middle" fontSize="8" fill="#94a3b8">
          кг
        </text>
      </svg>
    </div>
  );
}

// ─── Основное модальное окно истории позиции ─────────────────────────────────
export default function PositionHistoryModal({ productName, onClose }: PositionHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<PositionHistory | null>(null);
  const [showAllEvents, setShowAllEvents] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/stock-analytics/position-history/${encodeURIComponent(productName)}`);
        setHistory(res.data);
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Ошибка загрузки истории позиции');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [productName]);

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

  const formatKg = (v: number) =>
    new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(v) + ' кг';

  const formatDate = (s: string) => {
    if (!s) return '—';
    const d = new Date(s);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const formatDateTime = (s: string) => {
    if (!s) return '—';
    const d = new Date(s);
    const dateStr = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const timeStr = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr}, ${timeStr}`;
  };

  const resultLabel: Record<string, string> = {
    COMPLETED: 'Выполнено ✓',
    FORGOTTEN: 'Забыли',
    NO_RAW_MATERIAL: 'Нет сырья',
    OTHER: 'Другое',
  };

  const abcColors: Record<string, string> = {
    A: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    B: 'bg-sky-100 text-sky-800 border-sky-200',
    C: 'bg-slate-100 text-slate-700 border-slate-200',
  };

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

  const displayedEvents = React.useMemo(() => {
    if (!history?.statusEvents) return [];
    if (showAllEvents) return history.statusEvents;
    return history.statusEvents.slice(0, 3);
  }, [history?.statusEvents, showAllEvents]);

  // Категории, которые присваивались позиции в истории
  const categoryHistory = React.useMemo(() => {
    if (!history?.weekSummaries) return [];
    const list: string[] = [];
    for (const ws of history.weekSummaries) {
      if (ws.category && !list.includes(ws.category)) {
        list.push(ws.category);
      }
    }
    return list;
  }, [history]);

  // Последняя дельта остатка
  const lastDelta = React.useMemo(() => {
    if (!history?.historyPoints || history.historyPoints.length < 2) return null;
    const len = history.historyPoints.length;
    const last = history.historyPoints[len - 1].stockKg;
    const prev = history.historyPoints[len - 2].stockKg;
    return parseFloat((last - prev).toFixed(2));
  }, [history]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200/80 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-indigo-950 text-white p-5 sm:p-6 flex items-start justify-between gap-4 shrink-0 shadow-md">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0 shadow-inner">
              <History className="w-6 h-6 text-cyan-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                  История позиции и остатков
                </span>
                {categoryHistory.length > 1 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Категория менялась ({categoryHistory.length})
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white leading-tight truncate">
                {productName}
              </h2>

              {history && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {history.category && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-white/10 text-slate-200 border border-white/10">
                      {history.category}
                    </span>
                  )}
                  {history.abcCategory && (
                    <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg border ${abcColors[history.abcCategory] || 'bg-slate-700 text-slate-200'}`}>
                      Кат. {history.abcCategory}
                    </span>
                  )}
                  {history.isHit && (
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-amber-500 text-amber-950 shadow-xs">
                      🔥 Хит
                    </span>
                  )}
                  {history.isNew && (
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-cyan-400 text-cyan-950 shadow-xs">
                      Новинка
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Сбор истории изменений по всем файлам...</span>
            </div>
          ) : history ? (
            <>
              {/* Карточки ключевых показателей */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Текущий остаток
                  </div>
                  <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                    {formatKg(history.currentStockKg)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {history.currentPrice > 0
                      ? `${(history.currentStockKg * history.currentPrice).toLocaleString('ru-RU')} ₽ на складе`
                      : 'Оптовая цена не задана'}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Дельта остатка
                  </div>
                  <div className="text-lg sm:text-xl font-black mt-1 flex items-center gap-1">
                    {lastDelta === null ? (
                      <span className="text-slate-400">—</span>
                    ) : lastDelta > 0 ? (
                      <span className="text-emerald-600 flex items-center">
                        <TrendingUp className="w-4 h-4 mr-0.5" /> +{lastDelta} кг
                      </span>
                    ) : lastDelta < 0 ? (
                      <span className="text-rose-600 flex items-center">
                        <TrendingDown className="w-4 h-4 mr-0.5" /> {lastDelta} кг
                      </span>
                    ) : (
                      <span className="text-slate-600">0 кг</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Сравнение с прошлой загрузкой
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Всего в базе
                  </div>
                  <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                    {history.weekSummaries.length} нед.
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {history.historyPoints.length} фиксаций остатка
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Оптовая цена
                  </div>
                  <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                    {history.currentPrice > 0 ? `${history.currentPrice.toLocaleString('ru-RU')} ₽` : '—'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    За килограмм в прайсе
                  </div>
                </div>
              </div>

              {/* Хронология присвоения категорий и статусов */}
              {history.statusEvents && history.statusEvents.length > 0 ? (
                <div className="bg-slate-50/70 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
                        <History className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          Хронология присвоения категорий и статусов
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          История смен статусов («Хит», «Категория А/B/C», «Не продается», «Новинка») с причинами и датами
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 shadow-2xs">
                      {history.statusEvents.length} {history.statusEvents.length === 1 ? 'событие' : 'событий'}
                    </span>
                  </div>

                  {/* Карточки событий */}
                  <div className="space-y-3">
                    {displayedEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="relative pl-6 sm:pl-7 pb-2 last:pb-0 before:absolute before:left-2.5 before:top-3 before:bottom-0 before:w-0.5 before:bg-slate-200 last:before:hidden"
                      >
                        {/* Маркер на таймлайне */}
                        <div className="absolute left-1.5 top-2 w-2.5 h-2.5 rounded-full ring-4 ring-white bg-cyan-500" />

                        {/* Тело карточки события */}
                        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${statusBadgeColorMap[evt.badgeColor] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                                {evt.badge}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                {evt.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{evt.date ? formatDateTime(evt.date) : '—'}</span>
                              {evt.weekNumber && (
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                  Неделя №{evt.weekNumber}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Пояснение: Почему и как присвоено */}
                          <div className="text-xs text-slate-700 bg-slate-50/80 rounded-lg p-2.5 border border-slate-100 mt-2">
                            <div className="flex items-start gap-1.5">
                              <span className="font-bold text-slate-900 shrink-0">Причина:</span>
                              <span>{evt.reason}</span>
                            </div>
                            {evt.details && (
                              <div className="text-[11px] text-slate-500 mt-1">
                                {evt.details}
                              </div>
                            )}
                          </div>

                          {/* Источник: файл 1С и кнопка скачивания */}
                          {evt.fileName && (
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap text-[11px]">
                              <div className="flex items-center gap-1.5 text-slate-500 truncate max-w-md">
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="text-slate-400">Зафиксировано в:</span>
                                <span className="font-medium text-slate-700 truncate" title={evt.fileName}>
                                  {evt.fileName}
                                </span>
                              </div>

                              {evt.savedExcelFile && (
                                <button
                                  onClick={() => handleDownloadFile(evt.savedExcelFile!, evt.fileName || undefined)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 text-[10px] font-bold transition cursor-pointer"
                                  title="Скачать файл 1С этого момента"
                                >
                                  <FileDown className="w-3 h-3" />
                                  Скачать файл 1С
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {history.statusEvents.length > 3 && (
                    <button
                      onClick={() => setShowAllEvents(!showAllEvents)}
                      className="w-full mt-3 py-2 text-xs font-bold text-cyan-600 hover:text-cyan-700 bg-white hover:bg-cyan-50/50 rounded-xl border border-slate-200 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      {showAllEvents ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          Свернуть ленту событий
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          Показать все {history.statusEvents.length} событий
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : categoryHistory.length > 1 ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900">
                    <span className="font-bold block text-sm mb-1">
                      История присвоения категорий
                    </span>
                    Товар находился в следующих категориях за время загрузок:{' '}
                    <span className="font-semibold">{categoryHistory.join('  ➔  ')}</span>.
                    В таблице ниже показано, в каком файле произошло переназначение.
                  </div>
                </div>
              ) : null}

              {/* График изменений остатков */}
              {history.historyPoints.length >= 2 && (
                <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/70">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-cyan-600" />
                    Наглядный график изменения остатков (кг)
                  </div>
                  <HistoryChart points={history.historyPoints} />
                </div>
              )}

              {/* Таблица изменений по каждому файлу 1С */}
              <div>
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Хронология по каждому загруженному файлу 1С</span>
                  </div>
                  <span className="text-slate-400 font-normal">
                    Всего {history.weekSummaries.length} файлов / записей
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold">
                          <th className="text-left py-3 px-3.5">Файл 1С</th>
                          <th className="text-left py-3 px-3">Дата загрузки</th>
                          <th className="text-right py-3 px-3">Остаток</th>
                          <th className="text-right py-3 px-3">Цена</th>
                          <th className="text-left py-3 px-3">Категория</th>
                          <th className="text-center py-3 px-3">Маркер</th>
                          <th className="text-center py-3 px-3">План</th>
                          <th className="text-center py-3 px-3">Скачать</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {history.weekSummaries.map((ws, idx) => {
                          const prev = idx > 0 ? history.weekSummaries[idx - 1] : null;
                          const delta = prev !== null ? ws.finalStockKg - prev.finalStockKg : null;
                          const categoryChanged = prev && prev.category && ws.category && prev.category !== ws.category;

                          return (
                            <tr
                              key={`${ws.weekId}-${idx}-${ws.uploadedAt}`}
                              className={`hover:bg-slate-50 transition-colors ${
                                ws.isDeleted ? 'opacity-50 bg-slate-50/50' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3.5">
                                <div className="flex items-center gap-2 max-w-xs">
                                  <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-900 truncate" title={ws.fileName || 'Прайс 1С'}>
                                      {ws.fileName || 'Прайс 1С'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-semibold">
                                      Неделя №{ws.weekNumber} ({ws.year})
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                                {ws.uploadedAt ? formatDateTime(ws.uploadedAt) : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span
                                    className={`font-black ${
                                      ws.finalStockKg <= 0 ? 'text-rose-500' : 'text-slate-900'
                                    }`}
                                  >
                                    {formatKg(ws.finalStockKg)}
                                  </span>
                                  {delta !== null && Math.abs(delta) > 0.001 && (
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                        delta > 0
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                                      }`}
                                    >
                                      {delta > 0 ? '+' : ''}
                                      {delta.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-700 font-semibold whitespace-nowrap">
                                {ws.price ? `${ws.price.toLocaleString('ru-RU')} ₽` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{ws.category || 'Без категории'}</span>
                                  {categoryChanged && (
                                    <span
                                      title={`Ранее категория была: "${prev.category}"`}
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                                    >
                                      🔄 сменилась
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                {ws.statusBadge ? (
                                  <span
                                    title={ws.statusBadge.reason}
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-help ${
                                      statusBadgeColorMap[ws.statusBadge.color] || 'bg-slate-50 text-slate-700 border-slate-200'
                                    }`}
                                  >
                                    {ws.statusBadge.text}
                                  </span>
                                ) : (
                                  <div className="flex items-center justify-center gap-1">
                                    {ws.abcCategory && (
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${abcColors[ws.abcCategory] || ''}`}>
                                        {ws.abcCategory}
                                      </span>
                                    )}
                                    {ws.isHit && (
                                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                        🔥
                                      </span>
                                    )}
                                    {ws.isNew && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-900 border border-cyan-300">
                                        НОВ
                                      </span>
                                    )}
                                    {!ws.abcCategory && !ws.isHit && !ws.isNew && (
                                      <span className="text-slate-300">—</span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                {ws.resultStatus ? (
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      ws.resultStatus === 'COMPLETED'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : ws.resultStatus === 'FORGOTTEN'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}
                                  >
                                    {resultLabel[ws.resultStatus] || ws.resultStatus}
                                  </span>
                                ) : ws.isPlanned ? (
                                  <span className="text-[10px] text-sky-600 font-bold bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                                    В плане
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                {ws.savedExcelFile ? (
                                  <button
                                    onClick={() => handleDownloadFile(ws.savedExcelFile!, ws.fileName)}
                                    className="p-1.5 rounded-lg hover:bg-cyan-50 text-cyan-600 hover:text-cyan-700 border border-cyan-200 transition cursor-pointer"
                                    title={ws.fileName || 'Скачать файл 1С этой недели'}
                                  >
                                    <FileDown className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <span className="text-slate-300 text-[10px]" title="Файл не был сохранен при загрузке">
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
