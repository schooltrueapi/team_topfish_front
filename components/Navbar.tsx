'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Fish, Calendar, Users, History, LogOut, UploadCloud, CheckCircle2, FileSpreadsheet, Archive, RotateCcw } from 'lucide-react';

interface NavbarProps {
  currentWeek: any;
  viewingWeek?: any;
  weeksHistory?: any[];
  onOpenUpload: () => void;
  onOpenLogs: () => void;
  onOpenRoles: () => void;
  onOpenDiff?: () => void;
  hasDiff?: boolean;
  onOpenHistory: () => void;
  onSelectWeek?: (weekId: string) => void;
  onReturnToCurrent?: () => void;
  onRevertUpload?: () => void;
}

export default function Navbar({
  currentWeek,
  viewingWeek,
  weeksHistory = [],
  onOpenUpload,
  onOpenLogs,
  onOpenRoles,
  onOpenDiff,
  hasDiff,
  onOpenHistory,
  onSelectWeek,
  onReturnToCurrent,
  onRevertUpload,
}: NavbarProps) {
  const { user, logout, hasPermission } = useAuth();
  const displayWeek = viewingWeek || currentWeek;
  const isViewingArchive = displayWeek && currentWeek && displayWeek.id !== currentWeek.id;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Бренд */}
          <div className="flex items-center gap-3 shrink-0 select-none">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20 shrink-0">
              <Fish className="w-6 h-6" />
            </div>
            <div className="shrink-0">
              <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight whitespace-nowrap">
                TopFish Control
              </span>
              <span className="text-xs text-teal-700 font-medium block whitespace-nowrap">
                Цех и производство
              </span>
            </div>
          </div>

          {/* Информация о производственной неделе */}
          {displayWeek && (
            <div className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 mx-3 lg:mx-5 bg-slate-100 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0">
              <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>Неделя №{displayWeek.weekNumber} ({displayWeek.year})</span>
              <span className="text-slate-400 mx-0.5">•</span>
              <span className="text-slate-500 font-normal">
                {formatDate(displayWeek.startDate)} — {formatDate(displayWeek.endDate)}
              </span>
              {displayWeek.status === 'IN_PROGRESS' && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                  В работе
                </span>
              )}
              {displayWeek.status === 'PLANNING' && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                  Планирование
                </span>
              )}
              {isViewingArchive && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-800 text-white text-[10px] font-bold uppercase">
                  Закрыта
                </span>
              )}
            </div>
          )}

          {/* Действия и Профиль */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Кнопка: Архив недель */}
            <button
              onClick={onOpenHistory}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer shadow-2xs ${
                isViewingArchive
                  ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
              }`}
              title="Архив производственных недель (планы, продукция, заключение)"
            >
              <Archive className="w-4 h-4 text-teal-600" />
              <span className="hidden sm:inline">Архив недель</span>
            </button>

            {hasPermission('UPLOAD_1C') && !isViewingArchive && (
              <button
                onClick={onOpenUpload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-semibold border border-teal-200 transition shadow-sm cursor-pointer"
                title="Загрузить свежий прайс 1С"
              >
                <UploadCloud className="w-4 h-4 text-teal-600" />
                <span className="hidden sm:inline">Загрузить 1С</span>
              </button>
            )}

            {hasDiff && onOpenDiff && (
              <button
                onClick={onOpenDiff}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold border border-blue-200 transition shadow-sm animate-in fade-in cursor-pointer"
                title="Посмотреть изменения последней загрузки 1С"
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">Отчет 1С</span>
              </button>
            )}

            {currentWeek?.canRevertUpload && hasPermission('UPLOAD_1C') && !isViewingArchive && onRevertUpload && (
              <button
                onClick={onRevertUpload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold border border-rose-200 transition shadow-2xs animate-in fade-in cursor-pointer"
                title={`Откатить загрузку "${currentWeek.backupInfo?.appliedFileName || '1С'}" к состоянию до файла`}
              >
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span className="hidden sm:inline">Откатить 1С</span>
              </button>
            )}

            <button
              onClick={onOpenLogs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold border border-slate-200 transition cursor-pointer"
              title="История изменений (кто что поменял)"
            >
              <History className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Логи</span>
            </button>

            {hasPermission('FULL_ACCESS') && (
              <button
                onClick={onOpenRoles}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold border border-slate-200 transition cursor-pointer"
                title="Управление ролями и сотрудниками"
              >
                <Users className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Роли</span>
              </button>
            )}

            {/* Разделитель */}
            <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

            {/* Сотрудник */}
            <div className="flex items-center gap-2 pl-1">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-800 leading-tight">
                  {user?.name}
                </div>
                <div className="text-[11px] text-teal-600 font-medium">
                  {user?.role || 'Сотрудник'}
                </div>
              </div>

              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                title="Выйти из системы"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

