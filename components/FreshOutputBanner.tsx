'use client'

import React, { useState, useMemo } from 'react'
import {
   Factory,
   ChevronDown,
   ChevronUp,
   Check,
   Plus,
   ExternalLink,
   Clock,
   Package,
   TrendingUp,
   HelpCircle,
   ArrowUpDown,
   Info,
} from 'lucide-react'
import { PlanItem } from './Checklist'
import {
   getStockOutputInfo,
   StockOutputInfo,
   UploadReportData,
} from '@/lib/stockOutputUtils'

interface FreshOutputBannerProps {
   items: PlanItem[]
   uploadReport?: UploadReportData | null
   canTogglePlan: boolean
   onTogglePlan: (item: PlanItem) => void
}

type SortMode = 'date' | 'volume'
type FilterMode = 'all' | 'unplanned' | 'planned'

export default function FreshOutputBanner({
   items,
   uploadReport,
   canTogglePlan,
   onTogglePlan,
}: FreshOutputBannerProps) {
   const [isExpanded, setIsExpanded] = useState(true)
   const [sortMode, setSortMode] = useState<SortMode>('date')
   const [filterMode, setFilterMode] = useState<FilterMode>('all')
   const [hoveredItemId, setHoveredItemId] = useState<string | null>(null)

   // Находим позиции с пополнением (свежим выходом) за активную неделю
   const outputsList = useMemo(() => {
      const active = items.filter((i) => !i.isDeleted)
      const list: Array<{ item: PlanItem; info: StockOutputInfo }> = []

      for (const item of active) {
         const info = getStockOutputInfo(item, uploadReport)
         if (info) {
            list.push({ item, info })
         }
      }

      return list
   }, [items, uploadReport])

   // Сортировка
   const sortedOutputs = useMemo(() => {
      const list = [...outputsList]
      if (sortMode === 'volume') {
         list.sort((a, b) => b.info.addedKg - a.info.addedKg)
      } else {
         list.sort((a, b) => {
            const timeDiff =
               new Date(b.info.replenishedAt).getTime() -
               new Date(a.info.replenishedAt).getTime()
            if (timeDiff !== 0) return timeDiff
            return b.info.addedKg - a.info.addedKg
         })
      }
      return list
   }, [outputsList, sortMode])

   // Фильтрация
   const displayedOutputs = useMemo(() => {
      if (filterMode === 'unplanned') {
         return sortedOutputs.filter((entry) => !entry.item.isPlanned)
      }
      if (filterMode === 'planned') {
         return sortedOutputs.filter((entry) => entry.item.isPlanned)
      }
      return sortedOutputs
   }, [sortedOutputs, filterMode])

   const plannedCount = outputsList.filter((e) => e.item.isPlanned).length
   const unplannedCount = outputsList.length - plannedCount

   // Если нет ни одной позиции со свежим пополнением — показываем аккуратное информационное состояние
   if (outputsList.length === 0) {
      return (
         <div className='mb-6 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all'>
            <div className='p-4 sm:p-5 flex items-center justify-between gap-3'>
               <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold shrink-0'>
                     <Factory className='w-5 h-5' />
                  </div>
                  <div>
                     <h3 className='font-black text-slate-900 text-base tracking-tight'>
                        🏭 Свежий выход продукции
                     </h3>
                     <p className='text-xs text-slate-500 font-medium mt-0.5'>
                        На текущей неделе пока не зафиксировано пополнений остатка из цеха. Как только будет загружена выгрузка 1С с увеличением остатка, позиции автоматически появятся здесь.
                     </p>
                  </div>
               </div>
               <span className='px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0'>
                  0 позиций
               </span>
            </div>
         </div>
      )
   }

   const handleScrollToItem = (itemId: string) => {
      const el = document.getElementById(`plan-item-${itemId}`)
      if (el) {
         el.scrollIntoView({ behavior: 'smooth', block: 'center' })
         el.classList.add('ring-2', 'ring-emerald-500', 'bg-emerald-50/80')
         setTimeout(() => {
            el.classList.remove('ring-2', 'ring-emerald-500', 'bg-emerald-50/80')
         }, 2500)
      }
   }

   return (
      <div className='mb-6 rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 shadow-xs overflow-hidden transition-all'>
         {/* Заголовок менюшки-баннера */}
         <div className='p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-emerald-100'>
            <div className='flex items-center gap-3'>
               <div className='w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20 shrink-0'>
                  <Factory className='w-5 h-5' />
               </div>
               <div>
                  <div className='flex items-center gap-2 flex-wrap'>
                     <h3 className='font-black text-slate-900 text-base sm:text-lg tracking-tight'>
                        🏭 Свежий выход продукции
                     </h3>
                     <span className='px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'>
                        {outputsList.length}{' '}
                        {outputsList.length === 1
                           ? 'позиция'
                           : outputsList.length < 5
                           ? 'позиции'
                           : 'позиций'}{' '}
                        с пополнением
                     </span>
                  </div>
                  <p className='text-xs text-slate-500 font-medium mt-0.5'>
                     Продукция, по которой в течение текущей недели зафиксирован выпуск из цеха и пополнение остатка на складе.
                  </p>
               </div>
            </div>

            {/* Управление: фильтры внутри менюшки + сворачивание */}
            <div className='flex items-center gap-2 self-end md:self-center flex-wrap'>
               {isExpanded && (
                  <>
                     {/* Переключатель фильтра */}
                     <div className='inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold'>
                        <button
                           type='button'
                           onClick={() => setFilterMode('all')}
                           className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                              filterMode === 'all'
                                 ? 'bg-white text-slate-900 shadow-2xs font-bold'
                                 : 'text-slate-600 hover:text-slate-900'
                           }`}
                        >
                           Все ({outputsList.length})
                        </button>
                        <button
                           type='button'
                           onClick={() => setFilterMode('unplanned')}
                           className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                              filterMode === 'unplanned'
                                 ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                                 : 'text-slate-600 hover:text-emerald-700'
                           }`}
                        >
                           Не в плане ({unplannedCount})
                        </button>
                        <button
                           type='button'
                           onClick={() => setFilterMode('planned')}
                           className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                              filterMode === 'planned'
                                 ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                                 : 'text-slate-600 hover:text-emerald-700'
                           }`}
                        >
                           В плане ({plannedCount})
                        </button>
                     </div>

                     {/* Переключатель сортировки */}
                     <button
                        type='button'
                        onClick={() =>
                           setSortMode(sortMode === 'date' ? 'volume' : 'date')
                        }
                        className='px-2.5 py-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 transition cursor-pointer'
                        title={
                           sortMode === 'date'
                              ? 'Сортировка: по дате выхода. Нажмите, чтобы сортировать по объему (+кг)'
                              : 'Сортировка: по объему (+кг). Нажмите, чтобы сортировать по дате'
                        }
                     >
                        <ArrowUpDown className='w-3 h-3 text-slate-500' />
                        <span>
                           {sortMode === 'date' ? 'Свежие' : 'Крупные партии'}
                        </span>
                     </button>
                  </>
               )}

               {/* Кнопка свернуть/развернуть */}
               <button
                  type='button'
                  onClick={() => setIsExpanded(!isExpanded)}
                  className='p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer'
                  title={
                     isExpanded
                        ? 'Свернуть менюшку свежего выхода'
                        : 'Развернуть менюшку свежего выхода'
                  }
               >
                  {isExpanded ? (
                     <ChevronUp className='w-4 h-4' />
                  ) : (
                     <ChevronDown className='w-4 h-4' />
                  )}
               </button>
            </div>
         </div>

         {/* Содержимое: карточки продукции со свежим выходом */}
         {isExpanded && (
            <div className='p-4 sm:p-5 bg-white/70'>
               {displayedOutputs.length > 0 ? (
                  <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'>
                     {displayedOutputs.map(({ item, info }) => {
                        const isHovered = hoveredItemId === item.id

                        return (
                           <div
                              key={item.id}
                              onMouseEnter={() => setHoveredItemId(item.id)}
                              onMouseLeave={() => setHoveredItemId(null)}
                              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 relative group ${
                                 item.isPlanned
                                    ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-400/20'
                                    : 'bg-white hover:bg-emerald-50/30 border-emerald-100 hover:border-emerald-300 shadow-2xs hover:shadow-md'
                              }`}
                           >
                              {/* Верхняя строка: категория + дата выхода */}
                              <div className='flex items-center justify-between gap-1.5'>
                                 <span className='text-[10px] uppercase font-bold text-slate-400 truncate max-w-[130px]'>
                                    {item.category || 'Без категории'}
                                 </span>

                                 <span
                                    className='px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    title={`Дата пополнения: ${info.formattedDate}`}
                                 >
                                    <Clock className='w-2.5 h-2.5' />
                                    <span>{info.shortDate}</span>
                                    <span className='opacity-40'>•</span>
                                    <span className='font-medium'>{info.formattedRelative}</span>
                                 </span>
                              </div>

                              {/* Название рыбы */}
                              <div>
                                 <h4
                                    className='text-xs sm:text-sm font-black text-slate-900 leading-snug line-clamp-2 hover:text-emerald-700 cursor-pointer'
                                    onClick={() => handleScrollToItem(item.id)}
                                    title={item.productName}
                                 >
                                    {item.productName}
                                 </h4>

                                 {/* Главный показатель: сколько вышло из производства (+кг) */}
                                 <div className='mt-2 flex items-center justify-between gap-2 bg-emerald-50/70 p-2 rounded-lg border border-emerald-100/80'>
                                    <div className='flex items-center gap-1.5'>
                                       <TrendingUp className='w-3.5 h-3.5 text-emerald-600 shrink-0' />
                                       <span className='text-[11px] font-bold text-emerald-900'>
                                          Выход:
                                       </span>
                                       <span className='text-xs font-black text-emerald-700'>
                                          +{info.addedKg} кг
                                       </span>
                                    </div>
                                    <div className='text-[10px] text-slate-500 font-medium'>
                                       было {info.fromKg} → стало {info.toKg} кг
                                    </div>
                                 </div>

                                 {/* Текущий остаток на складе */}
                                 <div className='mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium'>
                                    <Package className='w-3 h-3 text-slate-400 shrink-0' />
                                    <span>
                                       Текущий остаток:{' '}
                                       <strong className='text-slate-900 font-bold'>
                                          {info.currentStockKg} кг
                                       </strong>
                                    </span>
                                 </div>
                              </div>

                              {/* Сводка при наведении (Tooltip / Popover с подробностями) */}
                              {isHovered && (
                                 <div className='absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-1.5 pointer-events-none animate-in fade-in zoom-in-95 duration-150'>
                                    <div className='font-bold text-emerald-400 flex items-center gap-1 border-b border-slate-700 pb-1'>
                                       <Factory className='w-3.5 h-3.5' />
                                       <span>Сводка выхода из производства</span>
                                    </div>
                                    <div className='text-[11px] text-slate-300 space-y-1'>
                                       <div>
                                          Товар: <strong className='text-white'>{item.productName}</strong>
                                       </div>
                                       <div>
                                          Дата фиксации:{' '}
                                          <strong className='text-emerald-300'>
                                             {info.formattedDate} ({info.formattedRelative})
                                          </strong>
                                       </div>
                                       <div>
                                          Партия выпуска:{' '}
                                          <strong className='text-emerald-400'>
                                             +{info.addedKg} кг
                                          </strong>{' '}
                                          (остаток: {info.fromKg} кг → {info.toKg} кг)
                                       </div>
                                       {info.replenishCount > 1 && (
                                          <div className='text-[10px] text-teal-300 pt-0.5 border-t border-slate-800'>
                                             За неделю пополнялся {info.replenishCount} раз(а), суммарно: +{info.totalAddedKg} кг
                                          </div>
                                       )}
                                       <div>
                                          Текущий остаток на складе:{' '}
                                          <strong className='text-white'>{info.currentStockKg} кг</strong>
                                       </div>
                                       <div>
                                          Статус в плане производства:{' '}
                                          {item.isPlanned ? (
                                             <span className='text-emerald-400 font-bold'>
                                                В плане {item.plannedKg ? `(${item.plannedKg} кг)` : ''}
                                             </span>
                                          ) : (
                                             <span className='text-amber-300'>Не включено в план</span>
                                          )}
                                       </div>
                                    </div>
                                    {/* Стрелочка тултипа */}
                                    <div className='absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900' />
                                 </div>
                              )}

                              {/* Нижняя плашка карточки: кнопки действия */}
                              <div className='pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto'>
                                 {item.isPlanned ? (
                                    <div className='flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-lg'>
                                       <Check className='w-3.5 h-3.5 text-emerald-600' />
                                       <span>В плане</span>
                                       {item.plannedKg && item.plannedKg > 0 && (
                                          <span className='font-normal text-emerald-800'>
                                             ({item.plannedKg} кг)
                                          </span>
                                       )}
                                    </div>
                                 ) : canTogglePlan ? (
                                    <button
                                       type='button'
                                       onClick={() => onTogglePlan(item)}
                                       className='px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer'
                                    >
                                       <Plus className='w-3 h-3 text-emerald-600' />
                                       <span>В план</span>
                                    </button>
                                 ) : (
                                    <span className='text-[10px] text-slate-400 font-medium'>
                                       Не в плане
                                    </span>
                                 )}

                                 <button
                                    type='button'
                                    onClick={() => handleScrollToItem(item.id)}
                                    className='text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 transition cursor-pointer flex items-center gap-0.5'
                                    title='Найти эту позицию в таблице чеклиста'
                                 >
                                    <span>В таблице</span>
                                    <ExternalLink className='w-2.5 h-2.5' />
                                 </button>
                              </div>
                           </div>
                        )
                     })}
                  </div>
               ) : (
                  <div className='py-6 px-4 text-center text-xs text-slate-500'>
                     По выбранному фильтру позиций со свежим выходом нет.
                  </div>
               )}
            </div>
         )}
      </div>
   )
}
