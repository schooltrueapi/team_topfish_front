'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  TrendingDown,
  PackageCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  ArrowRight,
  PlusCircle,
  HelpCircle,
  Layers,
  Zap,
  Truck,
  Flame,
  Calendar,
  Clock,
  Trash2,
} from 'lucide-react';

export interface UploadDiffData {
  fileName?: string;
  uploadedAt?: string | Date | null;
  message?: string;
  autoSyncPrice?: boolean;
  syncResult?: {
    summary?: {
      createdCount?: number;
      updatedCount?: number;
      omittedCount?: number;
    };
    [key: string]: any;
  } | null;
  syncError?: string | null;
  dostavkaSyncResult?: {
    summary?: {
      createdCount?: number;
      updatedCount?: number;
      unavailableCount?: number;
    };
    [key: string]: any;
  } | null;
  dostavkaSyncError?: string | null;
  stats?: {
    total: number;
    created: number;
    updated: number;
    novelties: number;
    outOfStock: number;
    noveltiesCount?: number;
    outOfStockChangesCount?: number;
    backInStockCount?: number;
    priceChangesCount?: number;
    hitsCount?: number;
    movedToTrashCount?: number;
  };
  changes: {
    hits?: Array<{
      name: string;
      category?: string | null;
      price?: number | null;
      oldStock?: number | null;
      newStock: number;
      reason?: string;
    }>;
    novelties: Array<{
      name: string;
      category?: string | null;
      price?: number | null;
      stockKg?: number | null;
      reason?: string;
    }>;
    outOfStock: Array<{
      name: string;
      category?: string | null;
      oldStock?: number | null;
      newStock: number;
      reason?: string;
    }>;
    backInStock: Array<{
      name: string;
      category?: string | null;
      oldStock: number;
      newStock: number;
    }>;
    priceChanges: Array<{
      name: string;
      category?: string | null;
      oldPrice?: number | null;
      newPrice: number;
      diff?: number | null;
    }>;
    stockChanges: Array<{
      name: string;
      category?: string | null;
      oldStock: number;
      newStock: number;
      diff: number;
    }>;
    addedToWeek: Array<{
      name: string;
      category?: string | null;
      price?: number | null;
      stockKg?: number | null;
    }>;
    movedToTrash?: Array<{
      name: string;
      category?: string | null;
      oldStock?: number | null;
      newStock: number;
      reason?: string;
    }>;
  };
}

interface UploadDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: UploadDiffData | null;
  uploadedAtFallback?: string | Date | null;
}

type TabType = 'all' | 'hits' | 'outOfStock' | 'novelties' | 'priceChanges' | 'backInStock' | 'stockChanges' | 'addedToWeek' | 'movedToTrash';

function fixMojibake(str?: string): string {
  if (!str) return '';
  try {
    if (/[ÐÑ]/.test(str)) {
      return decodeURIComponent(escape(str));
    }
  } catch (e) {}
  return str;
}

export default function UploadDiffModal({
  isOpen,
  onClose,
  data,
  uploadedAtFallback,
}: UploadDiffModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const uploadDateRaw = data?.uploadedAt || uploadedAtFallback;
  const formattedUploadDate = useMemo(() => {
    if (!uploadDateRaw) return null;
    try {
      const d = new Date(uploadDateRaw);
      if (isNaN(d.getTime())) return null;
      const dateStr = d.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const timeStr = d.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${dateStr} в ${timeStr}`;
    } catch {
      return null;
    }
  }, [uploadDateRaw]);

  if (!isOpen || !data) return null;

  const rawFileName = data.fileName || 'Прайс 1С.xlsx';
  const fileName = fixMojibake(rawFileName);

  const {
    changes = {
      hits: [],
      novelties: [],
      outOfStock: [],
      backInStock: [],
      priceChanges: [],
      stockChanges: [],
      addedToWeek: [],
      movedToTrash: [],
    },
    stats,
  } = data;

  const hitsList = changes.hits || [];
  const outOfStockList = changes.outOfStock || [];
  const noveltiesList = changes.novelties || [];
  const priceChangesList = changes.priceChanges || [];
  const backInStockList = changes.backInStock || [];
  const stockChangesList = changes.stockChanges || [];
  const addedToWeekList = changes.addedToWeek || [];
  const movedToTrashList = changes.movedToTrash || [];

  const totalChangesCount =
    hitsList.length +
    outOfStockList.length +
    noveltiesList.length +
    priceChangesList.length +
    backInStockList.length +
    stockChangesList.length +
    addedToWeekList.length +
    movedToTrashList.length;

  const query = searchQuery.trim().toLowerCase();

  // Фильтрация по поиску
  const filterByName = (item: { name: string; category?: string | null }) => {
    if (!query) return true;
    return (
      item.name.toLowerCase().includes(query) ||
      (item.category && item.category.toLowerCase().includes(query))
    );
  };

  const filteredHits = hitsList.filter(filterByName);
  const filteredOutOfStock = outOfStockList.filter(filterByName);
  const filteredNovelties = noveltiesList.filter(filterByName);
  const filteredPriceChanges = priceChangesList.filter(filterByName);
  const filteredBackInStock = backInStockList.filter(filterByName);
  const filteredStockChanges = stockChangesList.filter(filterByName);
  const filteredAddedToWeek = addedToWeekList.filter(filterByName);
  const filteredMovedToTrash = movedToTrashList.filter(filterByName);

  const displayedTotalCount =
    filteredHits.length +
    filteredOutOfStock.length +
    filteredNovelties.length +
    filteredPriceChanges.length +
    filteredBackInStock.length +
    filteredStockChanges.length +
    filteredAddedToWeek.length +
    filteredMovedToTrash.length;

  const formatKg = (val?: number | null) => {
    if (val === null || val === undefined) return '—';
    return `${Number(val).toLocaleString('ru-RU', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} кг`;
  };

  const formatPrice = (val?: number | null) => {
    if (val === null || val === undefined) return '—';
    return `${Math.round(val).toLocaleString('ru-RU')} ₽`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Верхняя шапка */}
        <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-teal-50/20 to-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/25 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-lg">
                  Сводка изменений после загрузки 1С
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Успешно
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Файл: <strong className="font-bold text-slate-900">{fileName}</strong></span>
                </span>
                {formattedUploadDate && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-slate-200 shadow-2xs">
                      <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>Загружен: <strong className="text-slate-900">{formattedUploadDate}</strong></span>
                    </span>
                  </>
                )}
                {stats?.total && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>Всего в плане: <strong className="text-slate-800">{stats.total} поз.</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Баннер статуса синхронизации с TopFish Price */}
        {data.syncResult && (
          <div className="px-5 py-2.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50/50 border-b border-blue-200 flex items-center justify-between gap-3 text-xs shrink-0 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              </span>
              <span className="text-blue-950 font-bold">
                Автоматически синхронизировано с Прайсом:
              </span>
              <span className="text-blue-800 text-[11px]">
                создано <strong className="font-bold text-blue-950">{data.syncResult.summary?.createdCount ?? 0}</strong>,{' '}
                обновлено <strong className="font-bold text-blue-950">{data.syncResult.summary?.updatedCount ?? 0}</strong>,{' '}
                под заказ <strong className="font-bold text-blue-950">{data.syncResult.summary?.omittedCount ?? 0}</strong>
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
              Витрина обновлена
            </span>
          </div>
        )}

        {data.syncError && (
          <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-3 text-xs shrink-0 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
              <span className="text-amber-950 font-bold">
                Файл загружен, но авто-синхронизация с Прайсом не выполнена:
              </span>
              <span className="text-amber-800 text-[11px]">
                {data.syncError}
              </span>
            </div>
            <span className="text-[11px] text-amber-900 font-semibold shrink-0">
              Синхронизируйте вручную кнопкой «В Прайс»
            </span>
          </div>
        )}

        {/* Баннер статуса синхронизации с TopFish Доставка */}
        {data.dostavkaSyncResult && (
          <div className="px-5 py-2.5 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50/50 border-b border-amber-200 flex items-center justify-between gap-3 text-xs shrink-0 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Truck className="w-3.5 h-3.5 text-white" />
              </span>
              <span className="text-amber-950 font-bold">
                Автоматически синхронизировано с Доставкой:
              </span>
              <span className="text-amber-800 text-[11px]">
                создано <strong className="font-bold text-amber-950">{data.dostavkaSyncResult.summary?.createdCount ?? 0}</strong>,{' '}
                обновлено <strong className="font-bold text-amber-950">{data.dostavkaSyncResult.summary?.updatedCount ?? 0}</strong>,{' '}
                нет в наличии <strong className="font-bold text-amber-950">{data.dostavkaSyncResult.summary?.unavailableCount ?? 0}</strong>
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
              Доставка обновлена
            </span>
          </div>
        )}

        {data.dostavkaSyncError && (
          <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 flex items-center justify-between gap-3 text-xs shrink-0 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
              <span className="text-rose-950 font-bold">
                Файл загружен, но авто-синхронизация с Доставкой не выполнена:
              </span>
              <span className="text-rose-800 text-[11px]">
                {data.dostavkaSyncError}
              </span>
            </div>
            <span className="text-[11px] text-rose-900 font-semibold shrink-0">
              Синхронизируйте вручную кнопкой «В Доставку»
            </span>
          </div>
        )}

        {data.autoSyncPrice === false && !data.syncResult && !data.syncError && !data.dostavkaSyncResult && !data.dostavkaSyncError && (
          <div className="px-5 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-3 text-xs shrink-0 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                <Zap className="w-3 h-3 text-slate-400" />
              </span>
              <span className="text-slate-700 font-medium text-[11px]">
                Авто-синхронизация была отключена. Вы можете передать данные в сервисы кнопками «В Прайс» или «В Доставку» в плане.
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600 shrink-0">
              Ручной режим
            </span>
          </div>
        )}

        {/* Быстрые карточки KPI (кликабельные) */}
        <div className={`grid gap-2.5 p-4 bg-slate-50/70 border-b border-slate-200 shrink-0 ${
          hitsList.length > 0 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
        }`}>
          {/* 🔥 Хиты (разлетелись) */}
          {hitsList.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'hits' ? 'all' : 'hits')}
              className={`text-left p-2.5 rounded-xl border transition flex flex-col justify-between ${
                activeTab === 'hits'
                  ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500/20 shadow-sm'
                  : 'bg-gradient-to-br from-white to-orange-50/50 border-orange-200 hover:border-orange-400'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[11px] font-extrabold text-orange-800 uppercase tracking-tight flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-600 fill-orange-500" />
                  Разлетелись
                </span>
                <span className="text-sm font-black text-orange-600">🔥</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-black text-orange-950">{hitsList.length}</span>
                <span className="text-[11px] text-orange-700 font-medium">хитов (0 кг)</span>
              </div>
            </button>
          )}

          {/* Дефицит / Под заказ */}
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'outOfStock' ? 'all' : 'outOfStock')}
            className={`text-left p-2.5 rounded-xl border transition flex flex-col justify-between ${
              activeTab === 'outOfStock'
                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-tight">
                Под заказ (0 кг)
              </span>
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-rose-900">{outOfStockList.length}</span>
              <span className="text-[11px] text-slate-400">позиций</span>
            </div>
          </button>

          {/* 🗑 Ушли в корзину */}
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'movedToTrash' ? 'all' : 'movedToTrash')}
            className={`text-left p-2.5 rounded-xl border transition flex flex-col justify-between ${
              activeTab === 'movedToTrash'
                ? 'bg-red-50 border-red-500 ring-2 ring-red-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-red-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-bold text-red-700 uppercase tracking-tight">
                Ушли в корзину
              </span>
              <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-red-950">{movedToTrashList.length}</span>
              <span className="text-[11px] text-slate-400">позиций</span>
            </div>
          </button>

          {/* Новинки */}
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'novelties' ? 'all' : 'novelties')}
            className={`text-left p-2.5 rounded-xl border transition flex flex-col justify-between ${
              activeTab === 'novelties'
                ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-tight">
                Новинки
              </span>
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-purple-900">{noveltiesList.length}</span>
              <span className="text-[11px] text-slate-400">позиций</span>
            </div>
          </button>

          {/* Изменение цен */}
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'priceChanges' ? 'all' : 'priceChanges')}
            className={`text-left p-2.5 rounded-xl border transition flex flex-col justify-between ${
              activeTab === 'priceChanges'
                ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-tight">
                Цены
              </span>
              <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-blue-900">{priceChangesList.length}</span>
              <span className="text-[11px] text-slate-400">изменилось</span>
            </div>
          </button>

          {/* Появились в наличии */}
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'backInStock' ? 'all' : 'backInStock')}
            className={`text-left p-2.5 rounded-xl border transition flex flex-col justify-between ${
              activeTab === 'backInStock'
                ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-tight">
                В наличии
              </span>
              <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-emerald-900">{backInStockList.length}</span>
              <span className="text-[11px] text-slate-400">появились</span>
            </div>
          </button>
        </div>

        {/* Панель вкладок и поиска */}
        <div className="p-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0">
          {/* Вкладки */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Все изменения</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {totalChangesCount}
              </span>
            </button>

            {hitsList.length > 0 && (
              <button
                onClick={() => setActiveTab('hits')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeTab === 'hits'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-sm'
                    : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
                }`}
              >
                <span>🔥 Разлетелось</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'hits' ? 'bg-orange-900 text-white' : 'bg-orange-200 text-orange-900'
                }`}>
                  {hitsList.length}
                </span>
              </button>
            )}

            {outOfStockList.length > 0 && (
              <button
                onClick={() => setActiveTab('outOfStock')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeTab === 'outOfStock'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                <span>Под заказ</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'outOfStock' ? 'bg-rose-800 text-white' : 'bg-rose-200 text-rose-800'
                }`}>
                  {outOfStockList.length}
                </span>
              </button>
            )}

            {movedToTrashList.length > 0 && (
              <button
                onClick={() => setActiveTab('movedToTrash')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeTab === 'movedToTrash'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                <span>Ушли в корзину</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'movedToTrash' ? 'bg-red-800 text-white' : 'bg-red-200 text-red-800'
                }`}>
                  {movedToTrashList.length}
                </span>
              </button>
            )}

            {noveltiesList.length > 0 && (
              <button
                onClick={() => setActiveTab('novelties')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeTab === 'novelties'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                <span>Новинки</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'novelties' ? 'bg-purple-800 text-white' : 'bg-purple-200 text-purple-800'
                }`}>
                  {noveltiesList.length}
                </span>
              </button>
            )}

            {priceChangesList.length > 0 && (
              <button
                onClick={() => setActiveTab('priceChanges')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeTab === 'priceChanges'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                <span>Цены</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'priceChanges' ? 'bg-blue-800 text-white' : 'bg-blue-200 text-blue-800'
                }`}>
                  {priceChangesList.length}
                </span>
              </button>
            )}

            {backInStockList.length > 0 && (
              <button
                onClick={() => setActiveTab('backInStock')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeTab === 'backInStock'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <span>В наличии</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'backInStock' ? 'bg-emerald-800 text-white' : 'bg-emerald-200 text-emerald-800'
                }`}>
                  {backInStockList.length}
                </span>
              </button>
            )}

            {stockChangesList.length > 0 && (
              <button
                onClick={() => setActiveTab('stockChanges')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeTab === 'stockChanges'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Остатки</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'stockChanges' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {stockChangesList.length}
                </span>
              </button>
            )}

            {addedToWeekList.length > 0 && (
              <button
                onClick={() => setActiveTab('addedToWeek')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeTab === 'addedToWeek'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                }`}
              >
                <span>Добавлено</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'addedToWeek' ? 'bg-teal-900 text-white' : 'bg-teal-200 text-teal-800'
                }`}>
                  {addedToWeekList.length}
                </span>
              </button>
            )}
          </div>

          {/* Строка поиска */}
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Список изменений со скроллом */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/40">
          {totalChangesCount === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">
                Все позиции актуальны
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                Файл 1С успешно прочитан. Все цены, остатки и статусы новинок полностью соответствуют текущему состоянию чеклиста.
              </p>
            </div>
          ) : displayedTotalCount === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">Ничего не найдено</p>
              <p className="text-xs text-slate-400 mt-1">
                По запросу «{searchQuery}» изменений в этой вкладке не найдено.
              </p>
            </div>
          ) : (
            <>
              {/* Секция: 🔥 Разлетелись на прошлой неделе (Хиты) */}
              {(activeTab === 'all' || activeTab === 'hits') &&
                filteredHits.length > 0 && (
                  <div className="bg-white rounded-xl border border-orange-200 overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent px-4 py-2.5 border-b border-orange-100 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🔥</span>
                        <span className="font-bold text-orange-950 text-xs">
                          Хиты: производились на прошлой неделе и были полностью раскуплены
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-800">
                          {filteredHits.length} поз.
                        </span>
                      </div>
                    </div>
                    <div className="divide-y divide-orange-100/60">
                      {filteredHits.map((item, idx) => (
                        <div key={idx} className="p-3 hover:bg-orange-50/40 flex items-center justify-between text-xs gap-3">
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{item.name}</span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-orange-100 text-orange-800 border border-orange-200">
                                🔥 Разлетелось
                              </span>
                            </div>
                            {item.category && (
                              <span className="text-[11px] text-slate-400">{item.category}</span>
                            )}
                            {item.reason && (
                              <p className="text-[11px] text-orange-700 mt-0.5 font-medium">{item.reason}</p>
                            )}
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <span className="inline-block px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-200">
                              Остаток: 0 кг
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Секция: Под заказ / 0 кг */}
              {(activeTab === 'all' || activeTab === 'outOfStock') &&
                filteredOutOfStock.length > 0 && (
                  <div className="bg-white rounded-xl border border-rose-200 overflow-hidden shadow-sm">
                    <div className="px-4 py-2.5 bg-rose-50/80 border-b border-rose-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span className="font-bold text-xs text-rose-900 uppercase tracking-tight">
                          Ушли в дефицит (Под заказ, 0 кг)
                        </span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                        {filteredOutOfStock.length} поз.
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {filteredOutOfStock.map((item, idx) => (
                        <div
                          key={`oos-${idx}`}
                          className="p-3 sm:px-4 hover:bg-rose-50/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm">
                                {item.name}
                              </span>
                              {item.category && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {item.category}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span className="text-rose-700 font-medium">
                                Причина: {item.reason || 'Остаток 0 кг'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
                            {item.oldStock !== null && item.oldStock !== undefined && item.oldStock > 0 ? (
                              <span className="text-slate-400 line-through">
                                {formatKg(item.oldStock)}
                              </span>
                            ) : null}
                            <ArrowRight className="w-3.5 h-3.5 text-rose-400" />
                            <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold border border-rose-200">
                              0.0 кг (Под заказ)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Секция: Новинки */}
              {(activeTab === 'all' || activeTab === 'novelties') &&
                filteredNovelties.length > 0 && (
                  <div className="bg-white rounded-xl border border-purple-200 overflow-hidden shadow-sm">
                    <div className="px-4 py-2.5 bg-purple-50/80 border-b border-purple-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span className="font-bold text-xs text-purple-900 uppercase tracking-tight">
                          Выявленные новинки ассортимента
                        </span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-800">
                        {filteredNovelties.length} поз.
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {filteredNovelties.map((item, idx) => (
                        <div
                          key={`nov-${idx}`}
                          className="p-3 sm:px-4 hover:bg-purple-50/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm">
                                {item.name}
                              </span>
                              {item.category && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                                  {item.category}
                                </span>
                              )}
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-purple-600 text-white">
                                НОВИНКА
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span className="text-purple-700 font-medium">
                                {item.reason || 'Впервые в ассортименте'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs shrink-0">
                            {item.price !== null && item.price !== undefined && (
                              <span className="font-bold text-slate-700">
                                {formatPrice(item.price)}
                              </span>
                            )}
                            <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 font-bold border border-purple-200">
                              Остаток: {formatKg(item.stockKg)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Секция: Ушли в корзину */}
              {(activeTab === 'all' || activeTab === 'movedToTrash') &&
                filteredMovedToTrash.length > 0 && (
                  <div className="bg-white rounded-xl border border-red-200 overflow-hidden shadow-sm">
                    <div className="px-4 py-2.5 bg-red-50/80 border-b border-red-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-red-600" />
                        <span className="font-bold text-xs text-red-900 uppercase tracking-tight">
                          Ушли в корзину (отсутствуют в новом файле 1С)
                        </span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-200 text-red-800">
                        {filteredMovedToTrash.length} поз.
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {filteredMovedToTrash.map((item, idx) => (
                        <div
                          key={`trash-${idx}`}
                          className="p-3 sm:px-4 hover:bg-red-50/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm">
                                {item.name}
                              </span>
                              {item.category && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {item.category}
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-100 text-red-800 border border-red-200">
                                В корзине
                              </span>
                            </div>
                            {item.reason && (
                              <p className="text-[11px] text-red-600 mt-0.5 font-medium">
                                {item.reason}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
                            {item.oldStock !== undefined && item.oldStock !== null && (
                              <span className="text-slate-400">
                                Было: {formatKg(item.oldStock)}
                              </span>
                            )}
                            <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-800 font-bold border border-red-200">
                              Остаток: 0 кг
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Секция: Изменение цен */}
              {(activeTab === 'all' || activeTab === 'priceChanges') &&
                filteredPriceChanges.length > 0 && (
                  <div className="bg-white rounded-xl border border-blue-200 overflow-hidden shadow-sm">
                    <div className="px-4 py-2.5 bg-blue-50/80 border-b border-blue-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <span className="font-bold text-xs text-blue-900 uppercase tracking-tight">
                          Изменение оптовой цены
                        </span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-200 text-blue-800">
                        {filteredPriceChanges.length} поз.
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {filteredPriceChanges.map((item, idx) => {
                        const isUp = item.diff && item.diff > 0;
                        const isDown = item.diff && item.diff < 0;
                        return (
                          <div
                            key={`price-${idx}`}
                            className="p-3 sm:px-4 hover:bg-blue-50/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 text-sm">
                                  {item.name}
                                </span>
                                {item.category && (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
                              {item.oldPrice !== null && item.oldPrice !== undefined ? (
                                <span className="text-slate-400 line-through">
                                  {formatPrice(item.oldPrice)}
                                </span>
                              ) : (
                                <span className="text-slate-400">Без цены</span>
                              )}
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-black text-slate-900">
                                {formatPrice(item.newPrice)}
                              </span>
                              {item.diff !== null && item.diff !== undefined ? (
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-extrabold flex items-center gap-0.5 ${
                                    isUp
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {isUp ? '+' : ''}
                                  {Math.round(item.diff)} ₽
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                  Установлена
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Секция: Появились в наличии */}
              {(activeTab === 'all' || activeTab === 'backInStock') &&
                filteredBackInStock.length > 0 && (
                  <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden shadow-sm">
                    <div className="px-4 py-2.5 bg-emerald-50/80 border-b border-emerald-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PackageCheck className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-xs text-emerald-900 uppercase tracking-tight">
                          Снова появились в наличии (было 0 кг)
                        </span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                        {filteredBackInStock.length} поз.
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {filteredBackInStock.map((item, idx) => (
                        <div
                          key={`bis-${idx}`}
                          className="p-3 sm:px-4 hover:bg-emerald-50/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm">
                                {item.name}
                              </span>
                              {item.category && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {item.category}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
                            <span className="text-slate-400 line-through">0.0 кг</span>
                            <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                              {formatKg(item.newStock)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Секция: Изменение остатков (приход/расход) */}
              {(activeTab === 'all' || activeTab === 'stockChanges') &&
                filteredStockChanges.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-slate-600" />
                        <span className="font-bold text-xs text-slate-800 uppercase tracking-tight">
                          Колебания остатков склада
                        </span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {filteredStockChanges.length} поз.
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {filteredStockChanges.map((item, idx) => {
                        const isPlus = item.diff > 0;
                        return (
                          <div
                            key={`stock-${idx}`}
                            className="p-3 sm:px-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-900 text-sm">
                                  {item.name}
                                </span>
                                {item.category && (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
                              <span className="text-slate-400">
                                {formatKg(item.oldStock)}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-bold text-slate-800">
                                {formatKg(item.newStock)}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  isPlus
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {isPlus ? '+' : ''}
                                {formatKg(item.diff)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Секция: Добавлено в план недели */}
              {(activeTab === 'all' || activeTab === 'addedToWeek') &&
                filteredAddedToWeek.length > 0 && (
                  <div className="bg-white rounded-xl border border-teal-200 overflow-hidden shadow-sm">
                    <div className="px-4 py-2.5 bg-teal-50/80 border-b border-teal-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PlusCircle className="w-4 h-4 text-teal-600" />
                        <span className="font-bold text-xs text-teal-900 uppercase tracking-tight">
                          Новые позиции в текущей неделе
                        </span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-200 text-teal-800">
                        {filteredAddedToWeek.length} поз.
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {filteredAddedToWeek.map((item, idx) => (
                        <div
                          key={`added-${idx}`}
                          className="p-3 sm:px-4 hover:bg-teal-50/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm">
                                {item.name}
                              </span>
                              {item.category && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {item.category}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs shrink-0">
                            {item.price !== null && item.price !== undefined && (
                              <span className="font-bold text-slate-700">
                                {formatPrice(item.price)}
                              </span>
                            )}
                            <span className="px-2.5 py-1 rounded-lg bg-teal-100 text-teal-800 font-bold border border-teal-200">
                              Остаток: {formatKg(item.stockKg)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </>
          )}
        </div>

        {/* Нижний футер с подтверждением */}
        <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {displayedTotalCount > 0 ? (
              <span>
                Показано <strong>{displayedTotalCount}</strong> изменений. Вы всегда можете пересмотреть чеклист на главной странице.
              </span>
            ) : (
              <span>Изменения успешно применены к базе данных.</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-md shadow-teal-600/25 transition flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Понятно, перейти к чеклисту</span>
          </button>
        </div>
      </div>
    </div>
  );
}
