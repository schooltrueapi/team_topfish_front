'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ClipboardCheck,
  Upload,
  Download,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Package,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  Trash2,
  ChevronDown,
  Building2,
  Warehouse,
  Calendar,
  Layers,
  ArrowUpDown,
  X,
  FileDown,
} from 'lucide-react';

interface InventoryItem {
  id: string;
  inventoryId: string;
  itemNumber: number;
  productName: string;
  category?: string | null;
  diffQty: number;
  factQty: number;
  accQty: number;
  unit: string;
  price: number;
  factSum: number;
  accSum: number;
  diffSum: number;
  status: 'SURPLUS' | 'SHORTAGE' | 'MATCH';
  comment?: string | null;
}

interface InventoryDocMeta {
  id: string;
  docNumber?: string | null;
  docDate?: string | null;
  title: string;
  organization?: string | null;
  warehouse?: string | null;
  currency?: string | null;
  fileName: string;
  savedFileName?: string | null;
  uploadedAt: string;
  uploadedBy?: string | null;
  totalItems: number;
  totalFactSum: number;
  totalAccSum: number;
  totalDiffSum: number;
  surplusCount: number;
  shortageCount: number;
  matchCount: number;
  surplusSum: number;
  shortageSum: number;
  items?: InventoryItem[];
}

export default function InventoryTab() {
  const [docsList, setDocsList] = useState<InventoryDocMeta[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [currentDoc, setCurrentDoc] = useState<InventoryDocMeta | null>(null);

  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);
  const [loadingDocDetail, setLoadingDocDetail] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Фильтры и поиск
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SHORTAGE' | 'SURPLUS' | 'MATCH'>('ALL');
  const [sortBy, setSortBy] = useState<'number_asc' | 'diff_sum_asc' | 'diff_sum_desc' | 'fact_sum_desc' | 'name_asc'>('number_asc');

  // Drag-and-drop стейт для модалки
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Форматирование чисел
  const formatMoney = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return '0 ₽';
    return (
      val.toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + ' ₽'
    );
  };

  const formatQty = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return val.toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Загрузка списка документов
  const fetchDocsList = async (preferredId?: string) => {
    try {
      setLoadingDocs(true);
      const res = await api.get('/api/inventory/docs');
      const list: InventoryDocMeta[] = res.data?.docs || [];
      setDocsList(list);

      if (list.length > 0) {
        const idToSelect = preferredId && list.some((d) => d.id === preferredId) ? preferredId : list[0].id;
        setSelectedDocId(idToSelect);
      } else {
        setSelectedDocId(null);
        setCurrentDoc(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка загрузки списка инвентаризаций');
    } finally {
      setLoadingDocs(false);
    }
  };

  // Загрузка деталей выбранного документа
  const fetchDocDetail = async (id: string) => {
    try {
      setLoadingDocDetail(true);
      const res = await api.get(`/api/inventory/docs/${id}`);
      setCurrentDoc(res.data?.doc || null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка загрузки данных документа');
    } finally {
      setLoadingDocDetail(false);
    }
  };

  useEffect(() => {
    fetchDocsList();
  }, []);

  useEffect(() => {
    if (selectedDocId) {
      fetchDocDetail(selectedDocId);
    }
  }, [selectedDocId]);

  // Загрузка собственного файла через input
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Пожалуйста, выберите файл Excel (.xlsx или .xls)');
      return;
    }

    try {
      setIsUploading(true);
      toast.loading('Обработка файла инвентаризации...', { id: 'file_upload' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);

      const res = await api.post('/api/inventory/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(res.data?.message || 'Инвентаризация успешно загружена!', { id: 'file_upload' });
      setIsUploadModalOpen(false);
      await fetchDocsList(res.data?.doc?.id);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка загрузки файла', { id: 'file_upload' });
    } finally {
      setIsUploading(false);
    }
  };

  // Удаление документа
  const handleDeleteDoc = async (id: string, title: string) => {
    if (!window.confirm(`Вы действительно хотите удалить инвентаризацию «${title}»?`)) {
      return;
    }

    try {
      await api.delete(`/api/inventory/docs/${id}`);
      toast.success('Инвентаризация удалена');
      fetchDocsList();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка при удалении');
    }
  };

  // Скачивание оригинального файла
  const handleDownloadFile = async (id: string, fallbackName?: string) => {
    try {
      toast.loading('Подготовка файла...', { id: 'download_file' });
      const resp = await api.get(`/api/inventory/download/${id}`, {
        responseType: 'blob',
      });

      const blob = new Blob([resp.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');

      let dlName = fallbackName || 'Инвентаризация.xlsx';
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
      }

      link.href = blobUrl;
      link.download = dlName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      toast.success('Файл успешно скачан', { id: 'download_file' });
    } catch (err: any) {
      console.error('Download error:', err);
      toast.error('Не удалось скачать файл', { id: 'download_file' });
    }
  };

  // Фильтрация и сортировка позиций на клиенте
  const filteredItems = useMemo(() => {
    if (!currentDoc?.items) return [];

    let list = [...currentDoc.items];

    // Поиск
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((it) => it.productName.toLowerCase().includes(q));
    }

    // Статус
    if (statusFilter !== 'ALL') {
      list = list.filter((it) => it.status === statusFilter);
    }

    // Сортировка
    if (sortBy === 'diff_sum_asc') {
      // Наибольшая недостача первой
      list.sort((a, b) => a.diffSum - b.diffSum);
    } else if (sortBy === 'diff_sum_desc') {
      // Наибольший излишек первым
      list.sort((a, b) => b.diffSum - a.diffSum);
    } else if (sortBy === 'fact_sum_desc') {
      list.sort((a, b) => b.factSum - a.factSum);
    } else if (sortBy === 'name_asc') {
      list.sort((a, b) => a.productName.localeCompare(b.productName, 'ru'));
    } else {
      list.sort((a, b) => a.itemNumber - b.itemNumber);
    }

    return list;
  }, [currentDoc?.items, searchQuery, statusFilter, sortBy]);

  return (
    <div className='space-y-6'>
      {/* ─── Верхняя плашка управления ────────────────────────────────────────── */}
      <div className='bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/40 relative overflow-hidden'>
        <div className='absolute -right-12 -top-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none'></div>
        <div className='absolute -left-12 -bottom-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none'></div>

        <div className='relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6'>
          <div>
            <div className='flex items-center gap-2.5 mb-2'>
              <div className='w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center font-bold shadow-inner'>
                <ClipboardCheck className='w-5 h-5' />
              </div>
              <span className='px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-teal-500/10 text-teal-300 border border-teal-500/20'>
                Складской учет & Сверка
              </span>
            </div>
            <h1 className='text-2xl sm:text-3xl font-black text-white tracking-tight'>
              Инвентаризация запасов
            </h1>
            <p className='text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl font-normal leading-relaxed'>
              Загрузка ведомостей инвентаризации 1С, сопоставление фактических остатков склада с данными бухучета, оперативный расчет недостач и излишков.
            </p>
          </div>

          <div className='flex items-center gap-3 flex-wrap'>
            {/* Кнопка загрузки файла */}
            <button
              type='button'
              onClick={() => setIsUploadModalOpen(true)}
              disabled={isUploading}
              className='px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-lg shadow-teal-900/30 hover:shadow-teal-500/30 disabled:opacity-50 cursor-pointer'
            >
              <Upload className='w-4 h-4' />
              <span>Загрузить Excel 1С</span>
            </button>

            {/* Кнопка обновления */}
            <button
              type='button'
              onClick={() => selectedDocId && fetchDocDetail(selectedDocId)}
              className='p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition cursor-pointer'
              title='Обновить данные'
            >
              <RefreshCw className={`w-4 h-4 ${loadingDocDetail ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Переключатель загруженных документов (если их больше одного) */}
        {docsList.length > 0 && (
          <div className='mt-6 pt-5 border-t border-white/10 flex items-center justify-between flex-wrap gap-4'>
            <div className='flex items-center gap-2 text-xs text-slate-300'>
              <FileSpreadsheet className='w-4 h-4 text-teal-400' />
              <span className='font-semibold'>Выбранный документ:</span>
              <div className='relative inline-block'>
                <select
                  value={selectedDocId || ''}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className='bg-slate-800/90 text-white font-bold text-xs rounded-xl px-3 py-1.5 border border-white/20 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer'
                >
                  {docsList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.docNumber ? `№ ${d.docNumber}` : ''} ({formatDate(d.docDate)}) — {d.warehouse || d.title} ({d.totalItems} поз.)
                    </option>
                  ))}
                </select>
                <ChevronDown className='w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none' />
              </div>
            </div>

            {currentDoc && (
              <div className='flex items-center gap-3 text-xs'>
                <button
                  type='button'
                  onClick={() => handleDownloadFile(currentDoc.id, currentDoc.fileName)}
                  className='text-teal-300 hover:text-teal-200 font-medium flex items-center gap-1.5 transition cursor-pointer'
                >
                  <FileDown className='w-3.5 h-3.5' />
                  <span>Скачать исходный Excel</span>
                </button>
                <span className='text-white/20'>•</span>
                <button
                  type='button'
                  onClick={() => handleDeleteDoc(currentDoc.id, currentDoc.title)}
                  className='text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1.5 transition cursor-pointer'
                >
                  <Trash2 className='w-3.5 h-3.5' />
                  <span>Удалить</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Если еще нет документов ─────────────────────────────────────────── */}
      {!loadingDocs && docsList.length === 0 && (
        <div className='bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs'>
          <div className='w-16 h-16 rounded-3xl bg-teal-50 text-teal-600 mx-auto flex items-center justify-center font-bold mb-4 shadow-sm'>
            <FileSpreadsheet className='w-8 h-8' />
          </div>
          <h2 className='text-lg sm:text-xl font-bold text-slate-900'>
            Инвентаризации еще не загружены
          </h2>
          <p className='text-slate-500 text-xs sm:text-sm mt-1.5 max-w-md mx-auto'>
            Загрузите файл инвентаризации 1С (.xlsx или .xls), чтобы рассчитать недостачи, излишки и финансовые отклонения по складу.
          </p>

          <div className='mt-6 flex items-center justify-center gap-3'>
            <button
              type='button'
              onClick={() => setIsUploadModalOpen(true)}
              className='px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm transition flex items-center gap-2 shadow-md shadow-teal-900/20 cursor-pointer'
            >
              <Upload className='w-4 h-4' />
              <span>Загрузить Excel 1С</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Данные выбранного документа ─────────────────────────────────────── */}
      {currentDoc && (
        <>
          {/* Мета-карточка документа */}
          <div className='bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4'>
            <div className='space-y-1.5'>
              <div className='flex items-center gap-2 flex-wrap'>
                {currentDoc.docNumber && (
                  <span className='px-2.5 py-1 rounded-xl text-xs font-black bg-slate-900 text-white'>
                    № {currentDoc.docNumber}
                  </span>
                )}
                <span className='font-bold text-slate-900 text-sm sm:text-base'>
                  {currentDoc.title}
                </span>
                <span className='text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200/50'>
                  {currentDoc.totalItems} позиций
                </span>
              </div>

              <div className='flex items-center gap-4 text-xs text-slate-500 flex-wrap'>
                {currentDoc.organization && (
                  <div className='flex items-center gap-1.5'>
                    <Building2 className='w-3.5 h-3.5 text-slate-400' />
                    <span>{currentDoc.organization}</span>
                  </div>
                )}
                {currentDoc.warehouse && (
                  <div className='flex items-center gap-1.5'>
                    <Warehouse className='w-3.5 h-3.5 text-slate-400' />
                    <span className='font-medium text-slate-700'>{currentDoc.warehouse}</span>
                  </div>
                )}
                <div className='flex items-center gap-1.5'>
                  <Calendar className='w-3.5 h-3.5 text-slate-400' />
                  <span>Дата сверки: {formatDate(currentDoc.docDate)}</span>
                </div>
              </div>
            </div>

            <div className='text-right text-[11px] text-slate-400 font-medium shrink-0'>
              <div>Файл: <span className='text-slate-600 font-semibold'>{currentDoc.fileName}</span></div>
              {currentDoc.uploadedBy && <div>Загрузил: {currentDoc.uploadedBy}</div>}
            </div>
          </div>

          {/* ─── Сводные KPI Карточки ────────────────────────────────────────── */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            {/* 1. Фактический остаток */}
            <div className='bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between'>
              <div>
                <p className='text-xs font-bold text-slate-400 uppercase tracking-wider'>
                  Фактический остаток
                </p>
                <h3 className='text-xl sm:text-2xl font-black text-slate-900 mt-1'>
                  {formatMoney(currentDoc.totalFactSum)}
                </h3>
                <p className='text-[11px] text-slate-500 mt-0.5'>
                  Сумма по пересчету на складе
                </p>
              </div>
              <div className='w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold shrink-0'>
                <Layers className='w-6 h-6' />
              </div>
            </div>

            {/* 2. По учету 1С */}
            <div className='bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between'>
              <div>
                <p className='text-xs font-bold text-slate-400 uppercase tracking-wider'>
                  По учету 1С
                </p>
                <h3 className='text-xl sm:text-2xl font-black text-slate-900 mt-1'>
                  {formatMoney(currentDoc.totalAccSum)}
                </h3>
                <p className='text-[11px] text-slate-500 mt-0.5'>
                  Остаток по учетным данным
                </p>
              </div>
              <div className='w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0'>
                <FileSpreadsheet className='w-6 h-6' />
              </div>
            </div>

            {/* 3. Расхождение (Дельта) */}
            <div
              className={`rounded-2xl p-5 border shadow-xs flex items-center justify-between ${
                currentDoc.totalDiffSum < 0
                  ? 'bg-rose-50/70 border-rose-200'
                  : currentDoc.totalDiffSum > 0
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <p className='text-xs font-bold uppercase tracking-wider text-slate-500'>
                  Расхождение (Дельта)
                </p>
                <h3
                  className={`text-xl sm:text-2xl font-black mt-1 flex items-center gap-1.5 ${
                    currentDoc.totalDiffSum < 0
                      ? 'text-rose-700'
                      : currentDoc.totalDiffSum > 0
                      ? 'text-emerald-700'
                      : 'text-slate-700'
                  }`}
                >
                  {currentDoc.totalDiffSum > 0 ? '+' : ''}
                  {formatMoney(currentDoc.totalDiffSum)}
                </h3>
                <p className='text-[11px] text-slate-600 mt-0.5 font-medium'>
                  {currentDoc.totalDiffSum < 0
                    ? 'Итоговая недостача по складу'
                    : currentDoc.totalDiffSum > 0
                    ? 'Итоговый излишек по складу'
                    : 'Склад сошелся в ноль'}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                  currentDoc.totalDiffSum < 0
                    ? 'bg-rose-100 text-rose-700'
                    : currentDoc.totalDiffSum > 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {currentDoc.totalDiffSum < 0 ? (
                  <TrendingDown className='w-6 h-6' />
                ) : currentDoc.totalDiffSum > 0 ? (
                  <TrendingUp className='w-6 h-6' />
                ) : (
                  <CheckCircle2 className='w-6 h-6' />
                )}
              </div>
            </div>

            {/* 4. Распределение позиций */}
            <div className='bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between'>
              <div className='flex items-center justify-between'>
                <p className='text-xs font-bold text-slate-400 uppercase tracking-wider'>
                  Статусы номенклатуры
                </p>
                <span className='text-[11px] font-bold text-slate-500'>
                  Всего {currentDoc.totalItems}
                </span>
              </div>

              <div className='mt-2 space-y-1.5 text-xs font-semibold'>
                <div className='flex items-center justify-between text-rose-700'>
                  <span className='flex items-center gap-1.5'>
                    <span className='w-2 h-2 rounded-full bg-rose-500'></span>
                    Недостачи:
                  </span>
                  <span>{currentDoc.shortageCount} поз. ({formatMoney(currentDoc.shortageSum)})</span>
                </div>
                <div className='flex items-center justify-between text-emerald-700'>
                  <span className='flex items-center gap-1.5'>
                    <span className='w-2 h-2 rounded-full bg-emerald-500'></span>
                    Излишки:
                  </span>
                  <span>{currentDoc.surplusCount} поз. (+{formatMoney(currentDoc.surplusSum)})</span>
                </div>
                <div className='flex items-center justify-between text-slate-600'>
                  <span className='flex items-center gap-1.5'>
                    <span className='w-2 h-2 rounded-full bg-slate-400'></span>
                    Без отклонений:
                  </span>
                  <span>{currentDoc.matchCount} поз.</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Инструменты фильтрации, поиска и сортировки ─────────────────── */}
          <div className='bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3'>
            {/* Вкладки быстрых фильтров по статусам */}
            <div className='flex items-center gap-1.5 flex-wrap'>
              <button
                type='button'
                onClick={() => setStatusFilter('ALL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Все</span>
                <span className='px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-inherit'>
                  {currentDoc.totalItems}
                </span>
              </button>

              <button
                type='button'
                onClick={() => setStatusFilter('SHORTAGE')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'SHORTAGE'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                <AlertTriangle className='w-3.5 h-3.5' />
                <span>Недостачи</span>
                <span className='px-1.5 py-0.2 rounded-full text-[10px] bg-rose-200/50 text-inherit'>
                  {currentDoc.shortageCount}
                </span>
              </button>

              <button
                type='button'
                onClick={() => setStatusFilter('SURPLUS')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'SURPLUS'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <Package className='w-3.5 h-3.5' />
                <span>Излишки</span>
                <span className='px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-200/50 text-inherit'>
                  {currentDoc.surplusCount}
                </span>
              </button>

              <button
                type='button'
                onClick={() => setStatusFilter('MATCH')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'MATCH'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 className='w-3.5 h-3.5' />
                <span>Без отклонений</span>
                <span className='px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-inherit'>
                  {currentDoc.matchCount}
                </span>
              </button>
            </div>

            {/* Поиск и Сортировка */}
            <div className='flex items-center gap-2.5 flex-wrap sm:flex-nowrap'>
              <div className='relative w-full sm:w-64'>
                <Search className='w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none' />
                <input
                  type='text'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Поиск товара...'
                  className='w-full pl-9 pr-8 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-medium placeholder-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500'
                />
                {searchQuery && (
                  <button
                    type='button'
                    onClick={() => setSearchQuery('')}
                    className='absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600'
                  >
                    <X className='w-3.5 h-3.5' />
                  </button>
                )}
              </div>

              <div className='relative shrink-0'>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className='bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 border border-slate-200 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer'
                >
                  <option value='number_asc'>По порядку (№ 1..N)</option>
                  <option value='diff_sum_asc'>Сначала наибольшая недостача</option>
                  <option value='diff_sum_desc'>Сначала наибольший излишек</option>
                  <option value='fact_sum_desc'>По сумме факта (убыв.)</option>
                  <option value='name_asc'>По названию (А-Я)</option>
                </select>
                <ArrowUpDown className='w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none' />
              </div>
            </div>
          </div>

          {/* ─── Таблица номенклатуры ────────────────────────────────────────── */}
          <div className='bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full text-left border-collapse text-xs'>
                <thead>
                  <tr className='bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]'>
                    <th className='py-3.5 px-3 text-center w-12'>№</th>
                    <th className='py-3.5 px-4'>Товар / Номенклатура</th>
                    <th className='py-3.5 px-3 text-center'>Статус</th>
                    <th className='py-3.5 px-3 text-right'>Факт</th>
                    <th className='py-3.5 px-3 text-right'>По учету</th>
                    <th className='py-3.5 px-3 text-right'>Отклонение</th>
                    <th className='py-3.5 px-3 text-center'>Ед.</th>
                    <th className='py-3.5 px-3 text-right'>Цена</th>
                    <th className='py-3.5 px-4 text-right'>Сумма факт</th>
                    <th className='py-3.5 px-4 text-right'>Сумма учет</th>
                    <th className='py-3.5 px-4 text-right'>Разница (₽)</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {filteredItems.map((item) => {
                    const isShortage = item.status === 'SHORTAGE';
                    const isSurplus = item.status === 'SURPLUS';
                    const isMatch = item.status === 'MATCH';

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors hover:bg-slate-50/80 ${
                          isShortage
                            ? 'bg-rose-50/20'
                            : isSurplus
                            ? 'bg-emerald-50/20'
                            : ''
                        }`}
                      >
                        {/* № */}
                        <td className='py-3 px-3 text-center font-bold text-slate-400'>
                          {item.itemNumber}
                        </td>

                        {/* Название товара */}
                        <td className='py-3 px-4 font-bold text-slate-800 max-w-xs sm:max-w-md'>
                          <div className='flex items-center gap-2'>
                            <span className='truncate'>{item.productName}</span>
                          </div>
                        </td>

                        {/* Статус */}
                        <td className='py-3 px-3 text-center'>
                          {isShortage ? (
                            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200'>
                              <AlertTriangle className='w-3 h-3' />
                              <span>Недостача</span>
                            </span>
                          ) : isSurplus ? (
                            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200'>
                              <Package className='w-3 h-3' />
                              <span>Излишек</span>
                            </span>
                          ) : (
                            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600'>
                              <CheckCircle2 className='w-3 h-3 text-slate-400' />
                              <span>В ноль</span>
                            </span>
                          )}
                        </td>

                        {/* Количество Факт */}
                        <td className='py-3 px-3 text-right font-black text-slate-800'>
                          {formatQty(item.factQty)}
                        </td>

                        {/* Количество Учет */}
                        <td className='py-3 px-3 text-right font-semibold text-slate-500'>
                          {formatQty(item.accQty)}
                        </td>

                        {/* Отклонение количество */}
                        <td
                          className={`py-3 px-3 text-right font-black ${
                            isShortage
                              ? 'text-rose-600'
                              : isSurplus
                              ? 'text-emerald-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.diffQty > 0 ? `+${formatQty(item.diffQty)}` : formatQty(item.diffQty)}
                        </td>

                        {/* Единица измерения */}
                        <td className='py-3 px-3 text-center text-slate-500 font-medium'>
                          {item.unit}
                        </td>

                        {/* Цена */}
                        <td className='py-3 px-3 text-right text-slate-600 font-semibold'>
                          {formatMoney(item.price)}
                        </td>

                        {/* Сумма факт */}
                        <td className='py-3 px-4 text-right font-black text-slate-800'>
                          {formatMoney(item.factSum)}
                        </td>

                        {/* Сумма по учету */}
                        <td className='py-3 px-4 text-right font-semibold text-slate-500'>
                          {formatMoney(item.accSum)}
                        </td>

                        {/* Разница сумм */}
                        <td
                          className={`py-3 px-4 text-right font-black ${
                            isShortage
                              ? 'text-rose-700 font-black'
                              : isSurplus
                              ? 'text-emerald-700 font-black'
                              : 'text-slate-400 font-medium'
                          }`}
                        >
                          {item.diffSum > 0 ? `+${formatMoney(item.diffSum)}` : formatMoney(item.diffSum)}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={11} className='py-12 text-center text-slate-400'>
                        {searchQuery
                          ? 'Ничего не найдено по вашему запросу'
                          : 'В данной категории нет позиций'}
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Строка Итого внизу таблицы */}
                {filteredItems.length > 0 && (
                  <tfoot>
                    <tr className='bg-slate-100/80 font-black text-slate-900 border-t-2 border-slate-300'>
                      <td colSpan={3} className='py-3.5 px-4 text-left'>
                        Итого по отображаемым строкам ({filteredItems.length} поз.):
                      </td>
                      <td className='py-3.5 px-3 text-right'>
                        {formatQty(filteredItems.reduce((s, it) => s + it.factQty, 0))}
                      </td>
                      <td className='py-3.5 px-3 text-right text-slate-600'>
                        {formatQty(filteredItems.reduce((s, it) => s + it.accQty, 0))}
                      </td>
                      <td className='py-3.5 px-3 text-right'>
                        {formatQty(filteredItems.reduce((s, it) => s + it.diffQty, 0))}
                      </td>
                      <td className='py-3.5 px-3 text-center'>—</td>
                      <td className='py-3.5 px-3 text-center'>—</td>
                      <td className='py-3.5 px-4 text-right text-teal-800'>
                        {formatMoney(filteredItems.reduce((s, it) => s + it.factSum, 0))}
                      </td>
                      <td className='py-3.5 px-4 text-right text-slate-600'>
                        {formatMoney(filteredItems.reduce((s, it) => s + it.accSum, 0))}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right text-sm ${
                          filteredItems.reduce((s, it) => s + it.diffSum, 0) < 0
                            ? 'text-rose-700'
                            : filteredItems.reduce((s, it) => s + it.diffSum, 0) > 0
                            ? 'text-emerald-700'
                            : 'text-slate-700'
                        }`}
                      >
                        {formatMoney(filteredItems.reduce((s, it) => s + it.diffSum, 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* ─── Модальное окно загрузки Excel ────────────────────────────────────── */}
      {isUploadModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs'>
          <div className='bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative'>
            <button
              type='button'
              onClick={() => setIsUploadModalOpen(false)}
              className='absolute right-5 top-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition'
            >
              <X className='w-5 h-5' />
            </button>

            <div className='flex items-center gap-3 mb-4'>
              <div className='w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold'>
                <Upload className='w-5 h-5' />
              </div>
              <div>
                <h3 className='text-lg font-black text-slate-900'>
                  Загрузка инвентаризации 1С
                </h3>
                <p className='text-xs text-slate-500'>
                  Формат файла Excel (.xlsx или .xls)
                </p>
              </div>
            </div>

            {/* Дропзона */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
                dragActive
                  ? 'border-teal-500 bg-teal-50/50'
                  : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type='file'
                accept='.xlsx,.xls'
                className='hidden'
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <FileSpreadsheet className='w-12 h-12 text-teal-500 mx-auto mb-3' />
              <p className='text-sm font-bold text-slate-800'>
                Перетащите файл инвентаризации сюда
              </p>
              <p className='text-xs text-slate-400 mt-1'>
                или нажмите для выбора файла на диске
              </p>
              <p className='text-[10px] text-teal-600 font-semibold mt-3 bg-teal-50 py-1 px-2 rounded-lg inline-block'>
                Автоматически распознает шапку, номенклатуру, факт, учет и суммы
              </p>
            </div>

            <div className='mt-5 flex items-center justify-end gap-2'>
              <button
                type='button'
                onClick={() => setIsUploadModalOpen(false)}
                className='px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition'
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
