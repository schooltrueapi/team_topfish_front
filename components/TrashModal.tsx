'use client'

import React, { useState, useMemo } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import {
   X,
   Trash2,
   RotateCcw,
   AlertTriangle,
   Search,
   Layers,
   PackageX,
   CheckCircle2,
   ArrowRight,
   Calendar,
   Sparkles,
   Flame,
   Clock,
} from 'lucide-react'
import { PlanItem } from './Checklist'

interface TrashModalProps {
   isOpen: boolean
   onClose: () => void
   items: PlanItem[]
   weekId: string
   canTogglePlan: boolean
   onItemRestored: (item: PlanItem) => void
   onAllRestored: () => void
   onItemDeletedPermanently: (itemId: string) => void
}

export default function TrashModal({
   isOpen,
   onClose,
   items,
   weekId,
   canTogglePlan,
   onItemRestored,
   onAllRestored,
   onItemDeletedPermanently,
}: TrashModalProps) {
   const [search, setSearch] = useState('')
   const [selectedCategory, setSelectedCategory] = useState('ALL')
   const [isRestoringAll, setIsRestoringAll] = useState(false)
   const [restoringId, setRestoringId] = useState<string | null>(null)
   const [deletingId, setDeletingId] = useState<string | null>(null)
   const [confirmDeleteItem, setConfirmDeleteItem] = useState<PlanItem | null>(null)

   // Список уникальных категорий позиций в корзине
   const categories = useMemo(() => {
      const cats = new Set(items.map((i) => i.category).filter(Boolean))
      return ['ALL', ...Array.from(cats)]
   }, [items])

   // Фильтрация позиций в корзине
   const filteredItems = useMemo(() => {
      return items.filter((item) => {
         if (
            search &&
            !item.productName.toLowerCase().includes(search.toLowerCase())
         ) {
            return false
         }
         if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
            return false
         }
         return true
      })
   }, [items, search, selectedCategory])

   if (!isOpen) return null

   // Восстановление одной позиции
   const handleRestoreItem = async (item: PlanItem) => {
      if (!canTogglePlan) {
         toast.error('У вашей роли нет прав для восстановления позиций')
         return
      }
      try {
         setRestoringId(item.id)
         const res = await api.put(`/api/plan/trash/restore/${item.id}`)
         toast.success(`Позиция "${item.productName}" восстановлена в план`)
         onItemRestored(res.data)
      } catch (err: any) {
         toast.error(err.response?.data?.error || 'Ошибка восстановления позиции')
      } finally {
         setRestoringId(null)
      }
   }

   // Восстановление ВСЕХ позиций сразу
   const handleRestoreAll = async () => {
      if (!canTogglePlan) {
         toast.error('У вашей роли нет прав для восстановления позиций')
         return
      }
      if (items.length === 0) return

      try {
         setIsRestoringAll(true)
         const res = await api.put('/api/plan/trash/restore-all', { weekId })
         const restoredCount = res.data.count ?? items.length
         toast.success(
            `Восстановлено ${restoredCount} позиций из корзины в план недели! 🎉`
         )
         onAllRestored()
      } catch (err: any) {
         toast.error(err.response?.data?.error || 'Ошибка восстановления всех позиций')
      } finally {
         setIsRestoringAll(false)
      }
   }

   // Окончательное удаление позиции (только поштучно, после подтверждения)
   const handleConfirmPermanentDelete = async () => {
      if (!confirmDeleteItem) return
      if (!canTogglePlan) {
         toast.error('У вашей роли нет прав для удаления позиций')
         setConfirmDeleteItem(null)
         return
      }

      const itemToDelete = confirmDeleteItem
      try {
         setDeletingId(itemToDelete.id)
         await api.delete(`/api/plan/trash/item/${itemToDelete.id}`)
         toast.success(`Позиция "${itemToDelete.productName}" окончательно удалена`)
         onItemDeletedPermanently(itemToDelete.id)
         setConfirmDeleteItem(null)
      } catch (err: any) {
         toast.error(err.response?.data?.error || 'Ошибка окончательного удаления позиции')
      } finally {
         setDeletingId(null)
      }
   }

   return (
      <div className='fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4'>
         <div className='bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200'>
            {/* ═══ Шапка модального окна ═══ */}
            <div className='p-5 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-rose-50/80 via-amber-50/40 to-slate-50 flex items-start justify-between gap-4'>
               <div className='flex items-start gap-3.5'>
                  <div className='w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0'>
                     <Trash2 className='w-5 h-5' />
                  </div>
                  <div>
                     <div className='flex items-center gap-2.5 flex-wrap'>
                        <h3 className='text-lg font-bold text-slate-900 leading-tight'>
                           Корзина позиций плана
                        </h3>
                        <span className='px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200'>
                           {items.length} {items.length === 1 ? 'позиция' : items.length >= 2 && items.length <= 4 ? 'позиции' : 'позиций'}
                        </span>
                     </div>
                     <p className='text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed'>
                        Сюда автоматически перемещаются товары, названия которых отсутствуют в загруженном файле 1С прайса.
                     </p>
                  </div>
               </div>

               <div className='flex items-center gap-2 shrink-0'>
                  {/* Кнопка "Восстановить все" */}
                  {items.length > 0 && canTogglePlan && (
                     <button
                        type='button'
                        onClick={handleRestoreAll}
                        disabled={isRestoringAll}
                        className='px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm shadow-teal-600/25 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50'
                        title='Восстановить все позиции из корзины обратно в рабочий план'
                     >
                        <RotateCcw
                           className={`w-4 h-4 ${isRestoringAll ? 'animate-spin' : ''}`}
                        />
                        <span>
                           {isRestoringAll ? 'Восстановление...' : 'Восстановить все'}
                        </span>
                     </button>
                  )}

                  <button
                     onClick={onClose}
                     className='w-9 h-9 rounded-xl hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer'
                     title='Закрыть'
                  >
                     <X className='w-5 h-5' />
                  </button>
               </div>
            </div>

            {/* ═══ Панель поиска и фильтров ═══ */}
            {items.length > 0 && (
               <div className='p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3'>
                  {/* Поиск */}
                  <div className='relative flex-1 min-w-[200px]'>
                     <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400'>
                        <Search className='w-4 h-4' />
                     </div>
                     <input
                        type='text'
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder='Поиск в корзине по названию...'
                        className='w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs'
                     />
                  </div>

                  {/* Фильтр по категории */}
                  {categories.length > 2 && (
                     <div className='flex items-center gap-1.5'>
                        <Layers className='w-4 h-4 text-slate-400 hidden sm:block' />
                        <select
                           value={selectedCategory}
                           onChange={(e) => setSelectedCategory(e.target.value)}
                           className='px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs'
                        >
                           <option value='ALL'>
                              Все категории ({items.length})
                           </option>
                           {categories
                              .filter((c) => c !== 'ALL')
                              .map((cat) => (
                                 <option key={cat as string} value={cat as string}>
                                    {cat} (
                                    {
                                       items.filter((i) => i.category === cat)
                                          .length
                                    }
                                    )
                                 </option>
                              ))}
                        </select>
                     </div>
                  )}
               </div>
            )}

            {/* ═══ Список товаров в корзине ═══ */}
            <div className='flex-1 overflow-y-auto p-4 sm:p-6'>
               {items.length === 0 ? (
                  <div className='py-16 text-center space-y-3'>
                     <div className='w-16 h-16 mx-auto rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center'>
                        <PackageX className='w-8 h-8' />
                     </div>
                     <h4 className='text-base font-bold text-slate-800'>
                        Корзина пуста
                     </h4>
                     <p className='text-sm text-slate-500 max-w-md mx-auto'>
                        Все позиции из плана присутствуют в текущем файле 1С прайса.
                        Если при очередной загрузке какая-либо позиция пропадет из файла, она появится здесь.
                     </p>
                  </div>
               ) : filteredItems.length === 0 ? (
                  <div className='py-12 text-center text-slate-400 text-sm'>
                     По запросу «{search}» ничего не найдено в корзине
                  </div>
               ) : (
                  <div className='border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white'>
                     <div className='overflow-x-auto'>
                        <table className='w-full text-xs sm:text-sm text-left border-collapse'>
                           <thead className='bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold'>
                              <tr>
                                 <th className='px-4 py-3'>Наименование товара</th>
                                 <th className='px-3 py-3 w-[160px]'>Категория</th>
                                 <th className='px-3 py-3 w-[150px]'>Дата переноса</th>
                                 <th className='px-4 py-3 text-right w-[200px]'>Действия</th>
                              </tr>
                           </thead>
                           <tbody className='divide-y divide-slate-100'>
                              {filteredItems.map((item) => {
                                 const isCurrentlyRestoring = restoringId === item.id
                                 const isCurrentlyDeleting = deletingId === item.id

                                 return (
                                    <tr
                                       key={item.id}
                                       className='hover:bg-slate-50/70 transition'
                                    >
                                       {/* Название */}
                                       <td className='px-4 py-3.5'>
                                          <div className='font-semibold text-slate-800 text-xs sm:text-sm'>
                                             {item.productName}
                                          </div>
                                          <div className='flex items-center gap-1.5 mt-1 flex-wrap'>
                                             <span className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200'>
                                                Отсутствует в файле 1С
                                             </span>
                                             {item.isNew && (
                                                <span className='inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200'>
                                                   <Sparkles className='w-2.5 h-2.5' /> Новинка
                                                </span>
                                             )}
                                             {item.isHit && (
                                                <span className='inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200'>
                                                   <Flame className='w-2.5 h-2.5' /> Хит
                                                </span>
                                             )}
                                          </div>
                                       </td>

                                       {/* Категория */}
                                       <td className='px-3 py-3.5 text-slate-600 font-medium whitespace-nowrap text-xs'>
                                          {item.category || '—'}
                                       </td>

                                       {/* Дата переноса */}
                                       <td className='px-3 py-3.5 text-slate-500 whitespace-nowrap text-xs'>
                                          <div className='flex items-center gap-1.5'>
                                             <Calendar className='w-3.5 h-3.5 text-slate-400' />
                                             <span>
                                                {item.deletedAt
                                                   ? new Date(item.deletedAt).toLocaleDateString('ru-RU', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                     })
                                                   : item.updatedAt
                                                   ? new Date(item.updatedAt).toLocaleDateString('ru-RU', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                     })
                                                   : '—'}
                                             </span>
                                          </div>
                                       </td>

                                       {/* Действия: Восстановить (поштучно) + Удалить окончательно (поштучно) */}
                                       <td className='px-4 py-3.5 text-right whitespace-nowrap'>
                                          <div className='inline-flex items-center justify-end gap-1.5'>
                                             {/* Кнопка "Восстановить" */}
                                             <button
                                                type='button'
                                                onClick={() => handleRestoreItem(item)}
                                                disabled={!canTogglePlan || isCurrentlyRestoring || isCurrentlyDeleting}
                                                className='px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition cursor-pointer flex items-center gap-1 disabled:opacity-40'
                                                title='Восстановить позицию обратно в план недели'
                                             >
                                                {isCurrentlyRestoring ? (
                                                   <div className='w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin' />
                                                ) : (
                                                   <RotateCcw className='w-3 h-3' />
                                                )}
                                                <span>Восстановить</span>
                                             </button>

                                             {/* Кнопка "Удалить окончательно" (открывает подтверждение) */}
                                             <button
                                                type='button'
                                                onClick={() => setConfirmDeleteItem(item)}
                                                disabled={!canTogglePlan || isCurrentlyRestoring || isCurrentlyDeleting}
                                                className='p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-40'
                                                title='Удалить позицию окончательно из базы данных'
                                             >
                                                {isCurrentlyDeleting ? (
                                                   <div className='w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin' />
                                                ) : (
                                                   <Trash2 className='w-3.5 h-3.5' />
                                                )}
                                             </button>
                                          </div>
                                       </td>
                                    </tr>
                                 )
                              })}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}
            </div>

            {/* ═══ Подвал ═══ */}
            <div className='p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500'>
               <div>
                  {items.length > 0 && (
                     <span>
                        Окончательное удаление возможно только поштучно с подтверждением
                     </span>
                  )}
               </div>
               <button
                  type='button'
                  onClick={onClose}
                  className='px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition cursor-pointer text-xs sm:text-sm'
               >
                  Закрыть
               </button>
            </div>
         </div>

         {/* ═══ Диалог подтверждения окончательного удаления (ТОЛЬКО ПОШТУЧНО) ═══ */}
         {confirmDeleteItem && (
            <div className='fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150'>
               <div className='bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 overflow-hidden space-y-4 animate-in zoom-in-95 duration-150'>
                  <div className='w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center'>
                     <AlertTriangle className='w-6 h-6' />
                  </div>
                  <div>
                     <h4 className='text-base font-bold text-slate-900'>
                        Окончательное удаление
                     </h4>
                     <p className='text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed'>
                        Вы уверены, что хотите окончательно удалить позицию{' '}
                        <span className='font-bold text-slate-800'>
                           «{confirmDeleteItem.productName}»
                        </span>{' '}
                        из базы данных?
                     </p>
                     <p className='text-xs text-rose-600 font-medium mt-2 bg-rose-50 p-2.5 rounded-xl border border-rose-200'>
                        ⚠️ Это действие необратимо. Позиция будет навсегда стёрта из текущего плана.
                     </p>
                  </div>

                  <div className='flex items-center justify-end gap-2.5 pt-2'>
                     <button
                        type='button'
                        onClick={() => setConfirmDeleteItem(null)}
                        disabled={deletingId !== null}
                        className='px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer'
                     >
                        Отмена
                     </button>
                     <button
                        type='button'
                        onClick={handleConfirmPermanentDelete}
                        disabled={deletingId !== null}
                        className='px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm shadow-rose-600/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50'
                     >
                        {deletingId === confirmDeleteItem.id ? (
                           <div className='w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                        ) : (
                           <Trash2 className='w-3.5 h-3.5' />
                        )}
                        <span>Удалить окончательно</span>
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   )
}
