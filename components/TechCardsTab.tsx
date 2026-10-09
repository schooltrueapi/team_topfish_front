'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import {
  ChefHat,
  Plus,
  Search,
  Layers,
  Sparkles,
  Package,
  Boxes,
  ScrollText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Pencil,
  Trash2,
  X,
  Scale,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Info,
  Check,
  RotateCcw,
  BookOpen,
  Filter,
} from 'lucide-react';

export interface TechIngredient {
  id: string;
  name: string;
  type: 'INGREDIENT' | 'MATERIAL';
  unit: string;
  price?: number;
  packageWeight?: number;
  article?: string | null;
  comment?: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    recipeItems: number;
  };
}

export interface TechCardItem {
  id?: string;
  ingredientId?: string | null;
  name: string;
  type: 'INGREDIENT' | 'MATERIAL';
  amount: number;
  unit: string;
  sortOrder?: number;
  ingredient?: TechIngredient | null;
}

export interface TechCard {
  id: string;
  productName: string;
  category?: string | null;
  baseWeight: number;
  targetOutputPercent?: number;
  lossPercent?: number;
  comment?: string | null;
  createdByName?: string | null;
  createdAt: string;
  items: TechCardItem[];
  _count?: {
    batches: number;
  };
}

export interface ProductionBatch {
  id: string;
  batchNumber: string;
  techCardId?: string | null;
  productName: string;
  rawWeight: number;
  rawPricePerKg?: number;
  status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  checklist: Array<{
    id: string;
    name: string;
    type: 'INGREDIENT' | 'MATERIAL';
    targetAmount: number;
    unit: string;
    isChecked: boolean;
    checkedAt?: string | null;
    checkedBy?: string | null;
    clickDelaySeconds?: number | null;
  }>;
  technologistName?: string | null;
  startedAt: string;
  inProgressAt?: string | null;
  completedAt?: string | null;
  finalWeight?: number | null;
  outputPercent?: number | null;
  lossPercent?: number | null;
  costSnapshot?: any;
  totalCost?: number | null;
  costPerKg?: number | null;
  isSuspiciousSpeed?: boolean;
  speedComment?: string | null;
  techCard?: {
    id: string;
    productName: string;
    targetOutputPercent?: number;
  } | null;
}

export default function TechCardsTab() {
  const { user, hasPermission } = useAuth();

  // Проверка прав: только Администратор / Руководитель или полный доступ могут менять цены и шаблоны
  const isAdmin = useMemo(() => {
    if (!user) return false;
    if (user.role === 'Руководитель' || user.role === 'Администратор' || user.role === 'Админ') return true;
    return hasPermission('FULL_ACCESS');
  }, [user, hasPermission]);

  // Активный подраздел: Ингредиенты / Материалы / Шаблоны техкарт / Партии в цеху
  const [activeSection, setActiveSection] = useState<'ingredients' | 'materials' | 'templates' | 'batches'>('ingredients');

  // Данные справочников
  const [ingredients, setIngredients] = useState<TechIngredient[]>([]);
  const [templates, setTemplates] = useState<TechCard[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Поиск и фильтры
  const [searchQuery, setSearchQuery] = useState('');

  // Модальные окна
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<TechIngredient | null>(null);

  // Форма добавления/редактирования ингредиента
  const [ingredientForm, setIngredientForm] = useState({
    name: '',
    type: 'INGREDIENT' as 'INGREDIENT' | 'MATERIAL',
    unit: 'kg',
    price: 0,
    packageWeight: 1,
    article: '',
    comment: '',
  });

  // Модалка создания партии (для технолога)
  const [isStartBatchModalOpen, setIsStartBatchModalOpen] = useState(false);
  const [selectedTemplateForBatch, setSelectedTemplateForBatch] = useState<string>('');
  const [batchRawWeight, setBatchRawWeight] = useState<string>('');
  const [batchRawPrice, setBatchRawPrice] = useState<string>('');
  const [isStartingBatch, setIsStartingBatch] = useState(false);

  // Модалка закрытия партии (ввод готового веса)
  const [completingBatch, setCompletingBatch] = useState<ProductionBatch | null>(null);
  const [finalWeightInput, setFinalWeightInput] = useState<string>('');
  const [isCompleting, setIsCompleting] = useState(false);

  // Модалка создания/редактирования Шаблона тех. карты (для Админа)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TechCard | null>(null);
  const [templateForm, setTemplateForm] = useState<{
    productName: string;
    category: string;
    baseWeight: number;
    targetOutputPercent: number;
    lossPercent: number;
    comment: string;
    items: Array<{
      ingredientId: string;
      name: string;
      type: 'INGREDIENT' | 'MATERIAL';
      amount: number;
      unit: string;
    }>;
  }>({
    productName: '',
    category: '',
    baseWeight: 100,
    targetOutputPercent: 70,
    lossPercent: 30,
    comment: '',
    items: [],
  });

  // Модалка редактирования партии
  const [isEditBatchModalOpen, setIsEditBatchModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<ProductionBatch | null>(null);
  const [batchEditForm, setBatchEditForm] = useState({
    rawWeight: '',
    rawPricePerKg: '',
    finalWeight: '',
    status: 'CREATED' as 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
  });

  // Загрузка всех данных
  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [ingRes, tplRes, batchRes, prodRes] = await Promise.all([
        api.get('/api/tech-cards/ingredients').catch(() => ({ data: [] })),
        api.get('/api/tech-cards/templates').catch(() => ({ data: [] })),
        api.get('/api/tech-cards/batches').catch(() => ({ data: [] })),
        api.get('/api/tech-cards/products-list').catch(() => ({ data: [] })),
      ]);

      setIngredients(ingRes.data || []);
      setTemplates(tplRes.data || []);
      setBatches(batchRes.data || []);
      setProductsList(prodRes.data || []);
    } catch (e) {
      console.error('Ошибка загрузки данных техкарт:', e);
      toast.error('Не удалось загрузить данные тех. карт');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Фильтрованные ингредиенты и материалы
  const filteredIngredients = useMemo(() => {
    return ingredients.filter((item) => {
      const matchesType = activeSection === 'ingredients' ? item.type === 'INGREDIENT' : item.type === 'MATERIAL';
      if (!matchesType) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || (item.article && item.article.toLowerCase().includes(q));
    });
  }, [ingredients, activeSection, searchQuery]);

  // Открытие модалки создания/редактирования ингредиента
  const handleOpenIngredientModal = (item?: TechIngredient) => {
    if (!isAdmin) {
      toast.error('Только Администратор может добавлять и редактировать справочник');
      return;
    }
    if (item) {
      setEditingIngredient(item);
      setIngredientForm({
        name: item.name,
        type: item.type,
        unit: item.unit,
        price: item.price || 0,
        packageWeight: item.packageWeight || 1,
        article: item.article || '',
        comment: item.comment || '',
      });
    } else {
      setEditingIngredient(null);
      setIngredientForm({
        name: '',
        type: activeSection === 'materials' ? 'MATERIAL' : 'INGREDIENT',
        unit: activeSection === 'materials' ? 'шт' : 'kg',
        price: 0,
        packageWeight: 1,
        article: '',
        comment: '',
      });
    }
    setIsIngredientModalOpen(true);
  };

  // Сохранение ингредиента
  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!ingredientForm.name.trim()) {
      toast.error('Введите название');
      return;
    }

    try {
      if (editingIngredient) {
        await api.put(`/api/tech-cards/ingredients/${editingIngredient.id}`, ingredientForm);
        toast.success(`Позиция "${ingredientForm.name}" успешно обновлена`);
      } else {
        await api.post('/api/tech-cards/ingredients', ingredientForm);
        toast.success(`Позиция "${ingredientForm.name}" добавлена в справочник`);
      }
      setIsIngredientModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка при сохранении');
    }
  };

  // Удаление ингредиента
  const handleDeleteIngredient = async (id: string, name: string) => {
    if (!isAdmin) return;
    if (!confirm(`Удалить "${name}" из справочника?`)) return;

    try {
      await api.delete(`/api/tech-cards/ingredients/${id}`);
      toast.success(`"${name}" удален из справочника`);
      fetchAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Не удалось удалить элемент');
    }
  };

  // Открытие модалки создания/редактирования шаблона тех. карты
  const handleOpenTemplateModal = (tpl?: TechCard) => {
    if (!isAdmin) {
      toast.error('Только Администратор может создавать и редактировать тех. карты');
      return;
    }
    if (tpl) {
      setEditingTemplate(tpl);
      setTemplateForm({
        productName: tpl.productName,
        category: tpl.category || '',
        baseWeight: tpl.baseWeight || 100,
        targetOutputPercent: tpl.targetOutputPercent || 70,
        lossPercent: tpl.lossPercent || 30,
        comment: tpl.comment || '',
        items: tpl.items.map((it) => ({
          ingredientId: it.ingredientId || '',
          name: it.name,
          type: it.type,
          amount: it.amount,
          unit: it.unit,
        })),
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({
        productName: '',
        category: '',
        baseWeight: 100,
        targetOutputPercent: 70,
        lossPercent: 30,
        comment: '',
        items: [],
      });
    }
    setIsTemplateModalOpen(true);
  };

  // Удаление шаблона тех. карты
  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!isAdmin) return;
    if (!confirm(`Удалить шаблон тех. карты "${name}"?`)) return;

    try {
      await api.delete(`/api/tech-cards/templates/${id}`);
      toast.success(`Тех. карта "${name}" удалена`);
      fetchAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Не удалось удалить тех. карту');
    }
  };

  // Открытие модалки редактирования партии
  const handleOpenEditBatch = (batch: ProductionBatch) => {
    setEditingBatch(batch);
    setBatchEditForm({
      rawWeight: String(batch.rawWeight || ''),
      rawPricePerKg: String(batch.rawPricePerKg || ''),
      finalWeight: batch.finalWeight !== null && batch.finalWeight !== undefined ? String(batch.finalWeight) : '',
      status: batch.status,
    });
    setIsEditBatchModalOpen(true);
  };

  // Сохранение изменений в партии
  const handleSaveEditBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;

    const weight = parseFloat(batchEditForm.rawWeight);
    if (!weight || weight <= 0) {
      toast.error('Укажите корректный вес сырья (кг)');
      return;
    }

    try {
      await api.put(`/api/tech-cards/batches/${editingBatch.id}`, {
        rawWeight: weight,
        rawPricePerKg: parseFloat(batchEditForm.rawPricePerKg) || 0,
        finalWeight: batchEditForm.finalWeight ? parseFloat(batchEditForm.finalWeight) : null,
        status: batchEditForm.status,
      });

      toast.success(`Партия ${editingBatch.batchNumber} успешно обновлена!`);
      setIsEditBatchModalOpen(false);
      setEditingBatch(null);
      fetchAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка сохранения партии');
    }
  };

  // Удаление партии
  const handleDeleteBatch = async (id: string, batchNumber: string, productName: string) => {
    if (!confirm(`Удалить партию ${batchNumber} (${productName})?`)) return;

    try {
      await api.delete(`/api/tech-cards/batches/${id}`);
      toast.success(`Партия ${batchNumber} удалена`);
      fetchAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка удаления партии');
    }
  };

  // Клик по чекбоксу чек-листа в партии (Технолог)
  const handleToggleChecklistItem = async (batchId: string, itemId: string, currentStatus: boolean) => {
    try {
      const nextStatus = !currentStatus;
      const res = await api.post(`/api/tech-cards/batches/${batchId}/check-item`, {
        itemId,
        isChecked: nextStatus,
      });

      // Обновляем локальный стейт партии
      setBatches((prev) =>
        prev.map((b) => (b.id === batchId ? { ...b, ...res.data } : b))
      );

      if (res.data.status === 'IN_PROGRESS' && res.data.status !== batches.find(b => b.id === batchId)?.status) {
        toast.success('Все добавки внесены! Партия переведена в статус «В работе» (на копчении)');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка обновления чек-листа');
    }
  };

  // Запуск новой партии (Технолог)
  const handleStartBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateForBatch) {
      toast.error('Выберите тех. карту');
      return;
    }
    const weight = parseFloat(batchRawWeight);
    if (!weight || weight <= 0) {
      toast.error('Укажите корректный вес сырья (кг)');
      return;
    }

    try {
      setIsStartingBatch(true);
      const res = await api.post('/api/tech-cards/batches', {
        techCardId: selectedTemplateForBatch,
        rawWeight: weight,
        rawPricePerKg: parseFloat(batchRawPrice) || 0,
      });

      toast.success(`Партия ${res.data.batchNumber} успешно запущена!`);
      setIsStartBatchModalOpen(false);
      setBatchRawWeight('');
      setBatchRawPrice('');
      setActiveSection('batches');
      fetchAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка старта партии');
    } finally {
      setIsStartingBatch(false);
    }
  };

  // Завершение партии (Технолог фиксирует вес готовой продукции)
  const handleCompleteBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingBatch) return;

    const outWeight = parseFloat(finalWeightInput);
    if (!outWeight || outWeight <= 0) {
      toast.error('Укажите корректный вес готовой продукции');
      return;
    }

    try {
      setIsCompleting(true);
      const res = await api.post(`/api/tech-cards/batches/${completingBatch.id}/complete`, {
        finalWeight: outWeight,
      });

      toast.success(
        `Партия ${res.data.batchNumber} закрыта! Себестоимость: ${res.data.costPerKg} ₽/кг (Выход: ${res.data.outputPercent}%)`
      );
      setCompletingBatch(null);
      setFinalWeightInput('');
      fetchAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка завершения партии');
    } finally {
      setIsCompleting(false);
    }
  };

  // Статистика для карточек сверху
  const stats = useMemo(() => {
    const ingCount = ingredients.filter((i) => i.type === 'INGREDIENT').length;
    const matCount = ingredients.filter((i) => i.type === 'MATERIAL').length;
    const tplCount = templates.length;
    const activeBatchesCount = batches.filter((b) => b.status === 'CREATED' || b.status === 'IN_PROGRESS').length;
    return { ingCount, matCount, tplCount, activeBatchesCount };
  }, [ingredients, templates, batches]);

  return (
    <div className='space-y-6'>
      {/* Верхний баннер и краткая сводка */}
      <div className='relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 sm:p-8 text-white shadow-xl shadow-slate-950/20'>
        <div className='relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6'>
          <div className='space-y-2 max-w-2xl'>
            <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-bold uppercase tracking-wider'>
              <ChefHat className='w-4 h-4 text-teal-400' />
              <span>Технологические карты & Производство</span>
            </div>
            <h1 className='text-2xl sm:text-3xl font-black tracking-tight text-white'>
              Расчёт сырьевой себестоимости и контроль цеха
            </h1>
            <p className='text-slate-300 text-xs sm:text-sm leading-relaxed'>
              Эталонные рецептуры, точные нормы расхода соли, специй и упаковки. Пошаговый контроль внесения добавок с защитой от лени (антифрод) и автоматический расчёт цены 1 кг готовой продукции.
            </p>
          </div>

          <div className='flex items-center gap-3 flex-wrap'>
            <button
              type='button'
              onClick={() => setIsStartBatchModalOpen(true)}
              className='inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-teal-500/25 cursor-pointer'
            >
              <Flame className='w-4 h-4 text-amber-300 animate-pulse' />
              <span>Запустить партию (Цех)</span>
            </button>
          </div>
        </div>

        {/* Информационные плашки */}
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800/80'>
          <div className='bg-white/5 rounded-2xl p-3 border border-white/5'>
            <div className='text-slate-400 text-[11px] font-medium'>Ингредиенты</div>
            <div className='text-xl font-black text-teal-300 mt-1'>{stats.ingCount} поз.</div>
            <div className='text-[10px] text-slate-400'>Специи, соль, добавки</div>
          </div>
          <div className='bg-white/5 rounded-2xl p-3 border border-white/5'>
            <div className='text-slate-400 text-[11px] font-medium'>Материалы</div>
            <div className='text-xl font-black text-indigo-300 mt-1'>{stats.matCount} поз.</div>
            <div className='text-[10px] text-slate-400'>Пакеты, шпагат, подложка</div>
          </div>
          <div className='bg-white/5 rounded-2xl p-3 border border-white/5'>
            <div className='text-slate-400 text-[11px] font-medium'>Тех. карты</div>
            <div className='text-xl font-black text-emerald-300 mt-1'>{stats.tplCount} шт.</div>
            <div className='text-[10px] text-slate-400'>Эталонные рецептуры</div>
          </div>
          <div className='bg-white/5 rounded-2xl p-3 border border-white/5'>
            <div className='text-slate-400 text-[11px] font-medium'>В работе в цеху</div>
            <div className='text-xl font-black text-amber-300 mt-1'>{stats.activeBatchesCount} партий</div>
            <div className='text-[10px] text-slate-400'>На засоле / копчении</div>
          </div>
        </div>
      </div>

      {/* Навигация по подразделам вкладки */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs'>
        <div className='flex items-center gap-1.5 flex-wrap'>
          <button
            type='button'
            onClick={() => setActiveSection('ingredients')}
            className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeSection === 'ingredients'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Boxes className='w-4 h-4 text-teal-400' />
            <span>Справочник ингредиентов</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeSection === 'ingredients' ? 'bg-slate-800 text-teal-300' : 'bg-slate-100 text-slate-600'
            }`}>
              {stats.ingCount}
            </span>
          </button>

          <button
            type='button'
            onClick={() => setActiveSection('materials')}
            className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeSection === 'materials'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Package className='w-4 h-4 text-indigo-400' />
            <span>Справочник материалов</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeSection === 'materials' ? 'bg-slate-800 text-indigo-300' : 'bg-slate-100 text-slate-600'
            }`}>
              {stats.matCount}
            </span>
          </button>

          <button
            type='button'
            onClick={() => setActiveSection('templates')}
            className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeSection === 'templates'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ScrollText className='w-4 h-4 text-emerald-400' />
            <span>Шаблоны тех. карт</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeSection === 'templates' ? 'bg-slate-800 text-emerald-300' : 'bg-slate-100 text-slate-600'
            }`}>
              {stats.tplCount}
            </span>
          </button>

          <button
            type='button'
            onClick={() => setActiveSection('batches')}
            className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeSection === 'batches'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Flame className='w-4 h-4 text-amber-500' />
            <span>Партии в цеху (Технолог)</span>
            {stats.activeBatchesCount > 0 ? (
              <span className='px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse'>
                {stats.activeBatchesCount} в работе
              </span>
            ) : null}
          </button>
        </div>

        {/* Быстрый поиск */}
        {(activeSection === 'ingredients' || activeSection === 'materials') && (
          <div className='relative w-full sm:w-64'>
            <Search className='w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Поиск по названию/арт...'
              className='w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition'
            />
          </div>
        )}
      </div>

      {/* =====================================================================
          РАЗДЕЛ: СПРАВОЧНИК ИНГРЕДИЕНТОВ И МАТЕРИАЛОВ
         ===================================================================== */}
      {(activeSection === 'ingredients' || activeSection === 'materials') && (
        <div className='space-y-4'>
          {/* Панель управления справочником */}
          <div className='flex items-center justify-between gap-4 flex-wrap'>
            <div>
              <h2 className='text-lg font-black text-slate-900 flex items-center gap-2'>
                {activeSection === 'ingredients' ? 'Справочник специй и ингредиентов' : 'Справочник упаковки и вспомогательных материалов'}
              </h2>
              <p className='text-xs text-slate-500'>
                {isAdmin
                  ? 'Вы можете создавать элементы, указывать цены закупки и фасовочный вес. Технолог использует эти данные в рецептах без возможности менять цену.'
                  : 'Просмотр доступных компонентов рецептуры.'}
              </p>
            </div>

            {isAdmin && (
              <button
                type='button'
                onClick={() => handleOpenIngredientModal()}
                className='inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition shadow-sm cursor-pointer'
              >
                <Plus className='w-4 h-4' />
                <span>{activeSection === 'ingredients' ? 'Создать ингредиент' : 'Создать материал'}</span>
              </button>
            )}
          </div>

          {/* Таблица элементов справочника */}
          <div className='bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs'>
            <div className='overflow-x-auto'>
              <table className='w-full text-left text-xs'>
                <thead className='bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]'>
                  <tr>
                    <th className='py-3.5 px-4'>Наименование</th>
                    <th className='py-3.5 px-4'>Ед. изм.</th>
                    <th className='py-3.5 px-4'>Фасовка / Вес</th>
                    {isAdmin && <th className='py-3.5 px-4 text-right'>Стоимость (₽)</th>}
                    <th className='py-3.5 px-4'>Примечание</th>
                    <th className='py-3.5 px-4 text-center'>В тех. картах</th>
                    {isAdmin && <th className='py-3.5 px-4 text-right'>Действия</th>}
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {filteredIngredients.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 5} className='py-12 text-center text-slate-400'>
                        <Boxes className='w-8 h-8 mx-auto text-slate-300 mb-2' />
                        <p className='font-bold text-sm text-slate-600'>Ничего не найдено</p>
                        <p className='text-xs mt-1'>
                          {isAdmin
                            ? 'Нажмите кнопку "Создать", чтобы добавить позицию в справочник'
                            : 'Справочник пока пуст'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredIngredients.map((item) => (
                      <tr key={item.id} className='hover:bg-slate-50/60 transition group'>
                        <td className='py-3 px-4'>
                          <div className='font-bold text-slate-900'>{item.name}</div>
                          {item.article && (
                            <div className='text-[10px] text-slate-400 font-mono mt-0.5'>
                              Арт: {item.article}
                            </div>
                          )}
                        </td>
                        <td className='py-3 px-4'>
                          <span className='inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200'>
                            {item.unit}
                          </span>
                        </td>
                        <td className='py-3 px-4 text-slate-600 font-medium'>
                          {item.packageWeight ? `${item.packageWeight} ${item.unit}` : '1 ед.'}
                        </td>
                        {isAdmin && (
                          <td className='py-3 px-4 text-right'>
                            <div className='font-extrabold text-slate-900 text-sm'>
                              {item.price?.toLocaleString('ru-RU')} ₽
                            </div>
                            <div className='text-[10px] text-slate-400'>за 1 {item.unit}</div>
                          </td>
                        )}
                        <td className='py-3 px-4 text-slate-500 max-w-xs truncate' title={item.comment || ''}>
                          {item.comment || '—'}
                        </td>
                        <td className='py-3 px-4 text-center'>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            (item._count?.recipeItems || 0) > 0
                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : 'bg-slate-100 text-slate-400'
                          }`}>
                            {item._count?.recipeItems || 0} карт
                          </span>
                        </td>
                        {isAdmin && (
                          <td className='py-3 px-4 text-right space-x-1'>
                            <button
                              type='button'
                              onClick={() => handleOpenIngredientModal(item)}
                              className='p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition cursor-pointer'
                              title='Редактировать'
                            >
                              <Pencil className='w-3.5 h-3.5' />
                            </button>
                            <button
                              type='button'
                              onClick={() => handleDeleteIngredient(item.id, item.name)}
                              className='p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer'
                              title='Удалить'
                            >
                              <Trash2 className='w-3.5 h-3.5' />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          РАЗДЕЛ: ШАБЛОНЫ ТЕХ. КАРТ
         ===================================================================== */}
      {activeSection === 'templates' && (
        <div className='space-y-4'>
          <div className='flex items-center justify-between gap-4 flex-wrap'>
            <div>
              <h2 className='text-lg font-black text-slate-900 flex items-center gap-2'>
                Шаблоны технологических карт
              </h2>
              <p className='text-xs text-slate-500'>
                Эталонные рецептуры. Технолог выбирает готовую техкарту при запуске партии и не может менять пропорции.
              </p>
            </div>

            {isAdmin && (
              <button
                type='button'
                onClick={() => handleOpenTemplateModal()}
                className='inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm cursor-pointer'
              >
                <Plus className='w-4 h-4' />
                <span>Создать тех. карту</span>
              </button>
            )}
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {templates.length === 0 ? (
              <div className='col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200'>
                <ScrollText className='w-8 h-8 mx-auto text-slate-300 mb-2' />
                <p className='font-bold text-sm text-slate-600'>Шаблоны пока не созданы</p>
                <p className='text-xs mt-1'>
                  {isAdmin ? 'Нажмите "Создать тех. карту", чтобы привязать ингредиенты к позиции из прайса' : 'Ожидайте создания рецептур Администратором'}
                </p>
              </div>
            ) : (
              templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className='bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-teal-300 hover:shadow-md transition flex flex-col justify-between'
                >
                  <div className='space-y-3'>
                    <div className='flex items-start justify-between gap-2'>
                      <div>
                        <span className='inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 mb-1'>
                          Базовый вес: {tpl.baseWeight} кг
                        </span>
                        <h3 className='font-extrabold text-slate-900 text-base leading-snug'>
                          {tpl.productName}
                        </h3>
                      </div>
                      <div className='flex items-center gap-2'>
                        <div className='text-right'>
                          <div className='text-[10px] text-slate-400 font-medium'>Выход:</div>
                          <div className='font-black text-emerald-600 text-sm'>{tpl.targetOutputPercent || 70}%</div>
                        </div>
                        {isAdmin && (
                          <div className='flex items-center gap-1 pl-2 border-l border-slate-100'>
                            <button
                              type='button'
                              onClick={() => handleOpenTemplateModal(tpl)}
                              className='p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition cursor-pointer'
                              title='Редактировать тех. карту'
                            >
                              <Pencil className='w-3.5 h-3.5' />
                            </button>
                            <button
                              type='button'
                              onClick={() => handleDeleteTemplate(tpl.id, tpl.productName)}
                              className='p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer'
                              title='Удалить тех. карту'
                            >
                              <Trash2 className='w-3.5 h-3.5' />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Состав рецепта */}
                    <div className='bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs'>
                      <div className='text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1'>
                        Ингредиенты на {tpl.baseWeight} кг сырья:
                      </div>
                      {tpl.items.length === 0 ? (
                        <div className='text-slate-400 text-[11px] italic'>Состав еще не заполнен</div>
                      ) : (
                        tpl.items.slice(0, 4).map((it, idx) => (
                          <div key={idx} className='flex items-center justify-between text-slate-700'>
                            <span className='truncate pr-2 font-medium'>{it.name}</span>
                            <span className='font-bold text-slate-900 shrink-0'>
                              {it.amount} {it.unit}
                            </span>
                          </div>
                        ))
                      )}
                      {tpl.items.length > 4 && (
                        <div className='text-[10px] text-teal-600 font-bold pt-1'>
                          + ещё {tpl.items.length - 4} поз.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Кнопка запуска партии */}
                  <div className='mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2'>
                    <span className='text-[11px] text-slate-400'>
                      Партий: <strong className='text-slate-700'>{tpl._count?.batches || 0}</strong>
                    </span>
                    <button
                      type='button'
                      onClick={() => {
                        setSelectedTemplateForBatch(tpl.id);
                        setIsStartBatchModalOpen(true);
                      }}
                      className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs transition cursor-pointer'
                    >
                      <Flame className='w-3.5 h-3.5 text-amber-500' />
                      <span>В производство →</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          РАЗДЕЛ: ПАРТИИ В ЦЕХУ (ТЕХНОЛОГ / ПРОИЗВОДСТВЕННЫЙ ПРОЦЕСС)
         ===================================================================== */}
      {activeSection === 'batches' && (
        <div className='space-y-4'>
          <div className='flex items-center justify-between gap-4 flex-wrap'>
            <div>
              <h2 className='text-lg font-black text-slate-900 flex items-center gap-2'>
                Производственные партии в цеху
              </h2>
              <p className='text-xs text-slate-500'>
                Технолог взвешивает сырье после разморозки, добавляет ингредиенты по чек-листу и фиксирует итоговый вес готовой рыбы.
              </p>
            </div>

            <button
              type='button'
              onClick={() => setIsStartBatchModalOpen(true)}
              className='inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition shadow-sm cursor-pointer'
            >
              <Plus className='w-4 h-4' />
              <span>Запустить новую партию</span>
            </button>
          </div>

          <div className='space-y-4'>
            {batches.length === 0 ? (
              <div className='py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200'>
                <Flame className='w-8 h-8 mx-auto text-amber-400 mb-2' />
                <p className='font-bold text-sm text-slate-600'>Нет активных партий</p>
                <p className='text-xs mt-1'>Нажмите "Запустить новую партию", чтобы начать процесс приготовления</p>
              </div>
            ) : (
              batches.map((batch) => {
                const totalChecklist = batch.checklist?.length || 0;
                const checkedCount = batch.checklist?.filter((i) => i.isChecked).length || 0;
                const progressPercent = totalChecklist > 0 ? Math.round((checkedCount / totalChecklist) * 100) : 0;

                return (
                  <div
                    key={batch.id}
                    className={`bg-white rounded-2xl border transition-all p-5 sm:p-6 shadow-xs ${
                      batch.status === 'IN_PROGRESS'
                        ? 'border-amber-300 ring-2 ring-amber-100 bg-gradient-to-r from-amber-50/20 via-white to-white'
                        : batch.status === 'COMPLETED'
                        ? 'border-emerald-200'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Шапка партии */}
                    <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100'>
                      <div className='space-y-1'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <span className='font-mono text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md'>
                            {batch.batchNumber}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              batch.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : batch.status === 'IN_PROGRESS'
                                ? 'bg-amber-100 text-amber-800 animate-pulse'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {batch.status === 'COMPLETED'
                              ? 'Завершена'
                              : batch.status === 'IN_PROGRESS'
                              ? 'В работе (На копчении)'
                              : 'Создана (Внесение специй)'}
                          </span>
                          {batch.isSuspiciousSpeed && (
                            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200' title={batch.speedComment || ''}>
                              <ShieldAlert className='w-3 h-3 text-rose-600' />
                              <span>Антифрод: подозрительно быстро</span>
                            </span>
                          )}
                        </div>
                        <h3 className='text-lg font-black text-slate-900'>{batch.productName}</h3>
                        <div className='text-xs text-slate-500'>
                          Технолог: <strong className='text-slate-700'>{batch.technologistName || 'Сотрудник цеха'}</strong> • Начало:{' '}
                          {new Date(batch.startedAt).toLocaleString('ru-RU')}
                        </div>
                      </div>

                      {/* Весовые показатели и действия */}
                      <div className='flex items-center gap-3 sm:gap-4 text-right flex-wrap justify-end'>
                        <div className='bg-slate-50 p-2.5 rounded-xl border border-slate-100'>
                          <div className='text-[10px] text-slate-400 font-bold uppercase'>Сырье (дефрост)</div>
                          <div className='text-base font-black text-slate-900'>{batch.rawWeight} кг</div>
                        </div>

                        {batch.status === 'COMPLETED' ? (
                          <>
                            <div className='bg-emerald-50 p-2.5 rounded-xl border border-emerald-100'>
                              <div className='text-[10px] text-emerald-600 font-bold uppercase'>Готовая рыба</div>
                              <div className='text-base font-black text-emerald-700'>{batch.finalWeight} кг</div>
                            </div>
                            <div className='bg-emerald-50 p-2.5 rounded-xl border border-emerald-100'>
                              <div className='text-[10px] text-emerald-600 font-bold uppercase'>Себестоимость</div>
                              <div className='text-base font-black text-emerald-700'>{batch.costPerKg} ₽/кг</div>
                            </div>
                          </>
                        ) : (
                          <button
                            type='button'
                            onClick={() => {
                              setCompletingBatch(batch);
                              setFinalWeightInput('');
                            }}
                            className='inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20 cursor-pointer'
                          >
                            <Scale className='w-4 h-4' />
                            <span>Ввести готовый вес →</span>
                          </button>
                        )}

                        {/* Кнопки редактирования и удаления партии */}
                        <div className='flex items-center gap-1 pl-2 border-l border-slate-200'>
                          <button
                            type='button'
                            onClick={() => handleOpenEditBatch(batch)}
                            className='p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition cursor-pointer'
                            title='Редактировать партию'
                          >
                            <Pencil className='w-4 h-4' />
                          </button>
                          <button
                            type='button'
                            onClick={() => handleDeleteBatch(batch.id, batch.batchNumber, batch.productName)}
                            className='p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer'
                            title='Удалить партию'
                          >
                            <Trash2 className='w-4 h-4' />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Чек-лист специй и добавок (Защита от лени / Антифрод) */}
                    <div className='mt-4 space-y-2.5'>
                      <div className='flex items-center justify-between text-xs'>
                        <span className='font-bold text-slate-700 flex items-center gap-1.5'>
                          <span>Чек-лист добавок (на {batch.rawWeight} кг сырья):</span>
                          <span className='text-slate-400 font-normal'>
                            ({checkedCount} из {totalChecklist} внесено)
                          </span>
                        </span>
                        <span className='font-extrabold text-teal-600'>{progressPercent}%</span>
                      </div>

                      {/* Прогресс-бар */}
                      <div className='w-full h-2 bg-slate-100 rounded-full overflow-hidden'>
                        <div
                          className='h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-300'
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      {/* Сетка чекбоксов */}
                      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3'>
                        {batch.checklist?.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              if (batch.status !== 'COMPLETED') {
                                handleToggleChecklistItem(batch.id, item.id, item.isChecked);
                              }
                            }}
                            className={`flex items-start justify-between p-2.5 rounded-xl border transition-all select-none cursor-pointer ${
                              item.isChecked
                                ? 'bg-teal-50/70 border-teal-200 text-teal-900'
                                : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-700'
                            }`}
                          >
                            <div className='flex items-start gap-2.5'>
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition ${
                                  item.isChecked
                                    ? 'bg-teal-600 border-teal-600 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {item.isChecked && <Check className='w-3 h-3 stroke-[3]' />}
                              </div>
                              <div>
                                <div className={`text-xs font-bold leading-snug ${item.isChecked ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                  {item.name}
                                </div>
                                <div className='text-[10px] text-slate-500 mt-0.5'>
                                  Нужно: <strong className='text-slate-800'>{item.targetAmount} {item.unit}</strong>
                                </div>
                              </div>
                            </div>

                            {/* Время отметки под капотом */}
                            {item.checkedAt && (
                              <div className='text-[9px] text-teal-700/80 font-mono text-right shrink-0'>
                                <div>{new Date(item.checkedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                                {item.clickDelaySeconds !== null && item.clickDelaySeconds !== undefined && (
                                  <div className='text-slate-400'>+{item.clickDelaySeconds}с</div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          МОДАЛКА: СОЗДАНИЕ / РЕДАКТИРОВАНИЕ ИНГРЕДИЕНТА ИЛИ МАТЕРИАЛА
         ===================================================================== */}
      {isIngredientModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4'>
          <div className='bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative'>
            <button
              type='button'
              onClick={() => setIsIngredientModalOpen(false)}
              className='absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer'
            >
              <X className='w-5 h-5' />
            </button>

            <h3 className='text-lg font-black text-slate-900 mb-1'>
              {editingIngredient ? 'Редактировать позицию' : 'Добавить в справочник'}
            </h3>
            <p className='text-xs text-slate-500 mb-5'>
              Только Администратор может задавать цены и параметры расхода
            </p>

            <form onSubmit={handleSaveIngredient} className='space-y-4'>
              <div>
                <label className='block text-xs font-bold text-slate-700 mb-1'>
                  Наименование *
                </label>
                <input
                  type='text'
                  required
                  placeholder='Например, УНИФРЕШ 80 или Вакуумный пакет'
                  value={ingredientForm.name}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })}
                  className='w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium'
                />
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-xs font-bold text-slate-700 mb-1'>
                    Тип позиции
                  </label>
                  <select
                    value={ingredientForm.type}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, type: e.target.value as any })}
                    className='w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500'
                  >
                    <option value='INGREDIENT'>Ингредиент (специя/соль/вода)</option>
                    <option value='MATERIAL'>Материал (упаковка/шпагат)</option>
                  </select>
                </div>

                <div>
                  <label className='block text-xs font-bold text-slate-700 mb-1'>
                    Единица измерения
                  </label>
                  <select
                    value={ingredientForm.unit}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })}
                    className='w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500'
                  >
                    <option value='kg'>кг (килограмм)</option>
                    <option value='л'>л (литр)</option>
                    <option value='г'>г (грамм)</option>
                    <option value='мл'>мл (миллилитр)</option>
                    <option value='шт'>шт (штука)</option>
                    <option value='м'>м (метр)</option>
                  </select>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-xs font-bold text-slate-700 mb-1'>
                    Стоимость за 1 ед. (₽) *
                  </label>
                  <input
                    type='number'
                    step='0.01'
                    min='0'
                    required
                    placeholder='0.00'
                    value={ingredientForm.price || ''}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, price: parseFloat(e.target.value) || 0 })}
                    className='w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-extrabold'
                  />
                </div>

                <div>
                  <label className='block text-xs font-bold text-slate-700 mb-1'>
                    Вес упаковки / фасовка (кг)
                  </label>
                  <input
                    type='number'
                    step='0.1'
                    min='0.1'
                    placeholder='1'
                    value={ingredientForm.packageWeight || ''}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, packageWeight: parseFloat(e.target.value) || 1 })}
                    className='w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium'
                  />
                </div>
              </div>

              <div>
                <label className='block text-xs font-bold text-slate-700 mb-1'>
                  Артикул поставщика (опционально)
                </label>
                <input
                  type='text'
                  placeholder='Например, арт. 76536420'
                  value={ingredientForm.article}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, article: e.target.value })}
                  className='w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono text-[11px]'
                />
              </div>

              <div>
                <label className='block text-xs font-bold text-slate-700 mb-1'>
                  Примечание / назначение
                </label>
                <textarea
                  rows={2}
                  placeholder='Для какого посола, дозировка или условия...'
                  value={ingredientForm.comment}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, comment: e.target.value })}
                  className='w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500'
                />
              </div>

              <div className='flex items-center justify-end gap-2 pt-3 border-t border-slate-100'>
                <button
                  type='button'
                  onClick={() => setIsIngredientModalOpen(false)}
                  className='px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer'
                >
                  Отмена
                </button>
                <button
                  type='submit'
                  className='px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-sm cursor-pointer'
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          МОДАЛКА: ЗАПУСК ПАРТИИ (ТЕХНОЛОГ ВВОДИТ ВЕС ДЕФРОСТА)
         ===================================================================== */}
      {isStartBatchModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4'>
          <div className='bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative'>
            <button
              type='button'
              onClick={() => setIsStartBatchModalOpen(false)}
              className='absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer'
            >
              <X className='w-5 h-5' />
            </button>

            <div className='flex items-center gap-2 mb-1'>
              <div className='w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center'>
                <Flame className='w-4 h-4' />
              </div>
              <h3 className='text-lg font-black text-slate-900'>Запуск партии в цеху</h3>
            </div>
            <p className='text-xs text-slate-500 mb-5'>
              Шаг 1: выберите позицию и введите вес дефростированного сырья после разморозки
            </p>

            <form onSubmit={handleStartBatch} className='space-y-4'>
              <div>
                <label className='block text-xs font-bold text-slate-700 mb-1'>
                  Что готовим? (Тех. карта) *
                </label>
                <select
                  required
                  value={selectedTemplateForBatch}
                  onChange={(e) => setSelectedTemplateForBatch(e.target.value)}
                  className='w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold'
                >
                  <option value=''>-- Выберите рецептуру --</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.productName} (база: {tpl.baseWeight} кг)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className='block text-xs font-bold text-slate-700 mb-1'>
                  Фактический вес сырья (дефрост, кг) *
                </label>
                <input
                  type='number'
                  step='0.1'
                  min='0.1'
                  required
                  placeholder='Например, 90 или 100'
                  value={batchRawWeight}
                  onChange={(e) => setBatchRawWeight(e.target.value)}
                  className='w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500'
                />
                <span className='text-[10px] text-slate-400 mt-1 block'>
                  Система автоматически пересчитает количество соли и всех добавок под этот точный вес
                </span>
              </div>

              {isAdmin && (
                <div>
                  <label className='block text-xs font-bold text-slate-700 mb-1'>
                    Цена закупки сырья (₽/кг, если известна)
                  </label>
                  <input
                    type='number'
                    step='0.01'
                    placeholder='0.00'
                    value={batchRawPrice}
                    onChange={(e) => setBatchRawPrice(e.target.value)}
                    className='w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-semibold'
                  />
                </div>
              )}

              <div className='flex items-center justify-end gap-2 pt-3 border-t border-slate-100'>
                <button
                  type='button'
                  onClick={() => setIsStartBatchModalOpen(false)}
                  className='px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer'
                >
                  Отмена
                </button>
                <button
                  type='submit'
                  disabled={isStartingBatch}
                  className='px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black transition shadow-md shadow-teal-600/20 cursor-pointer disabled:opacity-50'
                >
                  {isStartingBatch ? 'Создание...' : 'Начать приготовление →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          МОДАЛКА: ЗАВЕРШЕНИЕ ПАРТИИ (ВВОД ВЕСА ГОТОВОЙ РЫБЫ ПОСЛЕ КОПЧЕНИЯ)
         ===================================================================== */}
      {completingBatch && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4'>
          <div className='bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative'>
            <button
              type='button'
              onClick={() => setCompletingBatch(null)}
              className='absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer'
            >
              <X className='w-5 h-5' />
            </button>

            <div className='flex items-center gap-2 mb-1'>
              <div className='w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center'>
                <Scale className='w-4 h-4' />
              </div>
              <h3 className='text-lg font-black text-slate-900'>Фиксация готовой продукции</h3>
            </div>
            <p className='text-xs text-slate-500 mb-4'>
              Партия: <strong className='text-slate-800'>{completingBatch.batchNumber}</strong> ({completingBatch.productName})
            </p>

            <div className='bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-4 text-xs space-y-1'>
              <div className='flex justify-between text-slate-600'>
                <span>Исходное сырье (дефрост):</span>
                <strong className='text-slate-900'>{completingBatch.rawWeight} кг</strong>
              </div>
              <div className='flex justify-between text-slate-600'>
                <span>Плановый выход:</span>
                <strong className='text-emerald-700'>{completingBatch.techCard?.targetOutputPercent || 70}%</strong>
              </div>
            </div>

            <form onSubmit={handleCompleteBatch} className='space-y-4'>
              <div>
                <label className='block text-xs font-bold text-slate-700 mb-1'>
                  Вес после термообработки / фасовки (кг) *
                </label>
                <input
                  type='number'
                  step='0.1'
                  min='0.1'
                  required
                  autoFocus
                  placeholder='Например, 72.5'
                  value={finalWeightInput}
                  onChange={(e) => setFinalWeightInput(e.target.value)}
                  className='w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                />
                <span className='text-[10px] text-slate-400 mt-1 block'>
                  Система автоматически вычислит потери в камере, процент выхода и честную себестоимость 1 кг
                </span>
              </div>

              <div className='flex items-center justify-end gap-2 pt-3 border-t border-slate-100'>
                <button
                  type='button'
                  onClick={() => setCompletingBatch(null)}
                  className='px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer'
                >
                  Отмена
                </button>
                <button
                  type='submit'
                  disabled={isCompleting}
                  className='px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50'
                >
                  {isCompleting ? 'Расчёт...' : 'Завершить партию →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          МОДАЛКА: СОЗДАНИЕ ШАБЛОНА ТЕХ. КАРТЫ (ТОЛЬКО АДМИН)
         ===================================================================== */}
      {isTemplateModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto'>
          <div className='bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8'>
            <button
              type='button'
              onClick={() => {
                setIsTemplateModalOpen(false);
                setEditingTemplate(null);
              }}
              className='absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer'
            >
              <X className='w-5 h-5' />
            </button>

            <h3 className='text-xl font-black text-slate-900 mb-1'>
              {editingTemplate ? `Редактирование тех. карты: ${editingTemplate.productName}` : 'Создание шаблона тех. карты'}
            </h3>
            <p className='text-xs text-slate-500 mb-6'>
              {editingTemplate ? 'Измените пропорции ингредиентов и плановые параметры выхода' : 'Выберите позицию из прайса и добавьте нормы расхода ингредиентов и упаковки на базовый вес'}
            </p>

            <div className='space-y-5'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-xs font-bold text-slate-700 mb-1'>
                    Позиция из прайс-листа *
                  </label>
                  <input
                    type='text'
                    list='products-datalist'
                    placeholder='Например, Кета соломка'
                    value={templateForm.productName}
                    onChange={(e) => setTemplateForm({ ...templateForm, productName: e.target.value })}
                    className='w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold'
                  />
                  <datalist id='products-datalist'>
                    {productsList.map((p, idx) => (
                      <option key={idx} value={p.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className='block text-xs font-bold text-slate-700 mb-1'>
                    Базовый вес сырья (кг) *
                  </label>
                  <input
                    type='number'
                    step='1'
                    min='1'
                    value={templateForm.baseWeight}
                    onChange={(e) => setTemplateForm({ ...templateForm, baseWeight: parseFloat(e.target.value) || 100 })}
                    className='w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold'
                  />
                  <span className='text-[10px] text-slate-400'>Обычно 100 кг (удобно задавать проценты как килограммы)</span>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-xs font-bold text-slate-700 mb-1'>
                    Плановый выход готовой рыбы (%)
                  </label>
                  <input
                    type='number'
                    step='1'
                    value={templateForm.targetOutputPercent}
                    onChange={(e) => setTemplateForm({ ...templateForm, targetOutputPercent: parseFloat(e.target.value) || 70 })}
                    className='w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-emerald-600'
                  />
                </div>

                <div>
                  <label className='block text-xs font-bold text-slate-700 mb-1'>
                    Плановые потери в камере (%)
                  </label>
                  <input
                    type='number'
                    step='1'
                    value={templateForm.lossPercent}
                    onChange={(e) => setTemplateForm({ ...templateForm, lossPercent: parseFloat(e.target.value) || 30 })}
                    className='w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-amber-600'
                  />
                </div>
              </div>

              {/* Состав рецепта: добавление ингредиентов */}
              <div className='space-y-3 pt-3 border-t border-slate-100'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-bold text-slate-800 uppercase tracking-wider'>
                    Состав рецепта (на {templateForm.baseWeight} кг сырья):
                  </span>
                  <button
                    type='button'
                    onClick={() => {
                      if (ingredients.length === 0) {
                        toast.error('Сначала добавьте позиции в справочник');
                        return;
                      }
                      const first = ingredients[0];
                      setTemplateForm({
                        ...templateForm,
                        items: [
                          ...templateForm.items,
                          {
                            ingredientId: first.id,
                            name: first.name,
                            type: first.type,
                            amount: 1,
                            unit: first.unit,
                          },
                        ],
                      });
                    }}
                    className='inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-bold transition cursor-pointer'
                  >
                    <Plus className='w-3.5 h-3.5' />
                    <span>Добавить компонент</span>
                  </button>
                </div>

                {templateForm.items.length === 0 ? (
                  <div className='text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs'>
                    Нажмите кнопку «Добавить компонент», чтобы внести соль, специи или упаковку
                  </div>
                ) : (
                  <div className='space-y-2 max-h-60 overflow-y-auto pr-1'>
                    {templateForm.items.map((it, idx) => (
                      <div key={idx} className='flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200'>
                        <select
                          value={it.ingredientId}
                          onChange={(e) => {
                            const found = ingredients.find((i) => i.id === e.target.value);
                            if (found) {
                              const next = [...templateForm.items];
                              next[idx] = {
                                ...next[idx],
                                ingredientId: found.id,
                                name: found.name,
                                type: found.type,
                                unit: found.unit,
                              };
                              setTemplateForm({ ...templateForm, items: next });
                            }
                          }}
                          className='flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800'
                        >
                          {ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({ing.unit})
                            </option>
                          ))}
                        </select>

                        <input
                          type='number'
                          step='0.001'
                          min='0'
                          placeholder='Норма'
                          value={it.amount}
                          onChange={(e) => {
                            const next = [...templateForm.items];
                            next[idx].amount = parseFloat(e.target.value) || 0;
                            setTemplateForm({ ...templateForm, items: next });
                          }}
                          className='w-24 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-extrabold text-slate-900'
                        />

                        <span className='text-xs font-bold text-slate-500 w-10'>{it.unit}</span>

                        <button
                          type='button'
                          onClick={() => {
                            const next = templateForm.items.filter((_, i) => i !== idx);
                            setTemplateForm({ ...templateForm, items: next });
                          }}
                          className='p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer'
                        >
                          <X className='w-4 h-4' />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className='flex items-center justify-end gap-2 pt-4 border-t border-slate-100'>
                <button
                  type='button'
                  onClick={() => {
                    setIsTemplateModalOpen(false);
                    setEditingTemplate(null);
                  }}
                  className='px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer'
                >
                  Отмена
                </button>
                <button
                  type='button'
                  onClick={async () => {
                    if (!templateForm.productName.trim()) {
                      toast.error('Укажите название позиции');
                      return;
                    }
                    try {
                      if (editingTemplate) {
                        await api.put(`/api/tech-cards/templates/${editingTemplate.id}`, templateForm);
                        toast.success(`Шаблон "${templateForm.productName}" обновлен!`);
                      } else {
                        await api.post('/api/tech-cards/templates', templateForm);
                        toast.success(`Шаблон "${templateForm.productName}" сохранен!`);
                      }
                      setIsTemplateModalOpen(false);
                      setEditingTemplate(null);
                      fetchAllData();
                    } catch (err: any) {
                      toast.error(err.response?.data?.error || 'Ошибка сохранения тех. карты');
                    }
                  }}
                  className='px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer'
                >
                  {editingTemplate ? 'Сохранить изменения' : 'Сохранить тех. карту'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          МОДАЛКА: РЕДАКТИРОВАНИЕ ПАРТИИ В ЦЕХУ
         ===================================================================== */}
      {isEditBatchModalOpen && editingBatch && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4'>
          <div className='bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative'>
            <button
              type='button'
              onClick={() => {
                setIsEditBatchModalOpen(false);
                setEditingBatch(null);
              }}
              className='absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer'
            >
              <X className='w-5 h-5' />
            </button>

            <div className='flex items-center gap-2 mb-1'>
              <div className='w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center'>
                <Pencil className='w-4 h-4' />
              </div>
              <h3 className='text-lg font-black text-slate-900'>Редактирование партии</h3>
            </div>
            <p className='text-xs text-slate-500 mb-5'>
              Партия: <strong className='text-slate-800'>{editingBatch.batchNumber}</strong> ({editingBatch.productName})
            </p>

            <form onSubmit={handleSaveEditBatch} className='space-y-4'>
              <div>
                <label className='block text-xs font-bold text-slate-700 mb-1'>
                  Статус партии
                </label>
                <select
                  value={batchEditForm.status}
                  onChange={(e) => setBatchEditForm({ ...batchEditForm, status: e.target.value as any })}
                  className='w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500'
                >
                  <option value='CREATED'>Создана (Внесение специй)</option>
                  <option value='IN_PROGRESS'>В работе (На копчении)</option>
                  <option value='COMPLETED'>Завершена</option>
                  <option value='CANCELLED'>Отменена</option>
                </select>
              </div>

              <div>
                <label className='block text-xs font-bold text-slate-700 mb-1'>
                  Фактический вес сырья (дефрост, кг) *
                </label>
                <input
                  type='number'
                  step='0.1'
                  min='0.1'
                  required
                  placeholder='Например, 100'
                  value={batchEditForm.rawWeight}
                  onChange={(e) => setBatchEditForm({ ...batchEditForm, rawWeight: e.target.value })}
                  className='w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500'
                />
                <span className='text-[10px] text-slate-400 mt-1 block'>
                  При изменении веса нормы специй в чек-листе автоматически пересчитаются
                </span>
              </div>

              {isAdmin && (
                <div>
                  <label className='block text-xs font-bold text-slate-700 mb-1'>
                    Цена закупки сырья (₽/кг)
                  </label>
                  <input
                    type='number'
                    step='0.01'
                    min='0'
                    placeholder='0.00'
                    value={batchEditForm.rawPricePerKg}
                    onChange={(e) => setBatchEditForm({ ...batchEditForm, rawPricePerKg: e.target.value })}
                    className='w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-semibold'
                  />
                </div>
              )}

              <div>
                <label className='block text-xs font-bold text-slate-700 mb-1'>
                  Вес готовой продукции (кг)
                </label>
                <input
                  type='number'
                  step='0.1'
                  min='0'
                  placeholder='Если рыба уже готова, укажите готовый вес'
                  value={batchEditForm.finalWeight}
                  onChange={(e) => setBatchEditForm({ ...batchEditForm, finalWeight: e.target.value })}
                  className='w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500'
                />
                <span className='text-[10px] text-slate-400 mt-1 block'>
                  При заполнении система пересчитает выход (%) и себестоимость
                </span>
              </div>

              <div className='flex items-center justify-end gap-2 pt-3 border-t border-slate-100'>
                <button
                  type='button'
                  onClick={() => {
                    setIsEditBatchModalOpen(false);
                    setEditingBatch(null);
                  }}
                  className='px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer'
                >
                  Отмена
                </button>
                <button
                  type='submit'
                  className='px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black transition shadow-md shadow-teal-600/20 cursor-pointer'
                >
                  Сохранить изменения
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
