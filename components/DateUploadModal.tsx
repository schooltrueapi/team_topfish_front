'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  History,
} from 'lucide-react';
import { extractDateFromFileName, getISOWeekInfo } from '@/lib/dateUtils';

interface DateUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (uploadResult?: any) => void;
  initialDate?: string | Date;
  initialWeekId?: string;
}

interface AnomalyWarning {
  type: string;
  title: string;
  message: string;
  stats?: any;
}

interface PendingConfirmation {
  requiresConfirmation: boolean;
  warnings: AnomalyWarning[];
  fileName?: string;
  parsedCount?: number;
  stats?: any;
}

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function toDateInputString(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toTimeInputString(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export default function DateUploadModal({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  initialWeekId,
}: DateUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [clearExisting, setClearExisting] = useState(false);

  // Дата и время выгрузки
  const [dateStr, setDateStr] = useState<string>(() => {
    if (initialDate) return toDateInputString(new Date(initialDate));
    return toDateInputString(new Date());
  });
  const [timeStr, setTimeStr] = useState<string>(() => {
    if (initialDate) return toTimeInputString(new Date(initialDate));
    return toTimeInputString(new Date());
  });

  const [autoDetected, setAutoDetected] = useState<{
    detected: boolean;
    date: Date | null;
  }>({ detected: false, date: null });

  const [autoSyncPrice, setAutoSyncPrice] = useState<boolean>(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

  useEffect(() => {
    if (initialDate) {
      const d = new Date(initialDate);
      if (!isNaN(d.getTime())) {
        setDateStr(toDateInputString(d));
        setTimeStr(toTimeInputString(d));
      }
    }
  }, [initialDate]);

  // Вычисляем целевую дату и соответствующую неделю
  const currentTargetDate = useMemo(() => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = (timeStr || '12:00').split(':').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, hh || 12, mm || 0);
  }, [dateStr, timeStr]);

  const weekInfo = useMemo(() => {
    return getISOWeekInfo(currentTargetDate);
  }, [currentTargetDate]);

  // Проверяем, является ли выбранная дата исторической (более 2 часов в прошлом)
  const isPastDate = useMemo(() => {
    const now = new Date();
    return currentTargetDate.getTime() < now.getTime() - 2 * 60 * 60 * 1000;
  }, [currentTargetDate]);

  if (!isOpen) return null;

  const handleClose = () => {
    setPendingConfirmation(null);
    setFile(null);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const ext = selected.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      toast.error('Поддерживаются только файлы Excel (.xlsx, .xls)');
      return;
    }

    setFile(selected);
    setPendingConfirmation(null);

    // Автоматическое распознавание даты из названия файла
    const extracted = extractDateFromFileName(selected.name);
    if (extracted) {
      setDateStr(toDateInputString(extracted));
      setTimeStr(toTimeInputString(extracted));
      setAutoDetected({ detected: true, date: extracted });
      // Для исторических файлов витринную авто-синхронизацию отключаем
      const isHistorical = extracted.getTime() < new Date().getTime() - 2 * 60 * 60 * 1000;
      setAutoSyncPrice(!isHistorical);
    } else {
      setAutoDetected({ detected: false, date: null });
    }
  };

  const handleUpload = async (force = false) => {
    if (!file) {
      toast.error('Выберите файл Excel для загрузки');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);
      formData.append('customDate', currentTargetDate.toISOString());
      if (initialWeekId) {
        formData.append('weekId', initialWeekId);
      }
      formData.append('clearExisting', String(clearExisting));
      formData.append('autoSyncPrice', String(autoSyncPrice));
      if (force) {
        formData.append('forceUpload', 'true');
      }

      const res = await api.post('/api/plan/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Предупреждение «защиты от дурака»
      if (res.data.requiresConfirmation && res.data.warnings) {
        setPendingConfirmation(res.data);
        return;
      }

      setPendingConfirmation(null);

      const formattedDay = currentTargetDate.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      toast.success(
        `Файл 1С успешно загружен на ${formattedDay} (Нед. №${weekInfo.weekNumber})! Ежедневная тенденция обновлена.`
      );

      onSuccess(res.data);
      handleClose();
    } catch (err: any) {
      console.error('Date upload error:', err);
      toast.error(err.response?.data?.error || 'Ошибка загрузки файла');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {pendingConfirmation ? (
          /* Экран подтверждения аномалий («Защита от дурака») */
          <div>
            <div className="p-5 border-b border-amber-200 flex items-center justify-between bg-amber-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-950 text-base leading-tight">
                    Внимание! Обнаружены аномалии в файле 1С
                  </h3>
                  <p className="text-xs text-amber-800/80 mt-0.5 truncate max-w-xs sm:max-w-sm">
                    {file?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-amber-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2.5">
                {pendingConfirmation.warnings.map((warn, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/70 text-xs space-y-1"
                  >
                    <p className="font-bold text-amber-900 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 inline-block shrink-0" />
                      {warn.title}
                    </p>
                    <p className="text-amber-800 leading-relaxed text-[11px] pl-3">
                      {warn.message}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPendingConfirmation(null)}
                  disabled={isUploading}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition border border-slate-200 cursor-pointer"
                >
                  Отменить
                </button>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => handleUpload(true)}
                  className="px-5 py-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md shadow-amber-600/20 disabled:opacity-40 transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isUploading ? 'Загрузка...' : 'Всё равно применить'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Основной экран выбора файла и даты */
          <div>
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center font-bold text-cyan-300">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base sm:text-lg">
                    Загрузка файла 1С на дату
                  </h3>
                  <p className="text-xs text-cyan-200/80">
                    Заполнение пропущенных дней и построение ежедневной динамики
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Выбор файла */}
              <div className="border-2 border-dashed border-slate-300 hover:border-cyan-500 rounded-2xl p-6 text-center bg-slate-50/70 hover:bg-cyan-50/20 transition cursor-pointer relative">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-700 mx-auto flex items-center justify-center mb-2.5">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800 truncate px-2">
                  {file ? file.name : 'Нажмите или перетащите сюда файл 1С'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Файлы номенклатуры 1С (.xlsx, .xls)
                </p>
              </div>

              {/* Авто-определение даты из имени файла */}
              {autoDetected.detected && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">Дата определена из названия файла: </span>
                    <span>
                      {currentTargetDate.toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                      , {timeStr}
                    </span>
                  </div>
                </div>
              )}

              {/* Блок выбора даты и времени */}
              <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-600" />
                    Дата и время выгрузки:
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                    Неделя №{weekInfo.weekNumber} ({weekInfo.year})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Дата файла
                    </label>
                    <input
                      type="date"
                      value={dateStr}
                      onChange={(e) => {
                        setDateStr(e.target.value);
                        setAutoDetected({ detected: false, date: null });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Время выгрузки
                    </label>
                    <input
                      type="time"
                      value={timeStr}
                      onChange={(e) => {
                        setTimeStr(e.target.value);
                        setAutoDetected({ detected: false, date: null });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Период недели: {weekInfo.monday.toLocaleDateString('ru-RU')} —{' '}
                    {weekInfo.sunday.toLocaleDateString('ru-RU')}
                  </span>
                </div>
              </div>

              {/* Уведомление об исторической загрузке */}
              {isPastDate && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                  <History className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <p className="font-bold text-amber-950">
                      Историческая загрузка (заполнение пропущенного дня)
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Файл дополнит историю остатков на указанную дату, делая ежедневный график
                      непрерывным. Синхронизация с витриной сайта по умолчанию отключена, чтобы не сбить
                      текущие складские остатки.
                    </p>
                  </div>
                </div>
              )}

              {/* Опции */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 select-none hover:text-slate-900 transition">
                  <input
                    type="checkbox"
                    checked={autoSyncPrice}
                    onChange={(e) => setAutoSyncPrice(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300 cursor-pointer"
                  />
                  <span className="font-medium">
                    Синхронизировать с витриной Прайса и Доставкой{' '}
                    {isPastDate && (
                      <span className="text-rose-600 font-semibold">(не рекомендуется для прошлых дат)</span>
                    )}
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 select-none hover:text-slate-900 transition">
                  <input
                    type="checkbox"
                    checked={clearExisting}
                    onChange={(e) => setClearExisting(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300 cursor-pointer"
                  />
                  <span className="font-medium">
                    Полная перезапись позиций недели (удалить все существующие товары недели)
                  </span>
                </label>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={!file || isUploading}
                  onClick={() => handleUpload(false)}
                  className="px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl shadow-md shadow-teal-500/25 disabled:opacity-40 transition flex items-center gap-2 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Обработка прайса...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Загрузить на выбранную дату</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

