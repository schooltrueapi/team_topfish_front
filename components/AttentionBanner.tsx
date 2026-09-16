'use client';

import React from 'react';
import { Sparkles, AlertTriangle, CheckSquare, Layers, Flame, Clock } from 'lucide-react';

interface AttentionBannerProps {
  totalItems: number;
  plannedCount: number;
  noveltiesCount: number;
  outOfStockCount: number;
  hitsCount?: number;
  longTimeCount?: number;
  unfinishedCount?: number;
  currentFilter: string;
  onFilterChange: (filter: string) => void;
}

export default function AttentionBanner({
  totalItems,
  plannedCount,
  noveltiesCount,
  outOfStockCount,
  hitsCount = 0,
  longTimeCount = 0,
  unfinishedCount = 0,
  currentFilter,
  onFilterChange,
}: AttentionBannerProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 mb-6">
      {/* Карточка 1: В плане на неделю */}
      <div
        onClick={() => onFilterChange(currentFilter === 'planned' ? 'all' : 'planned')}
        className={`cursor-pointer rounded-xl p-4 border transition shadow-sm select-none ${
          currentFilter === 'planned'
            ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20'
            : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-md'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            В плане на неделю
          </span>
          <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
            <CheckSquare className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900">{plannedCount}</span>
          <span className="text-xs text-slate-400 font-medium">из {totalItems} позиций</span>
        </div>
        <div className="mt-2 text-[11px] text-teal-700 font-medium">
          {plannedCount > 0 ? 'Показать позиции плана →' : 'Отметьте галочками товары ниже'}
        </div>
      </div>

      {/* Карточка 2: 🔥 Хиты (Разлетелись на прошлой неделе) */}
      <div
        onClick={() => onFilterChange(currentFilter === 'hits' ? 'all' : 'hits')}
        className={`cursor-pointer rounded-xl p-4 border transition shadow-sm select-none ${
          currentFilter === 'hits'
            ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500/20'
            : hitsCount > 0
            ? 'bg-gradient-to-br from-white to-orange-50/50 border-orange-200 hover:border-orange-400 hover:shadow-md'
            : 'bg-white border-slate-200 hover:border-orange-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-800 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-600 fill-orange-500" />
            Хиты: разлетелись
          </span>
          <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center text-sm font-black">
            🔥
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-orange-950">{hitsCount}</span>
          <span className="text-xs text-orange-700 font-medium">раскупили в 0 кг!</span>
        </div>
        <div className="mt-2 text-[11px] text-orange-800 font-semibold">
          {currentFilter === 'hits' ? 'Фильтр активен (показаны хиты)' : 'Повторить в новом плане →'}
        </div>
      </div>

      {/* Карточка 3: ⏳ Давно не делали (Забытые позиции) */}
      <div
        onClick={() => onFilterChange(currentFilter === 'longTime' ? 'all' : 'longTime')}
        className={`cursor-pointer rounded-xl p-4 border transition shadow-sm select-none ${
          currentFilter === 'longTime'
            ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
            : longTimeCount > 0
            ? 'bg-gradient-to-br from-white to-amber-50/40 border-amber-200 hover:border-amber-400 hover:shadow-md'
            : 'bg-white border-slate-200 hover:border-amber-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Давно не делали
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-sm">
            ⏳
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-amber-950">{longTimeCount}</span>
          <span className="text-xs text-amber-700 font-medium">забытых позиций</span>
        </div>
        <div className="mt-2 text-[11px] text-amber-800 font-semibold">
          {currentFilter === 'longTime' ? 'Фильтр активен (показан простой)' : 'Показать забытые позиции →'}
        </div>
      </div>

      {/* Карточка 4: Новинки (Фокус внимания!) */}
      <div
        onClick={() => onFilterChange(currentFilter === 'novelties' ? 'all' : 'novelties')}
        className={`cursor-pointer rounded-xl p-4 border transition shadow-sm select-none ${
          currentFilter === 'novelties'
            ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20'
            : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-md'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 font-bold">
            🚀 Новинки прайса
          </span>
          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-purple-900">{noveltiesCount}</span>
          <span className="text-xs text-purple-600 font-medium">новых товаров</span>
        </div>
        <div className="mt-2 text-[11px] text-purple-700 font-medium">
          {currentFilter === 'novelties' ? 'Фильтр активен (только новинки)' : 'Показать только новинки →'}
        </div>
      </div>

      {/* Карточка 5: Дефицит (0 кг) */}
      <div
        onClick={() => onFilterChange(currentFilter === 'outOfStock' ? 'all' : 'outOfStock')}
        className={`cursor-pointer rounded-xl p-4 border transition shadow-sm select-none ${
          currentFilter === 'outOfStock'
            ? 'bg-slate-100 border-slate-500 ring-2 ring-slate-500/20'
            : 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-md'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 font-bold">
            ⚠️ Дефицит (0 кг)
          </span>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-slate-500" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900">{outOfStockCount}</span>
          <span className="text-xs text-slate-500 font-medium">под заказ</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-600 font-medium">
          {currentFilter === 'outOfStock' ? 'Фильтр активен (показан дефицит)' : 'Показать товары под заказ →'}
        </div>
      </div>
    </div>
  );
}
