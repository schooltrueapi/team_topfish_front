'use client'

import React, { useState, useEffect } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import {
   Search,
   CheckSquare,
   Square,
   Sparkles,
   AlertTriangle,
   Play,
   CheckCircle2,
   XCircle,
   HelpCircle,
   Filter,
   Layers,
   Calendar,
   Trash2,
   RefreshCw,
  Truck,
  Zap,
   User,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import BulkPlanModal, { BulkActionType } from './BulkPlanModal'

export interface PlanItem {
   id: string
   weekId?: string
   productName: string
   category?: string | null
   price?: number | null
   stockKg?: number | null
   isNew: boolean
   isPlanned: boolean
   lastUpdatedBy?: string | null
   createdAt?: string
   updatedAt?: string
   resultStatus?: string | null
   reasonComment?: string | null
   abcCategory?: 'A' | 'B' | 'C' | null
   rawAbcCategory?: 'A' | 'B' | 'C' | null
   salesPercent?: number | null
   salesHistoryWeeks?: number | null
   isHit?: boolean
   rawIsHit?: boolean
   abcConfirmedAt?: string | null
   abcExpiresAt?: string | null
   abcManualDisabled?: boolean
   smartMeta?: {
      tag: 'HIT_REPEAT' | 'LONG_TIME_NO_PLAN' | 'LAST_WEEK_UNFINISHED' | 'LOW_STOCK' | 'STAGNANT_STOCK' | null
      priority: number
      icon?: string
      badgeText: string
      shortBadge: string
      title?: string
      subtitle?: string
      tooltipText: string
      recommendation?: string
      prevWeekNumber?: number
      prevStockKg?: number | null
      currentStockKg?: number | null
      subType?: string | null
      prevResultStatus?: string | null
      prevComment?: string | null
      consecutiveWeeks?: number
      lastPlannedWeekNumber?: number
   } | null
}

export const getLongTimeStyles = (consecutiveWeeks?: number) => {
   const weeks = consecutiveWeeks || 2
   if (weeks <= 2) {
      return {
         badge: 'bg-yellow-100 text-yellow-900 border-yellow-300 hover:bg-yellow-200',
         row: 'bg-yellow-50/25 hover:bg-yellow-50/60 border-l-4 border-l-yellow-400',
         tooltipTitle: 'text-yellow-300',
         dot: 'bg-yellow-400',
         name: '2 нед.',
      }
   }
   if (weeks === 3) {
      return {
         badge: 'bg-orange-100 text-orange-950 border-orange-300 hover:bg-orange-200 font-extrabold',
         row: 'bg-orange-50/25 hover:bg-orange-50/60 border-l-4 border-l-orange-500',
         tooltipTitle: 'text-orange-400',
         dot: 'bg-orange-500',
         name: '3 нед.',
      }
   }
   if (weeks === 4) {
      return {
         badge: 'bg-red-100 text-red-950 border-red-400 hover:bg-red-200 font-extrabold',
         row: 'bg-red-50/25 hover:bg-red-50/60 border-l-4 border-l-red-500',
         tooltipTitle: 'text-red-400',
         dot: 'bg-red-500',
         name: '4 нед.',
      }
   }
   // 5+ недель (более 5 недель — черно-серый: забытые позиции без спроса, кандидаты на исключение)
   return {
      badge: 'bg-slate-900 text-slate-100 border border-slate-700 hover:bg-black font-black shadow-xs ring-1 ring-slate-800',
      row: 'bg-slate-100/40 hover:bg-slate-100/70 border-l-4 border-l-slate-900',
      tooltipTitle: 'text-slate-300',
      dot: 'bg-slate-900',
      name: '5+ нед.',
   }
}

interface ChecklistProps {
   weekId: string
   weekStatus: string
   weekNumber: number
   items: PlanItem[]
   currentFilter: string
   autoSyncPrice?: boolean
   isArchive?: boolean
   onToggleAutoSync?: () => void
   onFilterChange: (filter: string) => void
   onItemUpdated: (updatedItem: PlanItem) => void
   onItemDeleted?: (deletedId: string) => void
   onBulkUpdated: () => void
   onPlanConfirmed: () => void
   onOpenUpload: () => void
}

export default function Checklist({
   weekId,
   weekStatus,
   weekNumber,
   items,
   currentFilter,
   autoSyncPrice = true,
   isArchive = false,
   onToggleAutoSync,
   onFilterChange,
   onItemUpdated,
   onItemDeleted,
   onBulkUpdated,
   onPlanConfirmed,
   onOpenUpload,
}: ChecklistProps) {
   const { hasPermission } = useAuth()
   const isClosed = weekStatus === 'CLOSED' || isArchive
   const canTogglePlan = hasPermission('TOGGLE_PLAN') && !isClosed
   const canUpload1C = hasPermission('UPLOAD_1C') && !isClosed

   const [search, setSearch] = useState('')
   const [selectedCategory, setSelectedCategory] = useState('ALL')
   const [isTogglingId, setIsTogglingId] = useState<string | null>(null)
   const [isTogglingNewId, setIsTogglingNewId] = useState<string | null>(null)
   const [isTogglingAbcId, setIsTogglingAbcId] = useState<string | null>(null)
   const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
   const [isConfirmingPlan, setIsConfirmingPlan] = useState(false)
   const [isBulkLoading, setIsBulkLoading] = useState(false)
   const [bulkModalConfig, setBulkModalConfig] = useState<{
      isOpen: boolean
      actionType: BulkActionType
      title: string
      description?: string
      items: PlanItem[]
   } | null>(null)
   const [isSyncingPrice, setIsSyncingPrice] = useState(false)
   const [isSyncingDostavka, setIsSyncingDostavka] = useState(false)
   const [isSyncingAll, setIsSyncingAll] = useState(false)
   const [hoveredTooltip, setHoveredTooltip] = useState<{
      item: PlanItem
      rect: DOMRect
      customContent?: {
         icon: string
         title: string
         titleColor?: string
         subtitle?: string
         description: string
         recommendation?: string
         footerHint?: string
      }
   } | null>(null)
   const [longTimeDurationFilter, setLongTimeDurationFilter] = useState<'all' | '2' | '3' | '4' | '5plus'>('all')

   // Автоматическое скрытие кастомного тултипа при прокрутке таблицы/экрана
   useEffect(() => {
      if (!hoveredTooltip) return
      const handleDismiss = () => setHoveredTooltip(null)
      window.addEventListener('scroll', handleDismiss, { passive: true, capture: true })
      return () => window.removeEventListener('scroll', handleDismiss, { capture: true })
   }, [hoveredTooltip])

   // Категории
   const categories = [
      'ALL',
      ...Array.from(new Set(items.map((i) => i.category).filter(Boolean))),
   ]

   // Фильтрация элементов
   const filteredItems = items.filter((item) => {
      // Поиск
      if (
         search &&
         !item.productName.toLowerCase().includes(search.toLowerCase())
      ) {
         return false
      }
      // Категория
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
         return false
      }
      // Быстрый фильтр
      const isItemHit = !item.abcManualDisabled && (Boolean(item.isHit) || item.smartMeta?.tag === 'HIT_REPEAT')

      if (currentFilter === 'planned' && !item.isPlanned) return false
      if (currentFilter === 'unplanned' && item.isPlanned) return false
      if (currentFilter === 'hits' && !isItemHit) return false
      if (currentFilter === 'catA' && (item.abcCategory !== 'A' || isItemHit)) return false
      if (currentFilter === 'catB' && (item.abcCategory !== 'B' || isItemHit)) return false
      if (currentFilter === 'catC' && (item.abcCategory !== 'C' || isItemHit)) return false
      if (currentFilter === 'stagnant' && item.smartMeta?.tag !== 'STAGNANT_STOCK') return false
      if (currentFilter === 'longTime') {
         if (item.smartMeta?.tag !== 'LONG_TIME_NO_PLAN') return false
         const cw = item.smartMeta?.consecutiveWeeks || 2
         if (longTimeDurationFilter === '2' && cw > 2) return false
         if (longTimeDurationFilter === '3' && cw !== 3) return false
         if (longTimeDurationFilter === '4' && cw !== 4) return false
         if (longTimeDurationFilter === '5plus' && cw < 5) return false
      }
      if (currentFilter === 'unfinished' && item.smartMeta?.tag !== 'LAST_WEEK_UNFINISHED') return false
      if (currentFilter === 'novelties' && !item.isNew) return false
      if (currentFilter === 'outOfStock' && (item.stockKg ?? 0) > 0)
         return false
      if (currentFilter === 'result_completed' && (!item.isPlanned || item.resultStatus !== 'COMPLETED'))
         return false
      if (currentFilter === 'result_forgotten' && (!item.isPlanned || item.resultStatus !== 'FORGOTTEN'))
         return false
      if (currentFilter === 'result_no_raw' && (!item.isPlanned || item.resultStatus !== 'NO_RAW_MATERIAL'))
         return false
      if (currentFilter === 'result_other' && (!item.isPlanned || item.resultStatus !== 'OTHER'))
         return false

      return true
   })

   const plannedCount = items.filter((i) => i.isPlanned).length
   const hitsCount = items.filter((i) => !i.abcManualDisabled && (i.isHit || i.smartMeta?.tag === 'HIT_REPEAT')).length
   const catACount = items.filter((i) => !i.abcManualDisabled && i.abcCategory === 'A' && !i.isHit && i.smartMeta?.tag !== 'HIT_REPEAT').length
   const catBCount = items.filter((i) => !i.abcManualDisabled && i.abcCategory === 'B' && !i.isHit && i.smartMeta?.tag !== 'HIT_REPEAT').length
   const catCCount = items.filter((i) => !i.abcManualDisabled && i.abcCategory === 'C' && !i.isHit && i.smartMeta?.tag !== 'HIT_REPEAT').length
   const stagnantCount = items.filter((i) => i.smartMeta?.tag === 'STAGNANT_STOCK').length
   const longTimeCount = items.filter((i) => i.smartMeta?.tag === 'LONG_TIME_NO_PLAN').length
   const unfinishedCount = items.filter((i) => i.smartMeta?.tag === 'LAST_WEEK_UNFINISHED').length

   const handleSyncDostavka = async () => {
    if (items.length === 0) {
      toast.error('В каталоге недели нет позиций для синхронизации');
      return;
    }
    try {
      setIsSyncingDostavka(true);
      const res = await api.post('/api/plan/sync-dostavka', { weekId });
      const summary = res.data?.summary;
      const createdCount = summary?.createdCount ?? 0;
      const updatedCount = summary?.updatedCount ?? 0;
      const unavailableCount = summary?.unavailableCount ?? 0;

      toast.success(
        `Доставка успешно обновлена! Создано: ${createdCount}, обновлено: ${updatedCount}, нет в наличии: ${unavailableCount}`,
        { duration: 5000 }
      );
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка синхронизации с Доставкой');
    } finally {
      setIsSyncingDostavka(false);
    }
  };

  const handleSyncAll = async () => {
    if (items.length === 0) {
      toast.error('В каталоге недели нет позиций для синхронизации');
      return;
    }
    try {
      setIsSyncingAll(true);
      const res = await api.post('/api/plan/sync-all', { weekId });
      const pSummary = res.data?.price?.summary;
      const dSummary = res.data?.dostavka?.summary;

      const pOk = res.data?.price?.success !== false;
      const dOk = res.data?.dostavka?.success !== false;

      if (pOk && dOk) {
        toast.success(
          `Все сервисы обновлены! Прайс: ${pSummary?.updatedCount ?? 0} обн. / Доставка: ${dSummary?.updatedCount ?? 0} обн.`,
          { duration: 6000 }
        );
      } else {
        if (!pOk) toast.error(`Ошибка Прайса: ${res.data?.price?.error || 'сбой'}`);
        if (!dOk) toast.error(`Ошибка Доставки: ${res.data?.dostavka?.error || 'сбой'}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка общей синхронизации');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleSyncPrice = async () => {
      if (items.length === 0) {
         toast.error('В каталоге недели нет позиций для синхронизации')
         return
      }
      try {
         setIsSyncingPrice(true)
         const res = await api.post('/api/plan/sync-price', { weekId })
         const summary = res.data?.summary
         const createdCount = summary?.createdCount ?? 0
         const updatedCount = summary?.updatedCount ?? 0
         const omittedCount = summary?.omittedCount ?? 0

         toast.success(
            `Прайс успешно обновлен! Создано: ${createdCount}, обновлено: ${updatedCount}, под заказ: ${omittedCount}`,
            { duration: 5000 }
         )
      } catch (err: any) {
         toast.error(
            err.response?.data?.error || 'Ошибка синхронизации с Прайсом'
         )
      } finally {
         setIsSyncingPrice(false)
      }
   }

   const handleToggle = async (item: PlanItem) => {
      if (!canTogglePlan) {
         toast.error('У вашей роли нет прав для отметки в плане')
         return
      }
      try {
         setIsTogglingId(item.id)
         const res = await api.put(`/api/plan/item/${item.id}/toggle`)
         onItemUpdated({
            ...item,
            ...res.data,
            abcCategory: item.abcCategory,
            rawAbcCategory: item.rawAbcCategory,
            isHit: item.isHit,
            rawIsHit: item.rawIsHit,
            salesPercent: item.salesPercent,
            salesHistoryWeeks: item.salesHistoryWeeks,
            smartMeta: item.smartMeta,
            abcManualDisabled: item.abcManualDisabled,
         })
      } catch (err: any) {
         toast.error(err.response?.data?.error || 'Ошибка изменения статуса')
      } finally {
         setIsTogglingId(null)
      }
   }

   const handleToggleNew = async (item: PlanItem) => {
      if (!canTogglePlan) {
         toast.error('У вашей роли нет прав для изменения статуса новинки')
         return
      }
      try {
         setIsTogglingNewId(item.id)
         const res = await api.put(`/api/plan/item/${item.id}/toggle-new`)
         onItemUpdated({
            ...item,
            ...res.data,
            abcCategory: item.abcCategory,
            rawAbcCategory: item.rawAbcCategory,
            isHit: item.isHit,
            rawIsHit: item.rawIsHit,
            salesPercent: item.salesPercent,
            salesHistoryWeeks: item.salesHistoryWeeks,
            smartMeta: item.smartMeta,
            abcManualDisabled: item.abcManualDisabled,
         })
         toast.success(
            res.data.isNew
               ? `"${item.productName}" отмечен как новинка`
               : `Снят статус новинки с "${item.productName}"`
         )
      } catch (err: any) {
         toast.error(
            err.response?.data?.error || 'Ошибка изменения статуса новинки'
         )
      } finally {
         setIsTogglingNewId(null)
      }
   }

   const handleToggleAbc = async (item: PlanItem) => {
      if (!canTogglePlan) {
         toast.error('У вашей роли нет прав для изменения маркеров')
         return
      }
      try {
         setIsTogglingAbcId(item.id)
         const res = await api.put(`/api/plan/item/${item.id}/toggle-abc`)
         const newDisabled = Boolean(res.data.abcManualDisabled)
         const originalAbc = item.rawAbcCategory || item.abcCategory
         const originalHit = item.rawIsHit !== undefined ? item.rawIsHit : item.isHit

         onItemUpdated({
            ...item,
            abcManualDisabled: newDisabled,
            abcCategory: newDisabled ? null : originalAbc,
            isHit: newDisabled ? false : originalHit,
            rawAbcCategory: originalAbc,
            rawIsHit: originalHit,
         })
         toast.success(
            newDisabled
               ? `Маркер снят с "${item.productName}"`
               : `Маркер возвращен для "${item.productName}"`
         )
      } catch (err: any) {
         toast.error(
            err.response?.data?.error || 'Ошибка переключения маркера'
         )
      } finally {
         setIsTogglingAbcId(null)
      }
   }

   const handleSelectAllNovelties = async () => {
      if (!canTogglePlan) {
         toast.error('У вашей роли нет прав для изменения плана недели')
         return
      }
      const noveltyItems = items.filter((i) => i.isNew && !i.isPlanned)
      if (noveltyItems.length === 0) {
         toast('Все новинки уже включены в план')
         return
      }
      setBulkModalConfig({
         isOpen: true,
         actionType: 'NOVELTIES',
         title: 'Добавить все новинки в план?',
         description: 'Новые позиции из загруженного каталога 1С',
         items: noveltyItems,
      })
   }

   const handleSelectAllHits = async () => {
      if (!canTogglePlan) {
         toast.error('У вашей роли нет прав для изменения плана недели')
         return
      }
      const hitItems = items.filter(
         (i) => i.smartMeta?.tag === 'HIT_REPEAT' && !i.isPlanned
      )
      if (hitItems.length === 0) {
         toast('Все разлетевшиеся хиты уже включены в план! 🔥')
         return
      }
      setBulkModalConfig({
         isOpen: true,
         actionType: 'HITS',
         title: 'Добавить все хиты в план?',
         description:
            'Товары, которые производились на прошлой неделе и были полностью раскуплены (остаток 0 кг)',
         items: hitItems,
      })
   }

   const handleSelectAllForgotten = async () => {
      if (!canTogglePlan) {
         toast.error('У вашей роли нет прав для изменения плана недели')
         return
      }
      const forgottenItems = items.filter(
         (i) =>
            (i.smartMeta?.tag === 'LONG_TIME_NO_PLAN' ||
               i.smartMeta?.tag === 'LAST_WEEK_UNFINISHED') &&
            !i.isPlanned
      )
      if (forgottenItems.length === 0) {
         toast('Все забытые позиции уже в плане!')
         return
      }
      setBulkModalConfig({
         isOpen: true,
         actionType: 'FORGOTTEN',
         title: 'Добавить забытые позиции в план?',
         description:
            'Товары с 0 остатком, которые не производились 2 недели и более',
         items: forgottenItems,
      })
   }

   const handleSelectAllOutOfStock = async () => {
      if (!canTogglePlan) {
         toast.error('У вашей роли нет прав для изменения плана недели')
         return
      }
      const zeroStockItems = items.filter(
         (i) => (i.stockKg ?? 0) === 0 && !i.isPlanned
      )
      if (zeroStockItems.length === 0) {
         toast('Все дефицитные позиции уже в плане')
         return
      }
      setBulkModalConfig({
         isOpen: true,
         actionType: 'DEFICIT',
         title: 'Добавить весь дефицит в план?',
         description:
            'Товары со свободным остатком 0 кг на складе (статус «Под заказ»)',
         items: zeroStockItems,
      })
   }

   const handleStartProgress = () => {
      if (plannedCount === 0) {
         toast.error('Отметьте галочками хотя бы одну позицию в плане!')
         return
      }
      setBulkModalConfig({
         isOpen: true,
         actionType: 'APPROVE_PLAN',
         title: 'Утвердить план недели?',
         description: `План из ${plannedCount} позиций будет утвержден и передан в работу цеха`,
         items: [],
      })
   }

   const handleConfirmBulkAction = async (selectedIds: string[]) => {
      if (!bulkModalConfig) return

      if (bulkModalConfig.actionType === 'APPROVE_PLAN') {
         try {
            setIsConfirmingPlan(true)
            await api.post('/api/weeks/start-progress', { weekId })
            toast.success('План недели утвержден и переведен в работу цеха!')
            setBulkModalConfig(null)
            onPlanConfirmed()
         } catch (err: any) {
            toast.error(err.response?.data?.error || 'Ошибка утверждения плана')
         } finally {
            setIsConfirmingPlan(false)
         }
         return
      }

      if (selectedIds.length === 0) {
         toast.error('Не выбрано ни одной позиции для добавления')
         return
      }

      try {
         setIsBulkLoading(true)
         await api.put('/api/plan/bulk-toggle', {
            itemIds: selectedIds,
            isPlanned: true,
         })

         const count = selectedIds.length
         if (bulkModalConfig.actionType === 'HITS') {
            toast.success(`В план добавлено ${count} хитов! 🔥`)
         } else if (bulkModalConfig.actionType === 'NOVELTIES') {
            toast.success(`В план добавлено ${count} новинок!`)
         } else if (bulkModalConfig.actionType === 'DEFICIT') {
            toast.success(`В план добавлено ${count} позиций дефицита!`)
         } else if (bulkModalConfig.actionType === 'FORGOTTEN') {
            toast.success(`В план добавлено ${count} забытых позиций! ⏳`)
         }

         setBulkModalConfig(null)
         onBulkUpdated()
      } catch (err: any) {
         toast.error(err.response?.data?.error || 'Ошибка массового включения')
      } finally {
         setIsBulkLoading(false)
      }
   }

   const formatDateTime = (dateStr?: string) => {
      if (!dateStr) return '—'
      try {
         const d = new Date(dateStr)
         return d.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
         })
      } catch {
         return '—'
      }
   }

   const handleDeleteItem = async (item: PlanItem, e: React.MouseEvent) => {
      e.stopPropagation()
      if (!canTogglePlan) {
         toast.error('У вашей роли нет прав для удаления позиций')
         return
      }
      if (
         !window.confirm(
            `Вы уверены, что хотите удалить позицию "${item.productName}" из плана недели?`
         )
      ) {
         return
      }
      try {
         setIsDeletingId(item.id)
         await api.delete(`/api/plan/item/${item.id}`)
         toast.success(`Позиция "${item.productName}" удалена`)
         onItemDeleted?.(item.id)
      } catch (err: any) {
         toast.error(err.response?.data?.error || 'Ошибка при удалении товара')
      } finally {
         setIsDeletingId(null)
      }
   }

   return (
      <div className='bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4'>
         {/* Верхняя панель: поиск, фильтры и действия */}
         <div className='p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 space-y-3'>

            {/* ═══ Строка 1: Поиск + Категория ═══ */}
            <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3'>
               {/* Поле поиска */}
               <div className='relative flex-1'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400'>
                     <Search className='w-4 h-4' />
                  </div>
                  <input
                     type='text'
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     placeholder='Поиск рыбы по наименованию...'
                     className='w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs'
                  />
               </div>

               {/* Фильтр по категории */}
               <div className='flex items-center gap-2'>
                  <Layers className='w-4 h-4 text-slate-400 hidden sm:block' />
                  <select
                     value={selectedCategory}
                     onChange={(e) => setSelectedCategory(e.target.value)}
                     className='px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs'
                  >
                     <option value='ALL'>Все категории ({items.length})</option>
                     {categories
                        .filter((c) => c !== 'ALL')
                        .map((cat) => (
                           <option key={cat as string} value={cat as string}>
                              {cat} (
                              {items.filter((i) => i.category === cat).length})
                           </option>
                        ))}
                  </select>
               </div>
            </div>

            {/* ═══ Строка 2: Кнопки действий ═══ */}
            {isClosed ? (
               <div className='flex items-center gap-2 pt-1'>
                  <div className='inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold'>
                     <span>📁 Неделя зафиксирована в архиве (режим просмотра)</span>
                  </div>
               </div>
            ) : (
               <div className='flex flex-wrap items-center gap-x-4 gap-y-2 pt-1'>
                  {/* Группа: Синхронизация с Прайсом */}
                  <div className='flex items-center gap-2'>
                     {/* Переключатель авто-синхронизации */}
                     <div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition cursor-pointer select-none ${
                           autoSyncPrice
                              ? 'bg-blue-50/80 border-blue-200 text-blue-900 shadow-2xs hover:bg-blue-100/70'
                              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200/60'
                        }`}
                        onClick={onToggleAutoSync}
                        title={
                           autoSyncPrice
                              ? 'Авто-синхронизация включена: каталог синхронизируется с Прайсом и Доставкой сразу при загрузке 1С. Нажмите, чтобы выключить.'
                              : 'Авто-синхронизация выключена: синхронизация происходит только по кнопкам. Нажмите, чтобы включить.'
                        }
                     >
                        <div className='flex flex-col'>
                           <span className='text-[11px] font-bold flex items-center gap-1 leading-tight'>
                              <Zap
                                 className={`w-3.5 h-3.5 shrink-0 ${autoSyncPrice ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`}
                              />
                              Авто-синхронизация
                           </span>
                           <span className='text-[10px] text-slate-500 leading-tight'>
                              {autoSyncPrice
                                 ? 'при загрузке 1С'
                                 : 'только кнопкой'}
                           </span>
                        </div>
                        <button
                           type='button'
                           role='switch'
                           aria-checked={autoSyncPrice}
                           onClick={(e) => {
                              e.stopPropagation()
                              onToggleAutoSync?.()
                           }}
                           className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              autoSyncPrice ? 'bg-blue-600' : 'bg-slate-300'
                           }`}
                        >
                           <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                 autoSyncPrice ? 'translate-x-4' : 'translate-x-0'
                              }`}
                           />
                        </button>
                     </div>

                     {/* Группа синхронизации: Прайс и Доставка */}
                     <div className="flex items-center gap-1.5">
                        <button
                           type="button"
                           disabled={items.length === 0 || isSyncingPrice || isSyncingAll}
                           onClick={handleSyncPrice}
                           className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs disabled:opacity-40 transition flex items-center gap-1 whitespace-nowrap cursor-pointer"
                           title="Передать цены, остатки и новинки в TopFish Price"
                        >
                           <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPrice ? 'animate-spin' : ''}`} />
                           <span>{isSyncingPrice ? 'Прайс...' : 'В Прайс'}</span>
                        </button>

                        <button
                           type="button"
                           disabled={items.length === 0 || isSyncingDostavka || isSyncingAll}
                           onClick={handleSyncDostavka}
                           className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs disabled:opacity-40 transition flex items-center gap-1 whitespace-nowrap cursor-pointer"
                           title="Обновить цены, наличие и добавить новые товары в Доставку"
                        >
                           <Truck className={`w-3.5 h-3.5 ${isSyncingDostavka ? 'animate-spin' : ''}`} />
                           <span>{isSyncingDostavka ? 'Доставка...' : 'В Доставку'}</span>
                        </button>

                        <button
                           type="button"
                           disabled={items.length === 0 || isSyncingAll || isSyncingPrice || isSyncingDostavka}
                           onClick={handleSyncAll}
                           className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs disabled:opacity-40 transition flex items-center gap-1 whitespace-nowrap cursor-pointer"
                           title="Синхронизировать одновременно с Прайсом и Доставкой"
                        >
                           <Zap className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                           <span>{isSyncingAll ? 'Синхронизация...' : 'Синхр. всё'}</span>
                        </button>
                     </div>
                  </div>

                  {/* Разделитель перед утверждением */}
                  {weekStatus === 'PLANNING' && (
                     <div className='hidden sm:block w-px h-7 bg-slate-200' />
                  )}

                  {/* Группа: Утверждение плана */}
                  {weekStatus === 'PLANNING' && (
                     <button
                        type='button'
                        disabled={plannedCount === 0 || isConfirmingPlan}
                        onClick={handleStartProgress}
                        className='px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-teal-600/20 disabled:opacity-40 transition flex items-center gap-1.5 whitespace-nowrap ml-auto cursor-pointer'
                     >
                        <Play className='w-4 h-4' />
                        <span>Утвердить план ({plannedCount})</span>
                     </button>
                  )}
               </div>
            )}

{/* ═══ Строка 3: Быстрые фильтры + Групповые действия ═══ */}
            <div className='flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60'>
               <div className='flex flex-wrap items-center gap-1.5 pt-2'>
                  <button
                     onClick={() => onFilterChange('all')}
                     className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        currentFilter === 'all'
                           ? 'bg-slate-800 text-white'
                           : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                     }`}
                  >
                     Все ({items.length})
                  </button>
                  <button
                     onClick={() => onFilterChange('planned')}
                     className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        currentFilter === 'planned'
                           ? 'bg-teal-600 text-white'
                           : 'bg-white border border-slate-200 text-teal-700 hover:bg-teal-50'
                     }`}
                  >
                     В плане ({plannedCount})
                  </button>

                  {/* 🔥 Хиты: разлетелись на прошлой неделе */}
                  {hitsCount > 0 && (
                     <button
                        onClick={() => onFilterChange(currentFilter === 'hits' ? 'all' : 'hits')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                           currentFilter === 'hits'
                              ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-sm ring-1 ring-orange-500'
                              : 'bg-orange-50 border border-orange-200 text-orange-800 hover:bg-orange-100'
                        }`}
                        title='Товары, которые производились на прошлой неделе и были полностью раскуплены (остаток 0 кг)'
                     >
                        <span>🔥</span>
                        <span>Хиты ({hitsCount})</span>
                     </button>
                  )}

                  {/* ⚡ Категория А (Отличный спрос) */}
                  {catACount > 0 && (
                     <button
                        onClick={() => onFilterChange(currentFilter === 'catA' ? 'all' : 'catA')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                           currentFilter === 'catA'
                              ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                              : 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                        }`}
                        title='Категория А: расход остатка от 70% и выше'
                     >
                        <span>⚡</span>
                        <span>Кат. А ({catACount})</span>
                     </button>
                  )}

                  {/* 👍 Категория B (Хороший спрос) */}
                  {catBCount > 0 && (
                     <button
                        onClick={() => onFilterChange(currentFilter === 'catB' ? 'all' : 'catB')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                           currentFilter === 'catB'
                              ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500'
                              : 'bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100'
                        }`}
                        title='Категория B: расход остатка от 30% до 70%'
                     >
                        <span>👍</span>
                        <span>Кат. B ({catBCount})</span>
                     </button>
                  )}

                  {/* 📦 Категория C (Умеренный спрос) */}
                  {catCCount > 0 && (
                     <button
                        onClick={() => onFilterChange(currentFilter === 'catC' ? 'all' : 'catC')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                           currentFilter === 'catC'
                              ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-600'
                              : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                        title='Категория C: расход остатка от 15% до 30%'
                     >
                        <span>📦</span>
                        <span>Кат. C ({catCCount})</span>
                     </button>
                  )}

                  {/* ❗ Не продается / Застой остатка */}
                  {(stagnantCount > 0 || currentFilter === 'stagnant') && (
                     <button
                        onClick={() => onFilterChange(currentFilter === 'stagnant' ? 'all' : 'stagnant')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                           currentFilter === 'stagnant'
                              ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400 font-extrabold'
                              : 'bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100'
                        }`}
                        title='Продукция на складе, которая почти не продается (расход до 15% или 0%) — риск залежания рыбы!'
                     >
                        <span className='text-sm leading-none font-black text-rose-500 group-hover:text-white'>❗</span>
                        <span>Не продается ({stagnantCount})</span>
                     </button>
                  )}

                  {/* ⏳ Давно не делали (забытые) */}
                  {(longTimeCount > 0 || currentFilter === 'longTime') && (
                     <div className='flex items-center gap-1.5 flex-wrap'>
                        <button
                           onClick={() => onFilterChange(currentFilter === 'longTime' ? 'all' : 'longTime')}
                           className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              currentFilter === 'longTime'
                                 ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-500'
                                 : 'bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100'
                           }`}
                           title='Товары с 0 остатком, которые не включались в план от 2 недель и более'
                        >
                           <span>⏳</span>
                           <span>Давно не делали ({longTimeCount})</span>
                        </button>

                        {currentFilter === 'longTime' && (
                           <div className='flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-bold select-none'>
                              <span className='text-slate-400 uppercase tracking-wider text-[9px] mr-0.5'>Простой:</span>
                              <button
                                 type='button'
                                 onClick={() => setLongTimeDurationFilter(f => f === '2' ? 'all' : '2')}
                                 className={`inline-flex items-center px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-900 border border-yellow-300 cursor-pointer transition ${longTimeDurationFilter === '2' ? 'ring-2 ring-yellow-500 font-black shadow-xs' : 'hover:opacity-80'}`}
                                 title='Показать только 2 недели простоя'
                              >
                                 2 нед.
                              </button>
                              <button
                                 type='button'
                                 onClick={() => setLongTimeDurationFilter(f => f === '3' ? 'all' : '3')}
                                 className={`inline-flex items-center px-1.5 py-0.5 rounded bg-orange-100 text-orange-950 border border-orange-300 cursor-pointer transition ${longTimeDurationFilter === '3' ? 'ring-2 ring-orange-500 font-black shadow-xs' : 'hover:opacity-80'}`}
                                 title='Показать только 3 недели простоя'
                              >
                                 3 нед.
                              </button>
                              <button
                                 type='button'
                                 onClick={() => setLongTimeDurationFilter(f => f === '4' ? 'all' : '4')}
                                 className={`inline-flex items-center px-1.5 py-0.5 rounded bg-red-100 text-red-950 border border-red-300 cursor-pointer transition ${longTimeDurationFilter === '4' ? 'ring-2 ring-red-500 font-black shadow-xs' : 'hover:opacity-80'}`}
                                 title='Показать только 4 недели простоя'
                              >
                                 4 нед.
                              </button>
                              <button
                                 type='button'
                                 onClick={() => setLongTimeDurationFilter(f => f === '5plus' ? 'all' : '5plus')}
                                 className={`inline-flex items-center px-1.5 py-0.5 rounded bg-slate-900 text-slate-100 border border-slate-700 font-black cursor-pointer transition ${longTimeDurationFilter === '5plus' ? 'ring-2 ring-slate-400 scale-105 shadow-xs' : 'hover:bg-black'}`}
                                 title='Показать только 5+ недель (мёртвые позиции, кандидаты на исключение)'
                              >
                                 5+ нед.
                              </button>
                              {longTimeDurationFilter !== 'all' && (
                                 <button
                                    type='button'
                                    onClick={() => setLongTimeDurationFilter('all')}
                                    className='text-slate-500 hover:text-slate-800 text-[10px] ml-1 underline cursor-pointer'
                                    title='Показать все забытые позиции'
                                 >
                                    Все
                                 </button>
                              )}
                           </div>
                        )}
                     </div>
                  )}

                  {/* ⚠️ Долги прошлой недели */}
                  {unfinishedCount > 0 && (
                     <button
                        onClick={() => onFilterChange(currentFilter === 'unfinished' ? 'all' : 'unfinished')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                           currentFilter === 'unfinished'
                              ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-500'
                              : 'bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100'
                        }`}
                        title='Товары, которые были в плане прошлой недели, но не были сделаны (Забыли / Нет сырья)'
                     >
                        <span>⚠️</span>
                        <span>Долги ({unfinishedCount})</span>
                     </button>
                  )}

                  <button
                     onClick={() => onFilterChange('novelties')}
                     className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                        currentFilter === 'novelties'
                           ? 'bg-purple-600 text-white'
                           : 'bg-white border border-slate-200 text-purple-700 hover:bg-purple-50'
                     }`}
                  >
                     <Sparkles className='w-3 h-3' />
                     <span>
                        Новинки ({items.filter((i) => i.isNew).length})
                     </span>
                  </button>
                  <button
                     onClick={() => onFilterChange('outOfStock')}
                     className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                        currentFilter === 'outOfStock'
                           ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-600'
                           : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                     }`}
                  >
                     <AlertTriangle className='w-3 h-3 text-slate-400' />
                     <span>
                        Под заказ (
                        {items.filter((i) => (i.stockKg ?? 0) === 0).length})
                     </span>
                  </button>
               </div>

               {/* Быстрые групповые действия */}
               {!isClosed && (
                  <div className='flex flex-wrap items-center gap-2 pt-2'>
                     {hitsCount > 0 && (
                        <button
                           type='button'
                           onClick={handleSelectAllHits}
                           className='text-[11px] font-extrabold text-orange-900 hover:text-orange-950 bg-gradient-to-r from-orange-100 to-amber-100 hover:from-orange-200 hover:to-amber-200 px-2.5 py-1 rounded-lg border border-orange-300 shadow-2xs transition cursor-pointer flex items-center gap-1'
                           title='Включить все разлетевшиеся позиции в план производства'
                        >
                           <span>🔥</span>
                           <span>Все хиты в план</span>
                        </button>
                     )}
                     {longTimeCount > 0 && (
                        <button
                           type='button'
                           onClick={handleSelectAllForgotten}
                           className='text-[11px] font-bold text-indigo-800 hover:text-indigo-950 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition cursor-pointer flex items-center gap-1'
                           title='Включить все забытые позиции в план'
                        >
                           <span>⏳</span>
                           <span>Забытые в план</span>
                        </button>
                     )}
                     <button
                        type='button'
                        onClick={handleSelectAllNovelties}
                        className='text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition cursor-pointer'
                        title='Включить все новинки в план производства'
                     >
                        + Все новинки в план
                     </button>
                     <button
                        type='button'
                        onClick={handleSelectAllOutOfStock}
                        className='text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition cursor-pointer'
                        title='Включить все товары с 0 остатком в план производства'
                     >
                        + Весь дефицит в план
                     </button>
                  </div>
               )}
            </div>
         </div>

         {/* Таблица чеклиста */}
         {items.length === 0 ? (
            <div className='p-12 text-center space-y-4'>
               <div className='w-16 h-16 rounded-3xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto text-2xl'>
                  📋
               </div>
               <div className='max-w-md mx-auto'>
                  <h3 className='text-base font-bold text-slate-900'>
                     Чеклист на эту неделю пока пуст
                  </h3>
                  <p className='text-xs text-slate-500 mt-1'>
                     Загрузите свежий прайс 1С (.xlsx), и система автоматически
                     сформирует перечень позиций с остатками и новинками.
                  </p>
                  <div className='flex flex-wrap items-center justify-center gap-2.5 mt-4'>
                     {canUpload1C && (
                        <button
                           type='button'
                           onClick={onOpenUpload}
                           className='px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer'
                        >
                           Загрузить файл 1С
                        </button>
                     )}
                  </div>
               </div>
            </div>
         ) : filteredItems.length === 0 ? (
            <div className='p-8 text-center text-slate-400 text-xs'>
               По заданным фильтрам ничего не найдено
            </div>
         ) : (
            <div className='overflow-x-auto'>
               <table className='w-full table-fixed divide-y divide-slate-200 text-xs'>
                  <thead className='bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]'>
                     <tr>
                        <th className='px-2 py-3 text-center w-[48px]'>План</th>
                        <th className='px-3 py-3 text-left'>
                           Наименование продукции
                        </th>
                        <th className='px-2 py-3 text-left whitespace-nowrap w-[120px]'>
                           Категория
                        </th>
                        {isClosed && (
                           <th className='px-2 py-3 text-left whitespace-nowrap w-[160px]'>
                              Итог недели
                           </th>
                        )}
                        <th className='px-2 py-3 text-center whitespace-nowrap w-[85px]'>
                           Остаток 1С
                        </th>
                        <th className='px-2 py-3 text-right whitespace-nowrap w-[105px]'>
                           Оптовая цена
                        </th>
                        <th className='px-2 py-3 text-left whitespace-nowrap w-[160px]'>
                           Дата добавления
                        </th>
                        <th className='px-2 py-3 text-left whitespace-nowrap w-[150px]'>
                           Автор
                        </th>
                        {!isClosed && (
                           <th className='pl-0 pr-4 py-3 text-left w-[36px]'></th>
                        )}
                     </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100 bg-white'>
                     {filteredItems.map((item) => {
                        const isZeroStock = (item.stockKg ?? 0) === 0
                        const isHit = item.smartMeta?.tag === 'HIT_REPEAT'
                        const isUnfinished = item.smartMeta?.tag === 'LAST_WEEK_UNFINISHED'
                        const isLongTime = item.smartMeta?.tag === 'LONG_TIME_NO_PLAN'
                        const isStagnant = item.smartMeta?.tag === 'STAGNANT_STOCK'

                        let rowBgClass = 'hover:bg-slate-50/70'
                        if (item.isPlanned) {
                           rowBgClass = 'bg-teal-50/40 hover:bg-teal-50/70'
                        } else if (isHit) {
                           rowBgClass = 'bg-orange-50/50 hover:bg-orange-50/80 border-l-4 border-l-orange-500'
                        } else if (isUnfinished) {
                           rowBgClass = 'bg-rose-50/40 hover:bg-rose-50/70 border-l-4 border-l-rose-400'
                        } else if (isStagnant) {
                           rowBgClass = 'bg-rose-50/30 hover:bg-rose-50/60 border-l-4 border-l-rose-500'
                        } else if (isLongTime) {
                           const lt = getLongTimeStyles(item.smartMeta?.consecutiveWeeks)
                           rowBgClass = lt.row
                        }

                        return (
                           <tr
                              key={item.id}
                              onClick={() =>
                                 canTogglePlan && handleToggle(item)
                              }
                              className={`group transition select-none ${
                                 canTogglePlan
                                    ? 'cursor-pointer'
                                    : 'cursor-default'
                              } ${rowBgClass}`}
                           >
                              {/* Чекбокс */}
                              <td className='px-2.5 py-3 text-center'>
                                 <button
                                    type='button'
                                    onClick={(e) => {
                                       e.stopPropagation()
                                       if (canTogglePlan) handleToggle(item)
                                    }}
                                    disabled={
                                       !canTogglePlan ||
                                       isTogglingId === item.id
                                    }
                                    title={
                                       isClosed
                                          ? 'Архивная неделя закрыта для изменений'
                                          : !canTogglePlan
                                          ? 'У вашей роли нет прав для отметки в плане'
                                          : ''
                                    }
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${
                                       !canTogglePlan
                                          ? 'cursor-not-allowed opacity-50'
                                          : ''
                                    } ${
                                       item.isPlanned
                                          ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
                                          : isHit
                                          ? 'bg-white border-2 border-orange-400 hover:border-orange-600 text-transparent shadow-2xs'
                                          : 'bg-white border-2 border-slate-300 hover:border-teal-500 text-transparent'
                                    }`}
                                 >
                                    {item.isPlanned && (
                                       <CheckSquare className='w-4 h-4' />
                                    )}
                                 </button>
                              </td>

                              {/* Наименование + Бейджи */}
                              <td className='px-3 py-3'>
                                 <div className='flex flex-wrap items-center gap-1.5'>
                                    <span
                                       className={`font-bold text-xs sm:text-sm ${
                                          item.isPlanned
                                             ? 'text-slate-900'
                                             : isHit
                                             ? 'text-orange-950 font-black'
                                             : 'text-slate-700'
                                       }`}
                                    >
                                       {item.productName}
                                    </span>

                                    {/* Маркеры спроса: Хит или Категория A / B / C */}
                                    {item.abcManualDisabled ? (
                                       <button
                                          type='button'
                                          onClick={(e) => {
                                             e.stopPropagation()
                                             if (canTogglePlan) handleToggleAbc(item)
                                          }}
                                          disabled={!canTogglePlan || isTogglingAbcId === item.id}
                                          title={canTogglePlan ? 'Маркер был снят вручную. Нажмите, чтобы вернуть маркер' : 'Маркер снят'}
                                          className='inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-400 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition cursor-pointer'
                                       >
                                          <span className='line-through'>
                                             {item.rawIsHit ? '🔥 Хит' : item.rawAbcCategory ? `Кат. ${item.rawAbcCategory}` : 'Маркер'}
                                          </span>
                                          {canTogglePlan && (
                                             <span className='text-[9px] text-slate-500 hover:text-slate-700 font-bold'>↺ вернуть</span>
                                          )}
                                       </button>
                                    ) : isHit ? (
                                       <button
                                          type='button'
                                          onClick={(e) => {
                                             e.stopPropagation()
                                             setHoveredTooltip(null)
                                             if (canTogglePlan) handleToggleAbc(item)
                                          }}
                                          onMouseEnter={(e) => {
                                             e.stopPropagation()
                                             setHoveredTooltip({
                                                item,
                                                rect: e.currentTarget.getBoundingClientRect(),
                                             })
                                          }}
                                          onMouseLeave={() => setHoveredTooltip(null)}
                                          disabled={!canTogglePlan || isTogglingAbcId === item.id}
                                          title={canTogglePlan ? 'Нажмите на значок, чтобы снять маркер Хита' : 'Хит спроса'}
                                          className={`group/badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide whitespace-nowrap shrink-0 shadow-2xs transition-all select-none ${
                                             canTogglePlan
                                                ? 'cursor-pointer hover:ring-2 hover:ring-red-400 hover:opacity-95'
                                                : 'cursor-default'
                                          } ${
                                             item.isPlanned
                                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                                                : 'bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 text-white ring-1 ring-orange-400/50 animate-pulse'
                                          }`}
                                       >
                                          <span className='text-xs'>🔥</span>
                                          <span>
                                             {(item.smartMeta?.badgeText || 'Разлетелось').replace(/^🔥\s*/, '')}
                                          </span>
                                          {canTogglePlan && (
                                             <span
                                                className='ml-0.5 text-white/70 group-hover/badge:text-white group-hover/badge:bg-red-600/90 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center font-bold text-[9px] transition-all'
                                                title='Снять маркер'
                                             >
                                                ✕
                                             </span>
                                          )}
                                       </button>
                                    ) : item.abcCategory === 'A' ? (
                                       <button
                                          type='button'
                                          onClick={(e) => {
                                             e.stopPropagation()
                                             setHoveredTooltip(null)
                                             if (canTogglePlan) handleToggleAbc(item)
                                          }}
                                          onMouseEnter={(e) => {
                                             e.stopPropagation()
                                             const weeksText = item.salesHistoryWeeks ? `${item.salesHistoryWeeks} нед.` : '5 нед.'
                                             setHoveredTooltip({
                                                item,
                                                rect: e.currentTarget.getBoundingClientRect(),
                                                customContent: {
                                                   icon: '⚡',
                                                   title: 'Категория А: Высокий спрос',
                                                   titleColor: 'text-emerald-400 font-black',
                                                   subtitle: `В среднем ${item.salesPercent || 0}% продаж за последние ${weeksText}`,
                                                   description: `Товар стабильно входит в число лидеров продаж фабрики (в среднем ${item.salesPercent || 0}% расхода в неделю). Оптовые покупатели заказывают эту позицию регулярно и в больших объемах.`,
                                                   recommendation: 'Обязательно запланируйте выпуск в цехе! Высокий приоритет для оптовиков.',
                                                   footerHint: canTogglePlan ? 'Нажмите на значок, чтобы снять маркер' : undefined,
                                                },
                                             })
                                          }}
                                          onMouseLeave={() => setHoveredTooltip(null)}
                                          disabled={!canTogglePlan || isTogglingAbcId === item.id}
                                          className={`group/badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs whitespace-nowrap select-none transition-all ${
                                             canTogglePlan ? 'cursor-pointer hover:ring-2 hover:ring-red-400 hover:bg-emerald-200' : 'cursor-default'
                                          }`}
                                       >
                                          <span>⚡</span>
                                          <span>A {item.salesPercent ? `${item.salesPercent}%` : ''}</span>
                                          {canTogglePlan && (
                                             <span
                                                className='ml-0.5 text-emerald-700/60 group-hover/badge:text-white group-hover/badge:bg-red-500 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center font-bold text-[9px] transition-all'
                                                title='Снять маркер'
                                             >
                                                ✕
                                             </span>
                                          )}
                                       </button>
                                    ) : item.abcCategory === 'B' ? (
                                       <button
                                          type='button'
                                          onClick={(e) => {
                                             e.stopPropagation()
                                             setHoveredTooltip(null)
                                             if (canTogglePlan) handleToggleAbc(item)
                                          }}
                                          onMouseEnter={(e) => {
                                             e.stopPropagation()
                                             const weeksText = item.salesHistoryWeeks ? `${item.salesHistoryWeeks} нед.` : '5 нед.'
                                             setHoveredTooltip({
                                                item,
                                                rect: e.currentTarget.getBoundingClientRect(),
                                                customContent: {
                                                   icon: '👍',
                                                   title: 'Категория B: Базовый стабильный спрос',
                                                   titleColor: 'text-blue-400 font-black',
                                                   subtitle: `В среднем ${item.salesPercent || 0}% продаж за последние ${weeksText}`,
                                                   description: `Товар показывает устойчивые регулярные продажи (в среднем ${item.salesPercent || 0}% расхода в неделю). Является надежной базовой продукцией оптового ассортимента («паровоз» фабрики).`,
                                                   recommendation: 'Рекомендуется регулярно держать в плане цеха для поддержания запаса.',
                                                   footerHint: canTogglePlan ? 'Нажмите на значок, чтобы снять маркер' : undefined,
                                                },
                                             })
                                          }}
                                          onMouseLeave={() => setHoveredTooltip(null)}
                                          disabled={!canTogglePlan || isTogglingAbcId === item.id}
                                          className={`group/badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs whitespace-nowrap select-none transition-all ${
                                             canTogglePlan ? 'cursor-pointer hover:ring-2 hover:ring-red-400 hover:bg-blue-200' : 'cursor-default'
                                          }`}
                                       >
                                          <span>👍</span>
                                          <span>B {item.salesPercent ? `${item.salesPercent}%` : ''}</span>
                                          {canTogglePlan && (
                                             <span
                                                className='ml-0.5 text-blue-700/60 group-hover/badge:text-white group-hover/badge:bg-red-500 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center font-bold text-[9px] transition-all'
                                                title='Снять маркер'
                                             >
                                                ✕
                                             </span>
                                          )}
                                       </button>
                                    ) : item.abcCategory === 'C' ? (
                                       <button
                                          type='button'
                                          onClick={(e) => {
                                             e.stopPropagation()
                                             setHoveredTooltip(null)
                                             if (canTogglePlan) handleToggleAbc(item)
                                          }}
                                          onMouseEnter={(e) => {
                                             e.stopPropagation()
                                             const weeksText = item.salesHistoryWeeks ? `${item.salesHistoryWeeks} нед.` : '5 нед.'
                                             setHoveredTooltip({
                                                item,
                                                rect: e.currentTarget.getBoundingClientRect(),
                                                customContent: {
                                                   icon: '📦',
                                                   title: 'Категория C: Умеренный/медленный спрос',
                                                   titleColor: 'text-slate-300 font-black',
                                                   subtitle: `В среднем ${item.salesPercent || 0}% продаж за последние ${weeksText}`,
                                                   description: `Позиция продается со средней скоростью ${item.salesPercent || 0}% в неделю. Спрос умеренный или нишевый.`,
                                                   recommendation: 'Производите аккуратно и небольшими партиями под конкретные заявки покупателей.',
                                                   footerHint: canTogglePlan ? 'Нажмите на значок, чтобы снять маркер' : undefined,
                                                },
                                             })
                                          }}
                                          onMouseLeave={() => setHoveredTooltip(null)}
                                          disabled={!canTogglePlan || isTogglingAbcId === item.id}
                                          className={`group/badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs whitespace-nowrap select-none transition-all ${
                                             canTogglePlan ? 'cursor-pointer hover:ring-2 hover:ring-red-400 hover:bg-slate-200' : 'cursor-default'
                                          }`}
                                       >
                                          <span>📦</span>
                                          <span>C {item.salesPercent ? `${item.salesPercent}%` : ''}</span>
                                          {canTogglePlan && (
                                             <span
                                                className='ml-0.5 text-slate-500/60 group-hover/badge:text-white group-hover/badge:bg-red-500 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center font-bold text-[9px] transition-all'
                                                title='Снять маркер'
                                             >
                                                ✕
                                             </span>
                                          )}
                                       </button>
                                    ) : null}

                                    {/* ⚠️ Бейдж Долг с прошлой недели */}
                                    {isUnfinished && (
                                       <span
                                          onMouseEnter={(e) => {
                                             e.stopPropagation()
                                             setHoveredTooltip({
                                                item,
                                                rect: e.currentTarget.getBoundingClientRect(),
                                             })
                                          }}
                                          onMouseLeave={() => setHoveredTooltip(null)}
                                          className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-rose-100 text-rose-800 border border-rose-300 whitespace-nowrap shrink-0 cursor-help shadow-2xs select-none'
                                       >
                                          <span className='text-xs'>{item.smartMeta?.icon || '⚠️'}</span>
                                          <span>
                                             {(item.smartMeta?.badgeText || '').replace(/^[⚠️📦]\s*/, '')}
                                          </span>
                                       </span>
                                    )}

                                    {/* ⏳ Бейдж Давно не делали (забытая позиция с градацией цвета) */}
                                    {isLongTime && !isHit && (() => {
                                       const lt = getLongTimeStyles(item.smartMeta?.consecutiveWeeks)
                                       return (
                                          <span
                                             onMouseEnter={(e) => {
                                                e.stopPropagation()
                                                setHoveredTooltip({
                                                   item,
                                                   rect: e.currentTarget.getBoundingClientRect(),
                                                })
                                             }}
                                             onMouseLeave={() => setHoveredTooltip(null)}
                                             className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 cursor-help select-none border transition-colors shadow-2xs ${lt.badge}`}
                                          >
                                             <span className='text-xs'>⏳</span>
                                             <span>
                                                {(item.smartMeta?.badgeText || '').replace(/^⏳\s*/, '')}
                                             </span>
                                          </span>
                                       )
                                    })()}

                                     {/* ❗ Бейдж Не продается / Застой остатка */}
                                     {item.smartMeta?.tag === 'STAGNANT_STOCK' && (
                                        <span
                                           onMouseEnter={(e) => {
                                              e.stopPropagation()
                                              setHoveredTooltip({
                                                 item,
                                                 rect: e.currentTarget.getBoundingClientRect(),
                                              })
                                           }}
                                           onMouseLeave={() => setHoveredTooltip(null)}
                                           className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-rose-100 text-rose-950 border border-rose-300 shadow-2xs whitespace-nowrap shrink-0 cursor-help select-none hover:bg-rose-200 transition'
                                        >
                                           <span className='text-xs font-black text-rose-600 animate-pulse'>❗</span>
                                           <span>
                                              {(item.smartMeta?.badgeText || 'Не продается').replace(/^❗\s*/, '')}
                                           </span>
                                        </span>
                                     )}

                                    {/* 📉 Бейдж Заканчивается */}
                                    {item.smartMeta?.tag === 'LOW_STOCK' && !item.isPlanned && (
                                       <span
                                          onMouseEnter={(e) => {
                                             e.stopPropagation()
                                             setHoveredTooltip({
                                                item,
                                                rect: e.currentTarget.getBoundingClientRect(),
                                             })
                                          }}
                                          onMouseLeave={() => setHoveredTooltip(null)}
                                          className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap shrink-0 cursor-help select-none'
                                       >
                                          <span className='text-xs'>📉</span>
                                          <span>
                                             {(item.smartMeta?.badgeText || '').replace(/^📉\s*/, '')}
                                          </span>
                                       </span>
                                    )}

                                    {isZeroStock && !isHit && !isUnfinished && (
                                       <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300 whitespace-nowrap shrink-0 select-none'>
                                           <AlertTriangle className='w-3 h-3 text-slate-400' />
                                           ПОД ЗАКАЗ (0 кг)
                                        </span>
                                    )}

                                    {item.isNew ? (
                                       isClosed ? (
                                          <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300 whitespace-nowrap shrink-0'>
                                             <Sparkles className='w-3 h-3 text-purple-600' />
                                             НОВИНКА
                                          </span>
                                       ) : (
                                          <button
                                             type='button'
                                             onClick={(e) => {
                                                e.stopPropagation()
                                                handleToggleNew(item)
                                             }}
                                             disabled={isTogglingNewId === item.id}
                                             title='Нажмите, чтобы снять статус новинки'
                                             className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300 transition shadow-sm cursor-pointer whitespace-nowrap shrink-0'
                                          >
                                             <Sparkles className='w-3 h-3 text-purple-600' />
                                             НОВИНКА
                                          </button>
                                       )
                                    ) : !isClosed ? (
                                       <button
                                          type='button'
                                          onClick={(e) => {
                                             e.stopPropagation()
                                             handleToggleNew(item)
                                          }}
                                          disabled={isTogglingNewId === item.id}
                                          title='Нажмите, чтобы отметить как новинку'
                                          className='hidden group-hover:inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-purple-700 hover:bg-purple-50 px-1.5 py-0.5 rounded border border-dashed border-slate-300 hover:border-purple-300 transition cursor-pointer whitespace-nowrap shrink-0'
                                       >
                                          + Новинка
                                       </button>
                                    ) : null}
                                 </div>
                              </td>

                              {/* Категория */}
                              <td className='px-2 py-3 text-slate-500 font-medium whitespace-nowrap'>
                                 {item.category || '—'}
                              </td>

                              {/* Итог недели (Заключение понедельничного учета) */}
                              {isClosed && (
                                 <td className='px-2 py-3 text-left whitespace-nowrap'>
                                    {item.isPlanned ? (
                                       item.resultStatus === 'COMPLETED' ? (
                                          <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300'>
                                             <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600 shrink-0' />
                                             <span>Готово</span>
                                          </span>
                                       ) : item.resultStatus === 'FORGOTTEN' ? (
                                          <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300'>
                                             <AlertTriangle className='w-3.5 h-3.5 text-amber-600 shrink-0' />
                                             <span>Забыли</span>
                                          </span>
                                       ) : item.resultStatus === 'NO_RAW_MATERIAL' ? (
                                          <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-800 border border-red-300'>
                                             <XCircle className='w-3.5 h-3.5 text-red-600 shrink-0' />
                                             <span>Нет сырья</span>
                                          </span>
                                       ) : item.resultStatus === 'OTHER' ? (
                                          <div className='flex flex-col gap-0.5 max-w-[150px]'>
                                             <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 w-fit'>
                                                <HelpCircle className='w-3.5 h-3.5 text-blue-600 shrink-0' />
                                                <span>Другое</span>
                                             </span>
                                             {item.reasonComment && (
                                                <span
                                                   className='text-[10px] text-blue-900 font-medium italic truncate'
                                                   title={item.reasonComment}
                                                >
                                                   {item.reasonComment}
                                                </span>
                                             )}
                                          </div>
                                       ) : (
                                          <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600'>
                                             В плане
                                          </span>
                                       )
                                    ) : (
                                       <span className='text-slate-300 text-[11px] italic'>
                                          Не в плане
                                       </span>
                                    )}
                                 </td>
                              )}

                              {/* Остаток */}
                              <td className='px-2 py-3 text-center whitespace-nowrap'>
                                 {item.stockKg !== null &&
                                 item.stockKg !== undefined ? (
                                    <span
                                       className={`inline-block whitespace-nowrap font-semibold px-2.5 py-0.5 rounded ${
                                          isZeroStock
                                             ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                             : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                       }`}
                                    >
                                       {item.stockKg} кг
                                    </span>
                                 ) : (
                                    <span className='text-slate-400'>—</span>
                                 )}
                              </td>

                              {/* Цена */}
                              <td className='px-2 py-3 text-right font-bold text-slate-800 whitespace-nowrap'>
                                 {item.price
                                    ? `${item.price.toLocaleString('ru-RU')} ₽`
                                    : '—'}
                              </td>

                              {/* Дата добавления */}
                              <td className='px-2 py-3 text-slate-500 text-[11px] whitespace-nowrap'>
                                 <div className='inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/70 font-medium text-slate-700'>
                                    <Calendar className='w-3.5 h-3.5 text-slate-400 shrink-0' />
                                    <span>
                                       {formatDateTime(item.createdAt)}
                                    </span>
                                 </div>
                              </td>

                              {/* Автор отметки */}
                              <td className='px-2 py-3 text-slate-500 text-[11px] whitespace-nowrap'>
                                 {item.lastUpdatedBy ? (
                                    <span className='inline-flex items-center gap-1 bg-slate-100 px-2.5 py-0.5 rounded-full text-slate-700 font-medium whitespace-nowrap'>
                                       <User className='w-3.5 h-3.5 text-slate-500 shrink-0' />
                                       <span>{item.lastUpdatedBy}</span>
                                    </span>
                                 ) : (
                                    <span className='text-slate-300'>—</span>
                                 )}
                              </td>

                              {/* Удаление позиции */}
                              {!isClosed && (
                                 <td className='pl-0 pr-4 py-3 text-left'>
                                    {canTogglePlan && (
                                       <button
                                          type='button'
                                          onClick={(e) =>
                                             handleDeleteItem(item, e)
                                          }
                                          disabled={isDeletingId === item.id}
                                          title='Удалить позицию из плана'
                                          className='opacity-0 group-hover:opacity-100 p-1.5 -ml-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer'
                                       >
                                          {isDeletingId === item.id ? (
                                             <div className='w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin'></div>
                                          ) : (
                                             <Trash2 className='w-3.5 h-3.5' />
                                          )}
                                       </button>
                                    )}
                                 </td>
                              )}
                           </tr>
                        )
                     })}
                  </tbody>
               </table>
            </div>
         )}

         {/* ═══ Всплывающий кастомный тултип для смарт-бейджей и категорий ═══ */}
         {hoveredTooltip && (hoveredTooltip.customContent || hoveredTooltip.item.smartMeta) && (() => {
            const badgeCenterX = hoveredTooltip.rect.left + hoveredTooltip.rect.width / 2
            const tooltipWidth = 360
            const halfW = tooltipWidth / 2
            const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200
            const tooltipLeft = Math.max(halfW + 12, Math.min(screenW - halfW - 12, badgeCenterX))
            const arrowLeft = Math.max(16, Math.min(tooltipWidth - 16, badgeCenterX - (tooltipLeft - halfW)))
            const isTopClipped = hoveredTooltip.rect.top < 180

            const content = hoveredTooltip.customContent || {
               icon: hoveredTooltip.item.smartMeta?.icon || (hoveredTooltip.item.smartMeta?.tag === 'HIT_REPEAT' ? '🔥' : 'ℹ️'),
               title: hoveredTooltip.item.smartMeta?.title || hoveredTooltip.item.smartMeta?.badgeText || '',
               titleColor: hoveredTooltip.item.smartMeta?.tag === 'HIT_REPEAT'
                  ? 'text-orange-400 font-black'
                  : hoveredTooltip.item.smartMeta?.tag === 'LAST_WEEK_UNFINISHED'
                  ? 'text-rose-400 font-black'
                  : hoveredTooltip.item.smartMeta?.tag === 'STAGNANT_STOCK'
                  ? 'text-red-400 font-black'
                  : hoveredTooltip.item.smartMeta?.tag === 'LONG_TIME_NO_PLAN'
                  ? getLongTimeStyles(hoveredTooltip.item.smartMeta?.consecutiveWeeks).tooltipTitle
                  : 'text-amber-400 font-black',
               subtitle: hoveredTooltip.item.smartMeta?.subtitle,
               description: hoveredTooltip.item.smartMeta?.tooltipText || '',
               recommendation: hoveredTooltip.item.smartMeta?.recommendation,
               footerHint: undefined,
            }

            return (
               <div
                  style={{
                     top: isTopClipped
                        ? hoveredTooltip.rect.bottom + 8
                        : hoveredTooltip.rect.top - 8,
                     left: tooltipLeft,
                     transform: isTopClipped ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
                     width: `${tooltipWidth}px`,
                  }}
                  className='fixed z-[99999] pointer-events-none max-w-[calc(100vw-24px)] bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 animate-in fade-in zoom-in-95 duration-150 select-none'
               >
                  {/* Заголовок тултипа */}
                  <div className='flex items-start justify-between gap-2.5 border-b border-slate-700/70 pb-2.5 mb-2.5'>
                     <div className='flex items-center gap-2.5 min-w-0'>
                        <span className='text-2xl leading-none shrink-0'>
                           {content.icon}
                        </span>
                        <div className='min-w-0'>
                           <h4
                              className={`text-sm font-black leading-snug tracking-tight ${
                                 content.titleColor || 'text-white'
                              }`}
                           >
                              {content.title}
                           </h4>
                           {content.subtitle && (
                              <p className='text-xs text-slate-300 mt-0.5 font-medium leading-tight'>
                                 {content.subtitle}
                              </p>
                           )}
                        </div>
                     </div>
                     <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase shrink-0 ${
                           hoveredTooltip.item.isPlanned
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                     >
                        {hoveredTooltip.item.isPlanned ? 'В плане' : 'Не в плане'}
                     </span>
                  </div>

                  {/* Описание */}
                  <p className='text-[13px] text-slate-100 leading-relaxed font-normal'>
                     {content.description}
                  </p>

                  {/* Рекомендация */}
                  {content.recommendation && (
                     <div className='mt-3 pt-2.5 border-t border-slate-800 flex items-start gap-2 text-xs font-semibold text-emerald-300'>
                        <span className='shrink-0 text-sm'>💡</span>
                        <span className='leading-snug'>
                           {content.recommendation}
                        </span>
                     </div>
                  )}

                  {/* Подсказка о клике / снятии маркера */}
                  {content.footerHint && (
                     <div className='mt-2.5 pt-2 border-t border-slate-800/60 flex items-center gap-1.5 text-[11px] font-medium text-slate-400'>
                        <span>🖱️</span>
                        <span>{content.footerHint}</span>
                     </div>
                  )}

                  {/* Стрелочка индикатора */}
                  <div
                     style={{ left: `${arrowLeft}px` }}
                     className={`absolute -translate-x-1/2 border-4 border-transparent ${
                        isTopClipped
                           ? 'bottom-full border-b-slate-900/95 -mb-1'
                           : 'top-full border-t-slate-900/95 -mt-1'
                     }`}
                  />
               </div>
            )
         })()}

         {/* Модальное окно подтверждения массовых действий и утверждения плана */}
         {bulkModalConfig && (
            <BulkPlanModal
               isOpen={bulkModalConfig.isOpen}
               actionType={bulkModalConfig.actionType}
               title={bulkModalConfig.title}
               description={bulkModalConfig.description}
               items={bulkModalConfig.items}
               plannedCount={plannedCount}
               isLoading={isBulkLoading || isConfirmingPlan}
               onClose={() => {
                  if (!isBulkLoading && !isConfirmingPlan) {
                     setBulkModalConfig(null)
                  }
               }}
               onConfirm={handleConfirmBulkAction}
            />
         )}
      </div>
   )
}
