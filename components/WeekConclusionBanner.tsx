'use client'

import React, { useState } from 'react'
import {
   CheckCircle2,
   AlertTriangle,
   XCircle,
   HelpCircle,
   ArrowLeft,
   UserCheck,
   FileSpreadsheet,
   Award,
   Lock,
   History,
   Pencil,
} from 'lucide-react'
import WeekAuditLogsModal, { WeekAuditLog } from './WeekAuditLogsModal'

interface WeekConclusionBannerProps {
   week: {
      id: string
      weekNumber: number
      year: number
      startDate: string
      endDate: string
      status: string
      excelFileName?: string | null
   }
   stats: {
      totalItems: number
      totalPlanned: number
      completed: number
      forgotten: number
      noRaw: number
      other: number
      percentCompleted: number
      noveltiesCount?: number
      outOfStockCount?: number
   }
   closeAuditLog?: {
      userName: string
      userRole?: string | null
      createdAt: string
      details: string
   } | null
   auditLogs?: WeekAuditLog[]
   canEditArchive?: boolean
   currentFilter: string
   onFilterChange: (filter: string) => void
   onReturnToCurrent: () => void
   currentWeekNumber?: number
}

export default function WeekConclusionBanner({
   week,
   stats,
   closeAuditLog,
   auditLogs = [],
   canEditArchive = false,
   currentFilter,
   onFilterChange,
   onReturnToCurrent,
   currentWeekNumber,
}: WeekConclusionBannerProps) {
   const [isLogsModalOpen, setIsLogsModalOpen] = useState(false)
   const formatDate = (dateStr?: string) => {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      return d.toLocaleDateString('ru-RU', {
         day: 'numeric',
         month: 'short',
         year: 'numeric',
      })
   }

   const formatDateTime = (dateStr?: string) => {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      return d.toLocaleString('ru-RU', {
         day: '2-digit',
         month: '2-digit',
         year: 'numeric',
         hour: '2-digit',
         minute: '2-digit',
      })
   }

   const percent = stats.percentCompleted ?? 0

   return (
      <div className='mb-6 space-y-4'>
         {/* ═══ Плашка уведомления о режиме архива ═══ */}
         <div className='bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-4 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
            <div className='flex items-center gap-3'>
               <div className='w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-xl shrink-0 shadow-inner'>
                  📁
               </div>
               <div>
                  <div className='flex items-center gap-2 flex-wrap'>
                     <span className='text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-white/25 text-white'>
                        Архив учета • Неделя №{week.weekNumber} ({week.year})
                     </span>
                     <span className='text-xs font-bold px-2 py-0.5 rounded-full bg-slate-900/30 text-amber-100 border border-white/20'>
                        Статус: ЗАКРЫТА
                     </span>
                  </div>
                  <p className='text-amber-100 text-xs mt-0.5 font-medium'>
                     Период: {formatDate(week.startDate)} —{' '}
                     {formatDate(week.endDate)}
                     {week.excelFileName && (
                        <span className='ml-2 inline-flex items-center gap-1 text-white font-semibold'>
                           • <FileSpreadsheet className='w-3.5 h-3.5' />{' '}
                           {week.excelFileName}
                        </span>
                     )}
                  </p>
               </div>
            </div>

            <button
               type='button'
               onClick={onReturnToCurrent}
               className='inline-flex items-center gap-1.5 px-4 py-2 bg-white text-slate-900 hover:bg-amber-50 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap self-stretch sm:self-auto justify-center'
            >
               <ArrowLeft className='w-4 h-4 text-amber-600' />
               <span>
                  Вернуться к текущей неделе
                  {currentWeekNumber ? ` (№${currentWeekNumber})` : ''}
               </span>
            </button>
         </div>

         {/* ═══ Карточка «Заключение недели» (Итоги учета) ═══ */}
         <div className='bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6'>
            <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100'>
               <div>
                  <div className='flex items-center gap-2'>
                     <span className='px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider'>
                        Заключение недели
                     </span>
                     <h2 className='text-xl sm:text-2xl font-black text-slate-900 tracking-tight'>
                        Итоги производственного плана
                     </h2>
                  </div>
                  <p className='text-xs sm:text-sm text-slate-500 mt-1'>
                     Фиксация результатов понедельничного учета по позициям
                     недели №{week.weekNumber}.
                  </p>
               </div>

               {/* Штамп аудита закрытия недели */}
               {closeAuditLog && (
                  <div className='flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600'>
                     <div className='w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0'>
                        <UserCheck className='w-4 h-4' />
                     </div>
                     <div>
                        <div className='font-bold text-slate-800'>
                           {closeAuditLog.userName}{' '}
                           <span className='font-normal text-slate-500'>
                              ({closeAuditLog.userRole || 'Сотрудник'})
                           </span>
                        </div>
                        <div className='text-[11px] text-slate-400'>
                           Учет завершен{' '}
                           {formatDateTime(closeAuditLog.createdAt)}
                        </div>
                     </div>
                  </div>
               )}
            </div>

            {/* ═══ Плитки статистики итогов ═══ */}
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mt-5'>
               {/* Плитка 1: Процент выполнения */}
               <div className='rounded-xl p-4 bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm flex flex-col justify-between'>
                  <div className='flex items-center justify-between'>
                     <span className='text-[11px] uppercase tracking-wider font-bold text-teal-100'>
                        Выполнение плана
                     </span>
                     <Award className='w-5 h-5 text-teal-200' />
                  </div>
                  <div className='my-2'>
                     <div className='text-3xl font-black'>{percent}%</div>
                     <div className='text-xs text-teal-100 mt-0.5'>
                        {stats.completed} из {stats.totalPlanned} выполнено
                     </div>
                  </div>
                  <div className='w-full bg-white/20 h-1.5 rounded-full overflow-hidden'>
                     <div
                        className='bg-white h-full rounded-full transition-all duration-500'
                        style={{ width: `${percent}%` }}
                     ></div>
                  </div>
               </div>

               {/* Плитка 2: Готово */}
               <div
                  onClick={() =>
                     onFilterChange(
                        currentFilter === 'result_completed'
                           ? 'all'
                           : 'result_completed'
                     )
                  }
                  className={`cursor-pointer rounded-xl p-4 border transition shadow-2xs flex flex-col justify-between ${
                     currentFilter === 'result_completed'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 hover:border-emerald-300'
                  }`}
               >
                  <div className='flex items-center justify-between'>
                     <span className='text-[11px] uppercase tracking-wider font-bold text-emerald-700'>
                        Готово
                     </span>
                     <div className='w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center'>
                        <CheckCircle2 className='w-4 h-4' />
                     </div>
                  </div>
                  <div className='mt-2'>
                     <div className='text-2xl font-black text-emerald-900'>
                        {stats.completed}
                     </div>
                     <div className='text-[11px] text-emerald-700 font-medium'>
                        позиций произведено
                     </div>
                  </div>
                  <div className='text-[10px] text-emerald-600 mt-1 font-semibold'>
                     {currentFilter === 'result_completed'
                        ? 'Фильтр активен'
                        : 'Показать позиции →'}
                  </div>
               </div>

               {/* Плитка 3: Забыли */}
               <div
                  onClick={() =>
                     onFilterChange(
                        currentFilter === 'result_forgotten'
                           ? 'all'
                           : 'result_forgotten'
                     )
                  }
                  className={`cursor-pointer rounded-xl p-4 border transition shadow-2xs flex flex-col justify-between ${
                     currentFilter === 'result_forgotten'
                        ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                        : 'bg-white border-slate-200 hover:border-amber-300'
                  }`}
               >
                  <div className='flex items-center justify-between'>
                     <span className='text-[11px] uppercase tracking-wider font-bold text-amber-700'>
                        Забыли
                     </span>
                     <div className='w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center'>
                        <AlertTriangle className='w-4 h-4' />
                     </div>
                  </div>
                  <div className='mt-2'>
                     <div className='text-2xl font-black text-amber-900'>
                        {stats.forgotten}
                     </div>
                     <div className='text-[11px] text-amber-700 font-medium'>
                        не запустили в цех
                     </div>
                  </div>
                  <div className='text-[10px] text-amber-600 mt-1 font-semibold'>
                     {currentFilter === 'result_forgotten'
                        ? 'Фильтр активен'
                        : 'Показать позиции →'}
                  </div>
               </div>

               {/* Плитка 4: Не хватило сырья */}
               <div
                  onClick={() =>
                     onFilterChange(
                        currentFilter === 'result_no_raw'
                           ? 'all'
                           : 'result_no_raw'
                     )
                  }
                  className={`cursor-pointer rounded-xl p-4 border transition shadow-2xs flex flex-col justify-between ${
                     currentFilter === 'result_no_raw'
                        ? 'bg-red-50 border-red-500 ring-2 ring-red-500/20'
                        : 'bg-white border-slate-200 hover:border-red-300'
                  }`}
               >
                  <div className='flex items-center justify-between'>
                     <span className='text-[11px] uppercase tracking-wider font-bold text-red-700'>
                        Не хватило сырья
                     </span>
                     <div className='w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center'>
                        <XCircle className='w-4 h-4' />
                     </div>
                  </div>
                  <div className='mt-2'>
                     <div className='text-2xl font-black text-red-900'>
                        {stats.noRaw}
                     </div>
                     <div className='text-[11px] text-red-700 font-medium'>
                        дефицит сырья
                     </div>
                  </div>
                  <div className='text-[10px] text-red-600 mt-1 font-semibold'>
                     {currentFilter === 'result_no_raw'
                        ? 'Фильтр активен'
                        : 'Показать позиции →'}
                  </div>
               </div>

               {/* Плитка 5: Другое */}
               <div
                  onClick={() =>
                     onFilterChange(
                        currentFilter === 'result_other'
                           ? 'all'
                           : 'result_other'
                     )
                  }
                  className={`cursor-pointer rounded-xl p-4 border transition shadow-2xs flex flex-col justify-between ${
                     currentFilter === 'result_other'
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:border-blue-300'
                  }`}
               >
                  <div className='flex items-center justify-between'>
                     <span className='text-[11px] uppercase tracking-wider font-bold text-blue-700'>
                        Другая причина
                     </span>
                     <div className='w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center'>
                        <HelpCircle className='w-4 h-4' />
                     </div>
                  </div>
                  <div className='mt-2'>
                     <div className='text-2xl font-black text-blue-900'>
                        {stats.other}
                     </div>
                     <div className='text-[11px] text-blue-700 font-medium'>
                        с комментариями
                     </div>
                  </div>
                  <div className='text-[10px] text-blue-600 mt-1 font-semibold'>
                     {currentFilter === 'result_other'
                        ? 'Фильтр активен'
                        : 'Показать позиции →'}
                  </div>
               </div>
            </div>

            {/* Статус и история изменений архива */}
            <div className='mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs'>
               <div className='flex items-center gap-2'>
                  {canEditArchive ? (
                     <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-bold text-xs'>
                        <span className='w-2 h-2 rounded-full bg-teal-500 animate-pulse'></span>
                        <span>Редактирование чеклиста разрешено</span>
                     </span>
                  ) : (
                     <span className='inline-flex items-center gap-1.5 text-slate-400 font-medium'>
                        <Lock className='w-3.5 h-3.5 text-slate-400' />
                        <span>Архив защищен от редактирования</span>
                     </span>
                  )}
                  <span className='text-slate-400 hidden sm:inline'>
                     • Все правки фиксируются в журнале аудита
                  </span>
               </div>

               <button
                  type='button'
                  onClick={() => setIsLogsModalOpen(true)}
                  className='inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition shadow-2xs cursor-pointer border border-slate-200/60'
               >
                  <History className='w-3.5 h-3.5 text-slate-500' />
                  <span>
                     Журнал изменений недели
                     {auditLogs && auditLogs.length > 0
                        ? ` (${auditLogs.length})`
                        : ''}
                  </span>
               </button>
            </div>
         </div>

         {/* Модалка журнала изменений недели */}
         <WeekAuditLogsModal
            isOpen={isLogsModalOpen}
            onClose={() => setIsLogsModalOpen(false)}
            weekId={week.id}
            weekNumber={week.weekNumber}
            year={week.year}
            initialLogs={auditLogs}
         />
      </div>
   )
}
