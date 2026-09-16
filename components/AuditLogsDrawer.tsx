'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { X, History, RefreshCw, User, CheckSquare, Upload, Calendar, Shield } from 'lucide-react';

interface AuditLog {
  id: string;
  userName: string;
  userRole?: string | null;
  action: string;
  details: string;
  createdAt: string;
}

interface AuditLogsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuditLogsDrawer({ isOpen, onClose }: AuditLogsDrawerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/api/logs?limit=150');
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

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
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CHECKBOX_TOGGLED':
      case 'BULK_CHECKBOX':
        return <CheckSquare className="w-3.5 h-3.5 text-teal-600" />;
      case 'FILE_UPLOADED':
        return <Upload className="w-3.5 h-3.5 text-blue-600" />;
      case 'WEEK_CLOSED':
      case 'WEEK_STARTED':
      case 'PLAN_CONFIRMED':
        return <Calendar className="w-3.5 h-3.5 text-amber-600" />;
      case 'ROLE_CREATED':
      case 'USER_CREATED':
        return <Shield className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <History className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/40 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Шапка дровера */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">
                История действий (Логи)
              </h3>
              <p className="text-xs text-slate-500">
                Кто и когда изменил чекбокс, план или статус
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="p-2 text-slate-500 hover:text-teal-600 hover:bg-slate-200/60 rounded-lg transition"
              title="Обновить логи"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Поиск по логам */}
        <div className="p-3 border-b border-slate-100 bg-white">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по сотруднику или названию рыбы..."
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Список записей */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Загрузка журнала аудита...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Логов пока нет или ничего не найдено
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <span className="p-1 rounded bg-white border border-slate-200 shadow-2xs">
                      {getActionIcon(log.action)}
                    </span>
                    <span>{log.userName}</span>
                    {log.userRole && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-teal-100 text-teal-800 font-semibold">
                        {log.userRole}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {formatTimestamp(log.createdAt)}
                  </span>
                </div>
                <p className="text-slate-600 text-xs pl-6 leading-relaxed">
                  {log.details}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
