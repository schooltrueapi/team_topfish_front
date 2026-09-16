'use client';

import React, { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface PlannedItem {
  id: string;
  productName: string;
  category?: string | null;
  stockKg?: number;
  isNew?: boolean;
}

interface ReviewModalProps {
  reviewWeek: {
    id: string;
    weekNumber: number;
    year: number;
    plannedItems: PlannedItem[];
  };
  onReviewConfirmed: () => void;
}

export default function ReviewModal({
  reviewWeek,
  onReviewConfirmed,
}: ReviewModalProps) {
  const items = reviewWeek.plannedItems || [];

  // Состояние результатов по каждому ID: { [id]: { status: string, comment: string } }
  const [outcomes, setOutcomes] = useState<
    Record<string, { status: string; comment: string }>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSetStatus = (id: string, status: string) => {
    setOutcomes((prev) => ({
      ...prev,
      [id]: {
        status,
        comment: prev[id]?.comment || '',
      },
    }));
  };

  const handleSetComment = (id: string, comment: string) => {
    setOutcomes((prev) => ({
      ...prev,
      [id]: {
        status: prev[id]?.status || 'OTHER',
        comment,
      },
    }));
  };

  // Проверяем, сколько позиций уже заполнено
  const filledCount = items.filter((it) => {
    const out = outcomes[it.id];
    if (!out || !out.status) return false;
    if (out.status === 'OTHER' && !out.comment.trim()) return false;
    return true;
  }).length;

  const isAllFilled = filledCount === items.length && items.length > 0;

  const handleSubmit = async () => {
    if (!isAllFilled) {
      toast.error('Пожалуйста, укажите результат по всем запланированным позициям!');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        weekId: reviewWeek.id,
        items: items.map((it) => ({
          id: it.id,
          resultStatus: outcomes[it.id].status,
          reasonComment: outcomes[it.id].comment,
        })),
      };

      const res = await api.post('/api/weeks/review', payload);
      toast.success(res.data.message || 'Итоги недели успешно сохранены!');
      onReviewConfirmed();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка сохранения итогов');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Шапка модалки (Блокирующая) */}
        <div className="p-6 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-2xl shadow-inner">
              ⚠️
            </div>
            <div>
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/20 text-white inline-block mb-1">
                Контроль цеха • Понедельник
              </span>
              <h2 className="text-2xl font-black tracking-tight">
                Давайте подведем итоги прошедшей недели!
              </h2>
              <p className="text-amber-100 text-xs sm:text-sm mt-0.5">
                Неделя №{reviewWeek.weekNumber} ({reviewWeek.year} год). Укажите факт по каждой запланированной позиции, чтобы открыть новую неделю.
              </p>
            </div>
          </div>

          {/* Прогресс-бар заполнения */}
          <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-semibold">
            <span>
              Заполнено: {filledCount} из {items.length} позиций
            </span>
            <span>{Math.round((filledCount / (items.length || 1)) * 100)}%</span>
          </div>
          <div className="w-full bg-white/20 h-2 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-white h-full transition-all duration-300 rounded-full"
              style={{
                width: `${(filledCount / (items.length || 1)) * 100}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Список запланированных позиций */}
        <div className="p-6 overflow-y-auto flex-1 divide-y divide-slate-100 space-y-4">
          {items.map((item, index) => {
            const currentOutcome = outcomes[item.id] || { status: '', comment: '' };
            const status = currentOutcome.status;

            return (
              <div key={item.id} className="pt-4 first:pt-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 w-5">
                      #{index + 1}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 text-base">
                        {item.productName}
                      </span>
                      {item.category && (
                        <span className="text-xs text-slate-500 ml-2">
                          ({item.category})
                        </span>
                      )}
                    </div>
                    {item.isNew && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        НОВИНКА
                      </span>
                    )}
                  </div>
                </div>

                {/* 4 кнопки выбора статуса */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Кнопка 1: Готово */}
                  <button
                    type="button"
                    onClick={() => handleSetStatus(item.id, 'COMPLETED')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      status === 'COMPLETED'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Готово</span>
                  </button>

                  {/* Кнопка 2: Забыли произвести */}
                  <button
                    type="button"
                    onClick={() => handleSetStatus(item.id, 'FORGOTTEN')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      status === 'FORGOTTEN'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400 hover:bg-amber-50/50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Забыли произвести</span>
                  </button>

                  {/* Кнопка 3: Не хватило сырья */}
                  <button
                    type="button"
                    onClick={() => handleSetStatus(item.id, 'NO_RAW_MATERIAL')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      status === 'NO_RAW_MATERIAL'
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-red-400 hover:bg-red-50/50'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Не хватило сырья</span>
                  </button>

                  {/* Кнопка 4: Другая причина */}
                  <button
                    type="button"
                    onClick={() => handleSetStatus(item.id, 'OTHER')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      status === 'OTHER'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Другая причина</span>
                  </button>
                </div>

                {/* Поле комментария, если выбрана другая причина */}
                {status === 'OTHER' && (
                  <div className="mt-2.5">
                    <input
                      type="text"
                      value={currentOutcome.comment}
                      onChange={(e) => handleSetComment(item.id, e.target.value)}
                      placeholder="Укажите причину (например: поломка автоклава, брак партии)..."
                      className="w-full px-3 py-2 text-xs border border-blue-300 rounded-lg bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Футер модалки с блокирующей кнопкой */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            {!isAllFilled ? (
              <span className="text-amber-700 font-semibold flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Осталось заполнить: {items.length - filledCount} позиций
              </span>
            ) : (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Все позиции заполнены! Можно закрывать неделю.
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!isAllFilled || isSubmitting}
            onClick={handleSubmit}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
          >
            {isSubmitting ? (
              <span>Сохранение итогов...</span>
            ) : (
              <>
                <span>Подтвердить итоги недели</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
