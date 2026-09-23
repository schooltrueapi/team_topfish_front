'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckSquare,
  Square,
  Sparkles,
  AlertTriangle,
  Clock,
  Play,
  Search,
  ShieldAlert,
  Flame,
  Package,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { PlanItem, getLongTimeStyles } from './Checklist';

export type BulkActionType =
  | 'HITS'
  | 'NOVELTIES'
  | 'DEFICIT'
  | 'FORGOTTEN'
  | 'APPROVE_PLAN';

interface BulkPlanModalProps {
  isOpen: boolean;
  actionType: BulkActionType;
  title: string;
  description?: string;
  items: PlanItem[];
  plannedCount?: number;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: (selectedItemIds: string[]) => Promise<void> | void;
}

export default function BulkPlanModal({
  isOpen,
  actionType,
  title,
  description,
  items,
  plannedCount = 0,
  isLoading = false,
  onClose,
  onConfirm,
}: BulkPlanModalProps) {
  // Выбранные ID позиций (по умолчанию выбраны все)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(items.map((i) => i.id))
  );
  const [search, setSearch] = useState('');

  // При смене списка позиций инициализируем выбор всеми элементами
  useEffect(() => {
    setSelectedIds(new Set(items.map((i) => i.id)));
    setSearch('');
  }, [items]);

  // Закрытие по клавише Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isApprovePlan = actionType === 'APPROVE_PLAN';

  // Фильтрация позиций по поиску внутри модалки
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.productName.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q))
    );
  }, [items, search]);

  const toggleItem = (id: string) => {
    if (isLoading) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (isLoading) return;
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleConfirm = () => {
    if (isApprovePlan) {
      onConfirm([]);
    } else {
      onConfirm(Array.from(selectedIds));
    }
  };

  // Конфигурация внешнего вида по типу действия
  const themeConfig = {
    HITS: {
      gradient: 'from-orange-600 via-amber-600 to-amber-700',
      iconBadgeBg: 'bg-orange-400/20 text-orange-200 border-orange-400/30',
      icon: <Flame className="w-5 h-5 text-orange-200" />,
      tag: '🔥 Разлетевшиеся хиты',
      btnGradient:
        'bg-gradient-to-r from-orange-500 via-amber-500 to-amber-600 hover:from-orange-600 hover:via-amber-600 hover:to-amber-700 shadow-orange-500/25',
      accentColor: 'text-orange-600',
    },
    NOVELTIES: {
      gradient: 'from-purple-600 via-purple-700 to-indigo-800',
      iconBadgeBg: 'bg-purple-400/20 text-purple-200 border-purple-400/30',
      icon: <Sparkles className="w-5 h-5 text-purple-200" />,
      tag: '✨ Новинки каталога',
      btnGradient:
        'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-600/25',
      accentColor: 'text-purple-600',
    },
    DEFICIT: {
      gradient: 'from-amber-600 via-orange-600 to-amber-700',
      iconBadgeBg: 'bg-amber-400/20 text-amber-200 border-amber-400/30',
      icon: <AlertTriangle className="w-5 h-5 text-amber-200" />,
      tag: '📦 Нулевой остаток (Дефицит)',
      btnGradient:
        'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:via-orange-700 hover:to-orange-800 shadow-amber-600/25',
      accentColor: 'text-amber-700',
    },
    FORGOTTEN: {
      gradient: 'from-indigo-600 via-blue-700 to-indigo-800',
      iconBadgeBg: 'bg-indigo-400/20 text-indigo-200 border-indigo-400/30',
      icon: <Clock className="w-5 h-5 text-indigo-200" />,
      tag: '⏳ Забытые позиции',
      btnGradient:
        'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-indigo-600/25',
      accentColor: 'text-indigo-600',
    },
    APPROVE_PLAN: {
      gradient: 'from-teal-600 via-emerald-600 to-teal-700',
      iconBadgeBg: 'bg-teal-400/20 text-teal-200 border-teal-400/30',
      icon: <Play className="w-5 h-5 text-teal-200" />,
      tag: '🚀 Запуск в производство',
      btnGradient:
        'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-teal-600/25',
      accentColor: 'text-teal-700',
    },
  }[actionType];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка модального окна */}
        <div
          className={`p-4 sm:p-5 bg-gradient-to-r ${themeConfig.gradient} text-white flex items-center justify-between shrink-0 shadow-sm`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${themeConfig.iconBadgeBg}`}
            >
              {themeConfig.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight truncate">
                  {title}
                </h3>
              </div>
              <p className="text-xs text-white/80 font-medium truncate mt-0.5">
                {description || 'Подтвердите действие для чеклиста недели'}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer shrink-0 ml-2"
            title="Закрыть (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Тело модального окна */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Предупреждение / Защита от миссклика */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Защита от случайного нажатия</p>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                {isApprovePlan
                  ? 'Вы переводите неделю в производство. Убедитесь, что все необходимые позиции отмечены галочками.'
                  : 'Это окно предотвращает случайное добавление лишних товаров в план. Проверьте список позиций перед подтверждением.'}
              </p>
            </div>
          </div>

          {/* Вариант: Утверждение плана */}
          {isApprovePlan ? (
            <div className="space-y-3 py-2">
              <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 sm:p-5 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto text-xl font-bold">
                  📋
                </div>
                <h4 className="text-base font-bold text-slate-800">
                  Готовы передать план в цех?
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  В текущий план включено{' '}
                  <span className="font-extrabold text-teal-700 text-sm">
                    {plannedCount}
                  </span>{' '}
                  позиций. После утверждения неделя перейдет в статус{' '}
                  <span className="font-bold text-slate-800">
                    «В производстве»
                  </span>
                  .
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Info className="w-4 h-4 text-teal-600" />
                  <span>Что произойдет дальше:</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-1 pl-1">
                  <li>Чеклист зафиксируется для производственной бригады</li>
                  <li>Позиции будут отображаться со статусом «В работе»</li>
                  <li>После завершения производства вы сможете подвести итоги недели</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Вариант: Массовое добавление позиций */
            <div className="space-y-3">
              {/* Панель управления списком */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    {selectedIds.size === items.length ? (
                      <>
                        <Square className="w-3.5 h-3.5" />
                        <span>Снять все</span>
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Выбрать все ({items.length})</span>
                      </>
                    )}
                  </button>
                  <span className="text-xs text-slate-500 font-medium">
                    Выбрано:{' '}
                    <strong className="text-slate-800">
                      {selectedIds.size}
                    </strong>{' '}
                    из {items.length}
                  </span>
                </div>

                {items.length > 5 && (
                  <div className="relative flex-1 sm:max-w-[200px]">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Быстрый поиск..."
                      className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder:text-slate-400"
                    />
                  </div>
                )}
              </div>

              {/* Список позиций */}
              <div className="max-h-[280px] overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
                {filteredItems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    По запросу «{search}» ничего не найдено
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const isChecked = selectedIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`p-2.5 sm:px-3 flex items-center justify-between gap-2.5 transition cursor-pointer select-none ${
                          isChecked
                            ? 'bg-teal-50/40 hover:bg-teal-50/70'
                            : 'bg-white hover:bg-slate-100/70 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            className="shrink-0 text-teal-600 focus:outline-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleItem(item.id);
                            }}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-teal-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <p
                              className={`text-xs font-bold truncate leading-tight ${
                                isChecked ? 'text-slate-800' : 'text-slate-500'
                              }`}
                            >
                              {item.productName}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {item.category && (
                                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/60">
                                  {item.category}
                                </span>
                              )}
                              {item.price !== undefined && item.price !== null && (
                                <span className="text-[10px] font-semibold text-slate-600">
                                  {item.price} ₽
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Индивидуальный маркер */}
                        <div className="shrink-0 flex items-center gap-1">
                          {actionType === 'HITS' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-0.5">
                              <span>🔥</span>
                              <span>Хит (0 кг)</span>
                            </span>
                          )}

                          {actionType === 'NOVELTIES' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-0.5">
                              <span>✨</span>
                              <span>Новинка</span>
                            </span>
                          )}

                          {actionType === 'DEFICIT' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                              0 кг (Под заказ)
                            </span>
                          )}

                          {actionType === 'FORGOTTEN' && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                getLongTimeStyles(
                                  item.smartMeta?.consecutiveWeeks
                                ).badge
                              }`}
                            >
                              ⏳{' '}
                              {getLongTimeStyles(
                                item.smartMeta?.consecutiveWeeks
                              ).name}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Подвал с кнопками */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
          >
            Отмена
          </button>

          <button
            type="button"
            disabled={isLoading || (!isApprovePlan && selectedIds.size === 0)}
            onClick={handleConfirm}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${themeConfig.btnGradient}`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Сохранение...</span>
              </>
            ) : isApprovePlan ? (
              <>
                <Play className="w-4 h-4" />
                <span>Утвердить план ({plannedCount})</span>
              </>
            ) : (
              <>
                <CheckSquare className="w-4 h-4" />
                <span>Добавить в план ({selectedIds.size})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
