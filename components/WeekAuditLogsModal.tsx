'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  X,
  History,
  RefreshCw,
  Search,
  CheckCircle2,
  Calendar,
  ClipboardCheck,
  Shield,
  Clock,
  User,
} from 'lucide-react';

export interface WeekAuditLog {
  id: string;
  userName: string;
  userRole?: string | null;
  action: string;
  details: string;
  createdAt: string;
}

interface WeekAuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekId: string;
  weekNumber: number;
  year: number;
  initialLogs?: WeekAuditLog[];
}

export default function WeekAuditLogsModal({
  isOpen,
  onClose,
  weekId,
  weekNumber,
  year,
  initialLogs = [],
}: WeekAuditLogsModalProps) {
  const [logs, setLogs] = useState<WeekAuditLog[]>(initialLogs);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    if (!weekId) return;
    try {
      setIsLoading(true);
      const res = await api.get(`/api/weeks/${weekId}/logs`);
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to load week logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialLogs && initialLogs.length > 0) {
        setLogs(initialLogs);
      }
      fetchLogs();
    }
  }, [isOpen, weekId]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(
    (l) =>
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.userName.toLowerCase().includes(search.toLowerCase()) ||
      (l.userRole && l.userRole.toLowerCase().includes(search.toLowerCase()))
  );

  const formatTimestamp = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'ARCHIVE_RESULT_UPDATED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <ClipboardCheck className="w-3 h-3 text-amber-600" />
            <span>Правка архива</span>
          </span>
        );
      case 'WEEK_CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <Calendar className="w-3 h-3 text-purple-600" />
            <span>Закрытие недели</span>
          </span>
        );
      case 'PLAN_CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>План утвержден</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <History className="w-3 h-3 text-slate-500" />
            <span>Действие</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Шапка модалки */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center text-teal-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">
                  Журнал изменений • Неделя №{weekNumber} ({year})
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-bold">
                  {logs.length} {logs.length === 1 ? 'запись' : logs.length < 5 ? 'записи' : 'записей'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                История подведения итогов и всех изменений чеклиста в архиве
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Панель поиска и обновления */}
        <div className="p-3 sm:px-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по сотруднику или названию позиции..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
            />
          </div>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={isLoading}
            title="Обновить журнал изменений"
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>

        {/* Список логов */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {isLoading && logs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Загрузка истории действий...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              {search ? 'По вашему запросу ничего не найдено' : 'В этой неделе пока нет записей в журнале'}
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getActionBadge(log.action)}
                    <span className="font-bold text-slate-800 text-xs">
                      {log.userName}
                    </span>
                    {log.userRole && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-teal-100 text-teal-800 font-semibold border border-teal-200/60">
                        {log.userRole}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{formatTimestamp(log.createdAt)}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 pl-1 leading-relaxed border-l-2 border-slate-200 ml-1 pl-2">
                  {log.details}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Футер */}
        <div className="p-3 sm:px-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
          <span>Всего записей: {logs.length}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
