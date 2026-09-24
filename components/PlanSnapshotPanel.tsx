'use client'

import React, { useState, useEffect, useMemo } from 'react'
import api from '@/lib/api'
import {
   ShieldCheck,
   AlertTriangle,
   Plus,
   Minus,
   CheckCircle2,
   X,
   RefreshCw,
   User,
   ChevronDown,
   ChevronUp,
   Eye,
   EyeOff,
   Clock,
   FileCheck,
} from 'lucide-react'

interface SnapshotItem {
   planItemId: string
   productName: string
   category?: string | null
   price?: number | null
   stockKg?: number | null
   isNew?: boolean
}

interface RemovedItem extends SnapshotItem {
   currentIsPlanned: boolean
   removedFromPlan: boolean
   stillExists: boolean
   lastUpdatedBy?: string | null
   updatedAt?: string | null
}

interface AddedItem extends SnapshotItem {
   addedAfterApproval: boolean
   lastUpdatedBy?: string | null
   updatedAt?: string | null
}

interface SnapshotDiff {
   removed: RemovedItem[]
   added: AddedItem[]
   unchanged: SnapshotItem[]
   removedCount: number
   addedCount: number
   unchangedCount: number
   originalCount: number
   currentPlannedCount: number
   hasChanges: boolean
}

interface SnapshotData {
   hasSnapshot: boolean
   snapshot: {
      id: string
      approvedBy: string
      approvedAt: string
      plannedCount: number
      snapshotItems?: SnapshotItem[]
   } | null
   diff: SnapshotDiff | null
}

interface PlanSnapshotPanelProps {
   weekId: string
   weekStatus: string
   isArchive?: boolean
   refreshTrigger?: number
   currentItems?: any[]
}

export default function PlanSnapshotPanel({
   weekId,
   weekStatus,
   isArchive = false,
   refreshTrigger = 0,
   currentItems,
}: PlanSnapshotPanelProps) {
   const [data, setData] = useState<SnapshotData | null>(null)
   const [isLoading, setIsLoading] = useState(false)
   const [isExpanded, setIsExpanded] = useState(false)
   const [showUnchanged, setShowUnchanged] = useState(false)

   const fetchSnapshot = async (isSilent = false) => {
      try {
         if (!isSilent) setIsLoading(true)
         const res = await api.get(`/api/weeks/${weekId}/snapshot`)
         setData(res.data)
         // Автоматически раскрываем, если есть изменения
         if (res.data?.diff?.hasChanges) {
            setIsExpanded(true)
         }
      } catch (err) {
         if (!isSilent) {
            console.error('Failed to load snapshot:', err)
         }
      } finally {
         if (!isSilent) setIsLoading(false)
      }
   }

   // 1. Первоначальная загрузка и обновление при явном триггере
   useEffect(() => {
      if (weekId) {
         fetchSnapshot(false)
      }
   }, [weekId, refreshTrigger])

   // 2. Фоновое Live-обновление (каждые 4 сек), чтобы действия других пользователей появлялись мгновенно
   useEffect(() => {
      if (!weekId || isArchive || weekStatus === 'CLOSED') return

      const interval = setInterval(() => {
         if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            fetchSnapshot(true)
         }
      }, 4000)

      const handleFocusOrVisible = () => {
         if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            fetchSnapshot(true)
         }
      }

      document.addEventListener('visibilitychange', handleFocusOrVisible)
      window.addEventListener('focus', handleFocusOrVisible)

      return () => {
         clearInterval(interval)
         document.removeEventListener('visibilitychange', handleFocusOrVisible)
         window.removeEventListener('focus', handleFocusOrVisible)
      }
   }, [weekId, isArchive, weekStatus])

   // 3. Мгновенный реактивный расчет изменений на клиенте (0 мс при клике на галочки)
   const activeDiff: SnapshotDiff | null = useMemo(() => {
      if (!data?.snapshot || !data?.diff) return null
      const snapshotList = data.snapshot.snapshotItems
      if (!snapshotList || !currentItems || currentItems.length === 0) {
         return data.diff
      }

      const snapshotNames = new Set(
         snapshotList.map((s) => s.productName.trim().toLowerCase())
      )
      const currentPlanned = currentItems.filter((i) => i.isPlanned)
      const currentPlannedNames = new Set(
         currentPlanned.map((i) => i.productName.trim().toLowerCase())
      )

      const removed: RemovedItem[] = snapshotList
         .filter((s) => !currentPlannedNames.has(s.productName.trim().toLowerCase()))
         .map((s) => {
            const currentItem = currentItems.find(
               (ci) => ci.productName.trim().toLowerCase() === s.productName.trim().toLowerCase()
            )
            const serverRemoved = data.diff?.removed.find(
               (r) => r.productName.trim().toLowerCase() === s.productName.trim().toLowerCase()
            )
            return {
               ...s,
               currentIsPlanned: currentItem?.isPlanned ?? false,
               removedFromPlan: true,
               stillExists: Boolean(currentItem),
               lastUpdatedBy: currentItem?.lastUpdatedBy || serverRemoved?.lastUpdatedBy || null,
               updatedAt: currentItem?.updatedAt || serverRemoved?.updatedAt || null,
            }
         })

      const added: AddedItem[] = currentPlanned
         .filter((i) => !snapshotNames.has(i.productName.trim().toLowerCase()))
         .map((i) => {
            const serverAdded = data.diff?.added.find(
               (a) => a.productName.trim().toLowerCase() === i.productName.trim().toLowerCase()
            )
            return {
               planItemId: i.id,
               productName: i.productName,
               category: i.category,
               price: i.price,
               stockKg: i.stockKg,
               isNew: i.isNew,
               addedAfterApproval: true,
               lastUpdatedBy: i.lastUpdatedBy || serverAdded?.lastUpdatedBy || null,
               updatedAt: i.updatedAt || serverAdded?.updatedAt || null,
            }
         })

      const unchanged: SnapshotItem[] = snapshotList
         .filter((s) => currentPlannedNames.has(s.productName.trim().toLowerCase()))
         .map((s) => ({
            ...s,
         }))

      return {
         removed,
         added,
         unchanged,
         removedCount: removed.length,
         addedCount: added.length,
         unchangedCount: unchanged.length,
         originalCount: data.snapshot.plannedCount,
         currentPlannedCount: currentPlanned.length,
         hasChanges: removed.length > 0 || added.length > 0,
      }
   }, [data, currentItems])

   // Автоматически разворачиваем панель при появлении любых расхождений
   useEffect(() => {
      if (activeDiff?.hasChanges) {
         setIsExpanded(true)
      }
   }, [activeDiff?.hasChanges])

   // Не показываем панель, если план ещё не утверждён
   if (!data || !data.hasSnapshot) {
      return null
   }

   const { snapshot } = data
   const diff = activeDiff || data.diff

   if (!snapshot || !diff) return null

   const formatDateTime = (dateStr: string) => {
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

   const formatPrice = (price?: number | null) => {
      if (price === null || price === undefined) return '—'
      return `${price.toFixed(0)} ₽`
   }

   const formatStock = (stockKg?: number | null) => {
      if (stockKg === null || stockKg === undefined) return '—'
      return `${stockKg} кг`
   }

   // Статус-бейдж для панели
   const hasIssues = diff.removedCount > 0
   const statusColor = hasIssues
      ? 'border-red-200 bg-red-50/50'
      : diff.addedCount > 0
        ? 'border-amber-200 bg-amber-50/30'
        : 'border-emerald-200 bg-emerald-50/30'
   const statusIcon = hasIssues ? (
      <AlertTriangle className='w-4 h-4 text-red-500' />
   ) : (
      <ShieldCheck className='w-4 h-4 text-emerald-500' />
   )

   return (
      <div
         className={`rounded-2xl border-2 ${statusColor} shadow-sm overflow-hidden transition-all duration-300`}
      >
         {/* Заголовок панели (кликабельный для разворачивания) */}
         <button
            onClick={() => setIsExpanded(!isExpanded)}
            className='w-full p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-white/50 transition-colors text-left'
         >
            <div className='flex items-center gap-3'>
               <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                     hasIssues
                        ? 'bg-red-100 text-red-600'
                        : 'bg-emerald-100 text-emerald-600'
                  }`}
               >
                  <FileCheck className='w-5 h-5' />
               </div>
               <div>
                  <div className='flex items-center gap-2'>
                     <h3 className='font-bold text-slate-900 text-sm sm:text-base'>
                        План vs Факт
                     </h3>
                     {statusIcon}
                     {hasIssues && (
                        <span className='px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wide animate-pulse'>
                           Изменения обнаружены
                        </span>
                     )}
                     {!isArchive && weekStatus !== 'CLOSED' && (
                        <span className='hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold'>
                           <span className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse'></span>
                           Live-контроль
                        </span>
                     )}
                  </div>
                  <p className='text-xs text-slate-500 mt-0.5'>
                     Утверждено{' '}
                     <span className='font-semibold text-slate-700'>
                        {snapshot.approvedBy}
                     </span>{' '}
                     • {formatDateTime(snapshot.approvedAt)} •{' '}
                     <span className='font-semibold'>
                        {snapshot.plannedCount} поз.
                     </span>
                  </p>
               </div>
            </div>

            <div className='flex items-center gap-3'>
               {/* Мини-статистика */}
               <div className='hidden sm:flex items-center gap-2'>
                  {diff.removedCount > 0 && (
                     <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-bold border border-red-200'>
                        <Minus className='w-3 h-3' />
                        {diff.removedCount} убрано
                     </span>
                  )}
                  {diff.addedCount > 0 && (
                     <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200'>
                        <Plus className='w-3 h-3' />
                        {diff.addedCount} добавлено
                     </span>
                  )}
                  {!diff.hasChanges && (
                     <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200'>
                        <CheckCircle2 className='w-3 h-3' />
                        Без изменений
                     </span>
                  )}
               </div>

               <button
                  onClick={(e) => {
                     e.stopPropagation()
                     fetchSnapshot()
                  }}
                  disabled={isLoading}
                  className='p-2 text-slate-400 hover:text-teal-600 hover:bg-white rounded-lg transition'
                  title='Обновить сравнение'
               >
                  <RefreshCw
                     className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                  />
               </button>

               {isExpanded ? (
                  <ChevronUp className='w-5 h-5 text-slate-400' />
               ) : (
                  <ChevronDown className='w-5 h-5 text-slate-400' />
               )}
            </div>
         </button>

         {/* Развёрнутое содержимое */}
         {isExpanded && (
            <div className='border-t border-slate-200/60 bg-white/70'>
               {/* Сводка */}
               <div className='px-4 sm:px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/50 border-b border-slate-100'>
                  <div className='text-center p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs'>
                     <div className='text-lg font-black text-slate-800'>
                        {diff.originalCount}
                     </div>
                     <div className='text-[10px] text-slate-500 font-medium uppercase tracking-wide'>
                        Утверждено
                     </div>
                  </div>
                  <div className='text-center p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs'>
                     <div className='text-lg font-black text-teal-600'>
                        {diff.currentPlannedCount}
                     </div>
                     <div className='text-[10px] text-slate-500 font-medium uppercase tracking-wide'>
                        Сейчас в плане
                     </div>
                  </div>
                  <div className='text-center p-2 rounded-xl bg-white border border-red-200/60 shadow-2xs'>
                     <div
                        className={`text-lg font-black ${diff.removedCount > 0 ? 'text-red-600' : 'text-slate-300'}`}
                     >
                        {diff.removedCount > 0
                           ? `−${diff.removedCount}`
                           : '0'}
                     </div>
                     <div className='text-[10px] text-slate-500 font-medium uppercase tracking-wide'>
                        Убрано
                     </div>
                  </div>
                  <div className='text-center p-2 rounded-xl bg-white border border-emerald-200/60 shadow-2xs'>
                     <div
                        className={`text-lg font-black ${diff.addedCount > 0 ? 'text-emerald-600' : 'text-slate-300'}`}
                     >
                        {diff.addedCount > 0 ? `+${diff.addedCount}` : '0'}
                     </div>
                     <div className='text-[10px] text-slate-500 font-medium uppercase tracking-wide'>
                        Добавлено
                     </div>
                  </div>
               </div>

               {/* Убранные позиции (красные) */}
               {diff.removed.length > 0 && (
                  <div className='px-4 sm:px-5 py-3'>
                     <div className='flex items-center gap-2 mb-2'>
                        <div className='w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center'>
                           <Minus className='w-3.5 h-3.5 text-red-600' />
                        </div>
                        <h4 className='font-bold text-red-700 text-sm'>
                           Убрано из плана после утверждения
                        </h4>
                        <span className='px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold'>
                           {diff.removed.length}
                        </span>
                     </div>
                     <div className='space-y-1.5'>
                        {diff.removed.map((item, idx) => (
                           <div
                              key={idx}
                              className='flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200/70 hover:bg-red-100/50 transition text-xs'
                           >
                              <div className='flex-1 min-w-0'>
                                 <div className='flex items-center gap-2'>
                                    <span className='font-bold text-red-800 line-through'>
                                       {item.productName}
                                    </span>
                                    {item.category && (
                                       <span className='px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-medium'>
                                          {item.category}
                                       </span>
                                    )}
                                 </div>
                                 <div className='flex items-center gap-3 mt-0.5 text-red-600/80'>
                                    {item.price != null && (
                                       <span>{formatPrice(item.price)}</span>
                                    )}
                                    {item.stockKg != null && (
                                       <span>{formatStock(item.stockKg)}</span>
                                    )}
                                 </div>
                              </div>
                              <div className='text-right text-[10px] text-red-500 shrink-0'>
                                 {item.lastUpdatedBy && (
                                    <div className='flex items-center gap-1'>
                                       <User className='w-3 h-3' />
                                       <span className='font-semibold'>
                                          {item.lastUpdatedBy}
                                       </span>
                                    </div>
                                 )}
                                 {item.updatedAt && (
                                    <div className='flex items-center gap-1 mt-0.5'>
                                       <Clock className='w-3 h-3' />
                                       {formatDateTime(item.updatedAt)}
                                    </div>
                                 )}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {/* Добавленные позиции (зелёные) */}
               {diff.added.length > 0 && (
                  <div className='px-4 sm:px-5 py-3 border-t border-slate-100'>
                     <div className='flex items-center gap-2 mb-2'>
                        <div className='w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center'>
                           <Plus className='w-3.5 h-3.5 text-emerald-600' />
                        </div>
                        <h4 className='font-bold text-emerald-700 text-sm'>
                           Добавлено в план после утверждения
                        </h4>
                        <span className='px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold'>
                           {diff.added.length}
                        </span>
                     </div>
                     <div className='space-y-1.5'>
                        {diff.added.map((item, idx) => (
                           <div
                              key={idx}
                              className='flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200/70 hover:bg-emerald-100/50 transition text-xs'
                           >
                              <div className='flex-1 min-w-0'>
                                 <div className='flex items-center gap-2'>
                                    <span className='font-bold text-emerald-800'>
                                       + {item.productName}
                                    </span>
                                    {item.category && (
                                       <span className='px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 text-[10px] font-medium'>
                                          {item.category}
                                       </span>
                                    )}
                                    {item.isNew && (
                                       <span className='px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold'>
                                          НОВ
                                       </span>
                                    )}
                                 </div>
                                 <div className='flex items-center gap-3 mt-0.5 text-emerald-600/80'>
                                    {item.price != null && (
                                       <span>{formatPrice(item.price)}</span>
                                    )}
                                    {item.stockKg != null && (
                                       <span>{formatStock(item.stockKg)}</span>
                                    )}
                                 </div>
                              </div>
                              <div className='text-right text-[10px] text-emerald-500 shrink-0'>
                                 {item.lastUpdatedBy && (
                                    <div className='flex items-center gap-1'>
                                       <User className='w-3 h-3' />
                                       <span className='font-semibold'>
                                          {item.lastUpdatedBy}
                                       </span>
                                    </div>
                                 )}
                                 {item.updatedAt && (
                                    <div className='flex items-center gap-1 mt-0.5'>
                                       <Clock className='w-3 h-3' />
                                       {formatDateTime(item.updatedAt)}
                                    </div>
                                 )}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {/* Без изменений (свёрнуто по умолчанию) */}
               {diff.unchanged.length > 0 && (
                  <div className='px-4 sm:px-5 py-3 border-t border-slate-100'>
                     <button
                        onClick={() => setShowUnchanged(!showUnchanged)}
                        className='flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition'
                     >
                        {showUnchanged ? (
                           <EyeOff className='w-3.5 h-3.5' />
                        ) : (
                           <Eye className='w-3.5 h-3.5' />
                        )}
                        <span className='font-medium'>
                           {showUnchanged ? 'Скрыть' : 'Показать'} неизменённые
                           позиции ({diff.unchangedCount})
                        </span>
                     </button>
                     {showUnchanged && (
                        <div className='mt-2 space-y-1'>
                           {diff.unchanged.map((item, idx) => (
                              <div
                                 key={idx}
                                 className='flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/50 text-xs'
                              >
                                 <CheckCircle2 className='w-3.5 h-3.5 text-emerald-400 shrink-0' />
                                 <span className='font-medium text-slate-700'>
                                    {item.productName}
                                 </span>
                                 {item.category && (
                                    <span className='px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]'>
                                       {item.category}
                                    </span>
                                 )}
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               )}

               {/* Если нет изменений */}
               {!diff.hasChanges && (
                  <div className='px-4 sm:px-5 py-6 text-center'>
                     <ShieldCheck className='w-8 h-8 text-emerald-400 mx-auto mb-2' />
                     <p className='text-sm font-bold text-emerald-700'>
                        План не менялся после утверждения
                     </p>
                     <p className='text-xs text-slate-500 mt-1'>
                        Все {diff.originalCount} позиций остаются в плане как
                        были утверждены
                     </p>
                  </div>
               )}
            </div>
         )}
      </div>
   )
}
