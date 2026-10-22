'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Snowflake,
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
  Warehouse,
  Calendar,
  Layers,
  ArrowUpDown,
  X,
  FileDown,
  Scale,
  Coins,
  Sparkles,
} from 'lucide-react';

interface FreezerItem {
  id: string;
  docId: string;
  itemNumber: number;
  productName: string;
  weightKg: number;
  pricePerKg: number;
  totalCost: number;
  hasStock: boolean;
  createdAt?: string;
}

interface FreezerDocMeta {
  id: string;
  fileName: string;
  uploadedAt: string;
  uploadedBy?: string | null;
  totalWeight: number;
  totalCost: number;
  totalPositions: number;
  inStockPositions: number;
  zeroStockPositions: number;
  items?: FreezerItem[];
}

export default function FreezerTab() {
  const [docsList, setDocsList] = useState<FreezerDocMeta[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [currentDoc, setCurrentDoc] = useState<FreezerDocMeta | null>(null);

  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);
  const [loadingDocDetail, setLoadingDocDetail] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Фильтры и поиск
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'ZERO'>('ALL');
  const [sortBy, setSortBy] = useState<'number_asc' | 'weight_desc' | 'weight_asc' | 'cost_desc' | 'cost_asc' | 'price_desc' | 'name_asc'>('weight_desc');

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

  const formatWeight = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return '0 кг';
    return (
      val.toLocaleString('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
      }) + ' кг'
    );
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Загрузка списка документов
  const fetchDocsList = async (preferredId?: string) => {
    try {
      setLoadingDocs(true);
      const res = await api.get('/api/freezer/docs');
      const list: FreezerDocMeta[] = res.data?.docs || [];
      setDocsList(list);

      if (list.length > 0) {
        const idToSelect = preferredId && list.some((d) => d.id === preferredId) ? preferredId : list[0].id;
        setSelectedDocId(idToSelect);
      } else {
        setSelectedDocId(null);
        setCurrentDoc(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка загрузки списка остатков заморозки');
    } finally {
      setLoadingDocs(false);
    }
  };

  // Загрузка деталей выбранного документа
  const fetchDocDetail = async (id: string) => {
    try {
      setLoadingDocDetail(true);
      const res = await api.get(`/api/freezer/docs/${id}`);
      setCurrentDoc(res.data?.doc || null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка загрузки данных заморозки');
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

  // Обработка загрузки файла
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      toast.error('Пожалуйста, выберите файл формата Excel (.xlsx или .xls)');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);

      const res = await api.post('/api/freezer/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(res.data?.message || 'Остатки заморозки успешно загружены!');
      setIsUploadModalOpen(false);
      const newDocId = res.data?.doc?.id;
      await fetchDocsList(newDocId);
    } catch (err: any) {
      console.error('Freezer upload error:', err);
      toast.error(err.response?.data?.error || 'Ошибка при загрузке и обработке файла остатков');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Drag-and-drop обработчики
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Удаление документа
  const handleDeleteDoc = async (id: string, fileName: string) => {
    if (!confirm(`Вы действительно хотите удалить документ остатков «${fileName}»?`)) {
      return;
    }

    try {
      await api.delete(`/api/freezer/docs/${id}`);
      toast.success('Документ остатков успешно удален');
      fetchDocsList();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка при удалении документа');
    }
  };

  // Скачивание оригинального файла Excel
  const handleDownloadFile = async (id: string, fallbackName?: string) => {
    try {
      toast.loading('Подготовка файла к скачиванию...', { id: 'freezer_dl' });
      const resp = await api.get(`/api/freezer/download/${id}`, {
        responseType: 'blob',
      });

      const blob = new Blob([resp.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');

      let dlName = fallbackName || 'СЕБЕСТОИМОСТЬ ОСТАТКОВ.xlsx';
      const cd = resp.headers?.['content-disposition'] || resp.headers?.['Content-Disposition'];
      if (cd) {
        const m = cd.match(/filename\*=UTF-8''([^;]+)/i) || cd.match(/filename="?([^";]+)"?/i);
        if (m && m[1]) {
          try {
            dlName = decodeURIComponent(m[1]);
          } catch (e) {}
        }
      }

      link.href = blobUrl;
      link.download = dlName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success('Оригинальный файл успешно скачан!', { id: 'freezer_dl' });
    } catch (err: any) {
      toast.error('Не удалось скачать файл с сервера', { id: 'freezer_dl' });
    }
  };

  // Экспорт текущей таблицы в CSV / Excel
  const handleExportCSV = () => {
    if (!filteredItems.length) {
      toast.error('Нет данных для экспорта');
      return;
    }

    const headers = ['№', 'Номенклатура', 'Количество (кг)', 'Стоимость ед. (руб.)', 'Сумма (руб.)', 'Статус'];
    const rows = filteredItems.map((item, idx) => [
      item.itemNumber || idx + 1,
      `"${item.productName.replace(/"/g, '""')}"`,
      item.weightKg,
      item.pricePerKg,
      item.totalCost,
      item.hasStock ? 'В наличии' : 'Нулевой остаток',
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Склад_Заморозки_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Файл успешно экспортирован!');
  };

  // Фильтрация и сортировка позиций на клиенте
  const filteredItems = useMemo(() => {
    if (!currentDoc?.items) return [];

    let list = [...currentDoc.items];

    // Поиск по наименованию
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((it) => it.productName.toLowerCase().includes(q));
    }

    // Фильтр по наличию
    if (stockFilter === 'IN_STOCK') {
      list = list.filter((it) => it.hasStock);
    } else if (stockFilter === 'ZERO') {
      list = list.filter((it) => !it.hasStock);
    }

    // Сортировка
    if (sortBy === 'weight_desc') {
      list.sort((a, b) => b.weightKg - a.weightKg);
    } else if (sortBy === 'weight_asc') {
      list.sort((a, b) => a.weightKg - b.weightKg);
    } else if (sortBy === 'cost_desc') {
      list.sort((a, b) => b.totalCost - a.totalCost);
    } else if (sortBy === 'cost_asc') {
      list.sort((a, b) => a.totalCost - b.totalCost);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.pricePerKg - a.pricePerKg);
    } else if (sortBy === 'name_asc') {
      list.sort((a, b) => a.productName.localeCompare(b.productName, 'ru'));
    } else {
      list.sort((a, b) => a.itemNumber - b.itemNumber);
    }

    return list;
  }, [currentDoc, searchQuery, stockFilter, sortBy]);

  // Расчет итогов для отфильтрованного списка
  const filteredTotals = useMemo(() => {
    const totalWeight = filteredItems.reduce((acc, it) => acc + it.weightKg, 0);
    const totalCost = filteredItems.reduce((acc, it) => acc + it.totalCost, 0);
    const inStock = filteredItems.filter((it) => it.hasStock).length;
    const avgPrice = totalWeight > 0 ? totalCost / totalWeight : 0;

    return {
      count: filteredItems.length,
      totalWeight,
      totalCost,
      inStock,
      avgPrice,
    };
  }, [filteredItems]);

  // Топ-3 позиции по весу (для быстрой аналитики)
  const topWeightItems = useMemo(() => {
    if (!currentDoc?.items) return [];
    return [...currentDoc.items]
      .filter((it) => it.weightKg > 0)
      .sort((a, b) => b.weightKg - a.weightKg)
      .slice(0, 3);
  }, [currentDoc]);

  return (
    <div className="space-y-6">
      {/* ─── Верхняя плашка управления ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Заголовок и селектор файла */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-cyan-500/25 shrink-0">
              <Snowflake className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Склад Заморозки
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 border border-cyan-200/80">
                  Сырьё 1С
                </span>
                {currentDoc && (
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    Загружено: {formatDate(currentDoc.uploadedAt)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Остатки мороженого сырья, себестоимость за 1 кг и общая финансовая оценка
              </p>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Селектор версий / загруженных файлов */}
            {docsList.length > 0 && (
              <div className="relative min-w-[220px]">
                <select
                  value={selectedDocId || ''}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 pr-8 text-slate-800 cursor-pointer transition appearance-none focus:outline-hidden focus:ring-2 focus:ring-cyan-500 shadow-2xs"
                  title="Выберите версию файла для просмотра"
                >
                  {docsList.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {new Date(doc.uploadedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} — {doc.fileName} ({doc.totalPositions} поз.)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Обновить */}
            <button
              onClick={() => selectedDocId && fetchDocDetail(selectedDocId)}
              disabled={loadingDocDetail}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
              title="Обновить данные"
            >
              <RefreshCw className={`w-4 h-4 ${loadingDocDetail ? 'animate-spin text-cyan-600' : ''}`} />
            </button>

            {/* Скачать исходный файл Excel */}
            {currentDoc && (
              <button
                onClick={() => handleDownloadFile(currentDoc.id, currentDoc.fileName)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition cursor-pointer shadow-2xs"
                title="Скачать оригинальный загруженный файл Excel (.xlsx)"
              >
                <Download className="w-4 h-4 text-cyan-600" />
                <span className="hidden sm:inline">Скачать оригинал</span>
              </button>
            )}

            {/* Экспорт текущего вида */}
            <button
              onClick={handleExportCSV}
              disabled={!currentDoc?.items?.length}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-2xs"
              title="Экспортировать текущую отфильтрованную таблицу в CSV / Excel"
            >
              <FileDown className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Экспорт таблицы</span>
            </button>

            {/* Загрузить файл */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Загрузить 1С</span>
            </button>

            {/* Удалить документ */}
            {currentDoc && (
              <button
                onClick={() => handleDeleteDoc(currentDoc.id, currentDoc.fileName)}
                className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Удалить этот документ остатков"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Ключевые метрики (KPI) ───────────────────────────────────────── */}
      {currentDoc ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Общий вес */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-50 rounded-bl-full -z-0 group-hover:scale-105 transition" />
            <div className="relative z-10">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Всего сырья</span>
                <Scale className="w-4 h-4 text-cyan-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {formatWeight(currentDoc.totalWeight)}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-800">
                  ≈ {(currentDoc.totalWeight / 1000).toFixed(2)} тонн
                </span>
                <span className="text-[11px] text-slate-400">в морозилке</span>
              </div>
            </div>
          </div>

          {/* Общая сумма себестоимости */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-0 group-hover:scale-105 transition" />
            <div className="relative z-10">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Себестоимость</span>
                <Coins className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {formatMoney(currentDoc.totalCost)}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  100% склада
                </span>
                <span className="text-[11px] text-slate-400">по оценке 1С</span>
              </div>
            </div>
          </div>

          {/* Средняя себестоимость за 1 кг */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-bl-full -z-0 group-hover:scale-105 transition" />
            <div className="relative z-10">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Средняя цена за кг</span>
                <Warehouse className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {currentDoc.totalWeight > 0
                  ? formatMoney(currentDoc.totalCost / currentDoc.totalWeight).replace(' ₽', '') + ' ₽/кг'
                  : '0 ₽/кг'}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
                <span>Средневзвешенная по весу</span>
              </div>
            </div>
          </div>

          {/* Позиции: в наличии vs 0 кг */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -z-0 group-hover:scale-105 transition" />
            <div className="relative z-10">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Номенклатура</span>
                <Package className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {currentDoc.totalPositions} поз.
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  {currentDoc.inStockPositions} в наличии
                </span>
                {currentDoc.zeroStockPositions > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                    {currentDoc.zeroStockPositions} по 0 кг
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ─── Топ-3 позиции по остатку ─────────────────────────────────────── */}
      {topWeightItems.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-4 text-white shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold tracking-wide uppercase text-cyan-200">
                Крупнейшие остатки сырья в заморозке
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Топ-3 по физическому весу
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {topWeightItems.map((item, idx) => {
              const share = currentDoc?.totalWeight ? ((item.weightKg / currentDoc.totalWeight) * 100).toFixed(1) : '0';
              return (
                <div
                  key={item.id}
                  className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 hover:bg-white/15 transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-bold truncate text-white">
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-900 flex items-center justify-center text-[10px] font-black shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate" title={item.productName}>
                        {item.productName}
                      </span>
                    </div>
                    <div className="text-[11px] text-cyan-300 font-medium mt-1">
                      {formatMoney(item.pricePerKg)} / кг • {formatMoney(item.totalCost)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-white">
                      {formatWeight(item.weightKg)}
                    </div>
                    <div className="text-[10px] text-cyan-200 font-bold">
                      {share}% склада
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Панель фильтров, поиска и сортировки ──────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
          {/* Поиск */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию (горбуша, форель, щука, лещ...)"
              className="w-full pl-9 pr-9 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Фильтр наличия (Все позиции / В наличии / По 0 кг) */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStockFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                stockFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Все позиции ({currentDoc?.totalPositions ?? 0})
            </button>
            <button
              onClick={() => setStockFilter('IN_STOCK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                stockFilter === 'IN_STOCK'
                  ? 'bg-white text-cyan-800 shadow-2xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              В наличии ({currentDoc?.inStockPositions ?? 0})
            </button>
            <button
              onClick={() => setStockFilter('ZERO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                stockFilter === 'ZERO'
                  ? 'bg-white text-slate-700 shadow-2xs ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              По 0 кг ({currentDoc?.zeroStockPositions ?? 0})
            </button>
          </div>

          {/* Сортировка */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 hidden md:inline">
              Сортировка:
            </span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-8 text-slate-700 cursor-pointer transition appearance-none focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
              >
                <option value="weight_desc">По остатку (сначала крупные)</option>
                <option value="weight_asc">По остатку (сначала малые)</option>
                <option value="cost_desc">По сумме остатка (убывание)</option>
                <option value="cost_asc">По сумме остатка (возрастание)</option>
                <option value="price_desc">По цене за 1 кг (дорогие)</option>
                <option value="name_asc">По алфавиту (А &rarr; Я)</option>
                <option value="number_asc">По порядку в 1С (№)</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Таблица позиций ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loadingDocDetail ? (
          <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <span>Загрузка позиций заморозки...</span>
          </div>
        ) : !currentDoc ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <Snowflake className="w-12 h-12 text-slate-300" />
            <div className="text-base font-bold text-slate-800">
              Остатки заморозки ещё не загружены
            </div>
            <p className="text-xs text-slate-400 max-w-md">
              Нажмите кнопку «Загрузить 1С» вверху и выберите файл «СЕБЕСТОИМОСТЬ ОСТАТКОВ.xlsx», чтобы отобразить остатки сырья.
            </p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Загрузить файл остатков</span>
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            По заданным фильтрам и поиску ничего не найдено.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-12 text-center">№</th>
                  <th className="py-3 px-4">Номенклатура</th>
                  <th className="py-3 px-4 text-right">Количество</th>
                  <th className="py-3 px-4 text-right">Стоимость ед.</th>
                  <th className="py-3 px-4 text-right">Сумма</th>
                  <th className="py-3 px-4 w-28 text-center">Доля</th>
                  <th className="py-3 px-4 w-28 text-center">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredItems.map((item, idx) => {
                  const shareWeight = currentDoc.totalWeight > 0 ? (item.weightKg / currentDoc.totalWeight) * 100 : 0;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-cyan-50/40 transition group ${
                        !item.hasStock ? 'bg-slate-50/50 opacity-60' : ''
                      }`}
                    >
                      {/* № */}
                      <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-400">
                        {item.itemNumber || idx + 1}
                      </td>

                      {/* Номенклатура */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{item.productName}</span>
                        </div>
                      </td>

                      {/* Количество (кг) */}
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        <div className="inline-flex items-center gap-1.5">
                          <span className={item.weightKg > 100 ? 'text-cyan-900 font-extrabold' : ''}>
                            {formatWeight(item.weightKg)}
                          </span>
                        </div>
                      </td>

                      {/* Стоимость ед. (₽/кг) */}
                      <td className="py-3 px-4 text-right font-semibold text-slate-700">
                        {item.pricePerKg > 0 ? formatMoney(item.pricePerKg) : '—'}
                      </td>

                      {/* Сумма (₽) */}
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        <span className={item.totalCost < 0 ? 'text-rose-600' : ''}>
                          {formatMoney(item.totalCost)}
                        </span>
                      </td>

                      {/* Доля от общего веса заморозки */}
                      <td className="py-3 px-4 text-center">
                        {item.weightKg > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-bold text-cyan-800">
                              {shareWeight.toFixed(1)}%
                            </span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-500 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(4, shareWeight * 4))}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[10px]">—</span>
                        )}
                      </td>

                      {/* Статус */}
                      <td className="py-3 px-4 text-center">
                        {item.hasStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            В наличии
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                            0 кг
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Итоговая строка в подвале таблицы */}
              <tfoot>
                <tr className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-xs text-slate-900">
                  <td className="py-3.5 px-4 text-center text-slate-500 text-[11px]">
                    Итого:
                  </td>
                  <td className="py-3.5 px-4 font-black">
                    Показано {filteredTotals.count} позиций (в наличии {filteredTotals.inStock})
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-cyan-900">
                    {formatWeight(filteredTotals.totalWeight)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-600">
                    {filteredTotals.avgPrice > 0 ? formatMoney(filteredTotals.avgPrice) + ' (ср)' : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-emerald-900">
                    {formatMoney(filteredTotals.totalCost)}
                  </td>
                  <td colSpan={2} className="py-3.5 px-4 text-center text-[11px] text-slate-500">
                    {currentDoc.totalWeight > 0
                      ? `${((filteredTotals.totalWeight / currentDoc.totalWeight) * 100).toFixed(1)}% от всей заморозки`
                      : ''}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ─── Модальное окно загрузки Excel ─────────────────────────────────── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => !isUploading && setIsUploadModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Загрузка остатков заморозки (1С)
                </h3>
                <p className="text-xs text-slate-500">
                  Файл ведомости «СЕБЕСТОИМОСТЬ ОСТАТКОВ.xlsx»
                </p>
              </div>
            </div>

            {/* Drag & drop зона */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                dragActive
                  ? 'border-cyan-500 bg-cyan-50/50 scale-[1.01]'
                  : 'border-slate-200 hover:border-cyan-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />

              <div className="w-14 h-14 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <FileSpreadsheet className="w-7 h-7" />
              </div>

              <div>
                <span className="text-sm font-bold text-slate-800 block">
                  Перетащите файл сюда или нажмите для выбора
                </span>
                <span className="text-xs text-slate-400 mt-1 block">
                  Поддерживаются форматы Excel: .xlsx, .xls (до 50 МБ)
                </span>
              </div>

              <div className="px-3 py-1 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600 mt-1">
                Система автоматически выберет раздел «Склад Заморозки»
              </div>
            </div>

            {isUploading && (
              <div className="mt-4 p-3 rounded-xl bg-cyan-50 text-cyan-800 text-xs font-semibold flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
                <span>Идёт обработка и загрузка файла в базу данных...</span>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
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
