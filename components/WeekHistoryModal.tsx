'use client';

import React from 'react';
import {
  X,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Award,
  Layers,
  CheckSquare,
} from 'lucide-react';

export interface WeekHistoryItem {
  id: string;
  year: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  status: 'PLANNING' | 'IN_PROGRESS' | 'REVIEWING' | 'CLOSED' | string;
  excelFileName?: string | null;
  totalItems: number;
  totalPlanned: number;
  completed: number;
  forgotten: number;
  noRaw: number;
  other: number;
  percentCompleted: number;
}

interface WeekHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  weeks: WeekHistoryItem[];
  currentWeekId?: string;
  selectedWeekId?: string;
  onSelectWeek: (weekId: string) => void;
}

export default function WeekHistoryModal({
  isOpen,
  onClose,
  weeks,
  currentWeekId,
  selectedWeekId,
  onSelectWeek,
}: WeekHistoryModalProps) {
  if (!isOpen) return null;

  const formatDateRange = (startStr: string, endStr: string) => {
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      const sFormatted = s.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      const eFormatted = e.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${sFormatted} — ${eFormatted}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Шапка модалки */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                Архив производственных недель
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                История планов, номенклатуры продукции и заключений понедельничного учета
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Список недель */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
          {weeks.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              В архиве пока нет сохраненных недель
            </div>
          ) : (
            weeks.map((w) => {
              const isCurrent = w.id === currentWeekId;
              const isSelected = w.id === selectedWeekId;
              const isClosed = w.status === 'CLOSED';

              return (
                <div
                  key={w.id}
                  className={`bg-white rounded-xl border p-4 sm:p-5 transition shadow-2xs hover:shadow-sm ${
                    isSelected
                      ? 'border-teal-500 ring-2 ring-teal-500/20'
                      : isCurrent
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Информация о неделе */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-black text-slate-900">
                          Неделя №{w.weekNumber} ({w.year} год)
                        </span>

                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wide">
                            Текущая неделя
                          </span>
                        )}

                        {isClosed ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-300 uppercase tracking-wide">
                            Закрыта (Учет подведен)
                          </span>
                        ) : w.status === 'IN_PROGRESS' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wide">
                            В работе
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wide">
                            Планирование
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                        <span>{formatDateRange(w.startDate, w.endDate)}</span>
                        {w.excelFileName && (
                          <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium">
                            <FileSpreadsheet className="w-3 h-3 text-slate-400" />
                            {w.excelFileName}
                          </span>
                        )}
                        <span className="text-slate-400">•</span>
                        <span>{w.totalItems} позиций в прайсе</span>
                      </div>
                    </div>

                    {/* Кнопка выбора */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
                          ✓ Открыта сейчас
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectWeek(w.id);
                            onClose();
                          }}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
                            isCurrent
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          <span>
                            {isCurrent
                              ? 'Перейти к текущей'
                              : 'Открыть план и заключение'}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Сводка плана и заключения */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    {/* Прогресс-бар выполнения плана */}
                    <div className="flex items-center gap-3 flex-1 max-w-sm">
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold shrink-0">
                        <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
                        <span>План: {w.totalPlanned} поз.</span>
                      </div>
                      {w.totalPlanned > 0 && (
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                w.percentCompleted >= 80
                                  ? 'bg-emerald-500'
                                  : w.percentCompleted >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-teal-500'
                              }`}
                              style={{ width: `${w.percentCompleted}%` }}
                            ></div>
                          </div>
                          <span className="font-extrabold text-slate-800 shrink-0">
                            {w.percentCompleted}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Фишки итогов */}
                    {isClosed && w.totalPlanned > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[11px] border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {w.completed} готово
                        </span>
                        {w.forgotten > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            {w.forgotten} забыли
                          </span>
                        )}
                        {w.noRaw > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-800 font-bold text-[11px] border border-red-200">
                            <XCircle className="w-3 h-3 text-red-600" />
                            {w.noRaw} нет сырья
                          </span>
                        )}
                        {w.other > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold text-[11px] border border-blue-200">
                            <HelpCircle className="w-3 h-3 text-blue-600" />
                            {w.other} другое
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-400 text-[11px]">
                        {isCurrent ? 'Идет текущее производство' : 'Итоги не подводились'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Футер */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Всего недель в базе: {weeks.length}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
