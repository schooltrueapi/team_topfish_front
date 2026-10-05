'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import Navbar from '@/components/Navbar'
import AttentionBanner from '@/components/AttentionBanner'
import WeekConclusionBanner from '@/components/WeekConclusionBanner'
import Checklist, { PlanItem } from '@/components/Checklist'
import ReviewModal from '@/components/ReviewModal'
import AuditLogsDrawer from '@/components/AuditLogsDrawer'
import RolesModal from '@/components/RolesModal'
import UploadModal from '@/components/UploadModal'
import UploadDiffModal, { UploadDiffData } from '@/components/UploadDiffModal'
import WeekHistoryModal, {
   WeekHistoryItem,
} from '@/components/WeekHistoryModal'
import PlanSnapshotPanel from '@/components/PlanSnapshotPanel'
import TrialNoveltiesTab from '@/components/TrialNoveltiesTab'
import ClientsCallingTab from '@/components/ClientsCallingTab'
import FinancialAnalysisTab from '@/components/FinancialAnalysisTab'
import TechCardsTab from '@/components/TechCardsTab'
import {
   RotateCcw,
   FlaskConical,
   ClipboardList,
   ArrowRight,
   PhoneCall,
   Wallet,
   ChefHat,
} from 'lucide-react'

export default function DashboardPage() {
   const router = useRouter()
   const { user, loading, hasPermission } = useAuth()

   const [currentWeek, setCurrentWeek] = useState<any>(null)
   const [items, setItems] = useState<PlanItem[]>([])
   const [needsReview, setNeedsReview] = useState(false)
   const [reviewWeek, setReviewWeek] = useState<any>(null)
   const [isReviewDismissed, setIsReviewDismissed] = useState(false)
   const [currentFilter, setCurrentFilter] = useState('all')

   // Главные вкладки страницы: Основной план vs Вторые новинки vs База обзвона vs Анализ финансов vs Тех. карты
   const [activeTab, setActiveTab] = useState<
      'main_plan' | 'trial_novelties' | 'clients' | 'finance' | 'tech_cards'
   >('main_plan')
   const [clientsCount, setClientsCount] = useState<number>(0)
   const [trialStats, setTrialStats] = useState({
      total: 0,
      inTrial: 0,
      ideas: 0,
   })

   // Архив производственных недель
   const [weeksHistory, setWeeksHistory] = useState<WeekHistoryItem[]>([])
   const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null)
   const [selectedWeekData, setSelectedWeekData] = useState<any | null>(null)
   const [isHistoryOpen, setIsHistoryOpen] = useState(false)

   // Модальные окна
   const [isUploadOpen, setIsUploadOpen] = useState(false)
   const [isLogsOpen, setIsLogsOpen] = useState(false)
   const [isRolesOpen, setIsRolesOpen] = useState(false)
   const [isDiffOpen, setIsDiffOpen] = useState(false)
   const [uploadDiffData, setUploadDiffData] = useState<UploadDiffData | null>(
      null
   )
   const [isRevertConfirmOpen, setIsRevertConfirmOpen] = useState(false)
   const [isReverting, setIsReverting] = useState(false)

   const [isInitialLoading, setIsInitialLoading] = useState(true)
   const [autoSyncPrice, setAutoSyncPrice] = useState<boolean>(true)
   const [snapshotRefreshKey, setSnapshotRefreshKey] = useState(0)

   // Редирект на логин, если не авторизован
   useEffect(() => {
      if (!loading && !user) {
         window.location.replace('/login')
      }
   }, [user, loading])

   // Загрузка настроек системы (авто-синхронизация с Прайсом)
   useEffect(() => {
      if (!user) return
      try {
         const local = localStorage.getItem('topfish_auto_sync_price')
         if (local !== null) {
            setAutoSyncPrice(local === 'true')
         }
      } catch (e) {}

      api.get('/api/plan/settings')
         .then((res) => {
            if (typeof res.data?.autoSyncPrice === 'boolean') {
               setAutoSyncPrice(res.data.autoSyncPrice)
               try {
                  localStorage.setItem(
                     'topfish_auto_sync_price',
                     String(res.data.autoSyncPrice)
                  )
               } catch (e) {}
            }
         })
         .catch((err) => {
            console.warn('Failed to load plan settings:', err)
         })
   }, [user])

   const handleToggleAutoSync = async (nextVal?: boolean) => {
      const val = nextVal !== undefined ? nextVal : !autoSyncPrice
      setAutoSyncPrice(val)
      try {
         localStorage.setItem('topfish_auto_sync_price', String(val))
         await api.put('/api/plan/settings', { autoSyncPrice: val })
         toast.success(
            val
               ? 'Авто-синхронизация с Прайсом ВКЛЮЧЕНА (сработает при загрузке 1С)'
               : 'Авто-синхронизация ВЫКЛЮЧЕНА (синхронизация теперь только по кнопке)'
         )
      } catch (e) {
         toast.error('Не удалось сохранить настройку на сервере')
      }
   }

   // Загрузка списка недель (история)
   const fetchWeeksHistory = async () => {
      try {
         const res = await api.get('/api/weeks/history')
         setWeeksHistory(res.data || [])
      } catch (e) {
         console.warn('Failed to load weeks history:', e)
      }
   }

   // Загрузка статистики вторых новинок
   const fetchTrialStats = async () => {
      try {
         const res = await api.get('/api/trial-novelties')
         const loaded = res.data?.items || []
         setTrialStats({
            total: loaded.length,
            inTrial: loaded.filter((i: any) => i.status === 'IN_TRIAL').length,
            ideas: loaded.filter((i: any) => i.status === 'IDEA').length,
         })
      } catch (e) {
         console.warn('Failed to load trial stats:', e)
      }
   }

   // Загрузка данных текущей недели (isBackground: без мерцания экрана)
   const fetchCurrentWeek = async (isBackground = false) => {
      try {
         if (!isBackground) {
            setIsInitialLoading(true)
         }
         const res = await api.get('/api/weeks/current')
         fetchWeeksHistory()
         fetchTrialStats()
         if (res.data.needsReview) {
            setNeedsReview(true)
            setReviewWeek(res.data.reviewWeek)
         } else {
            setNeedsReview(false)
            setReviewWeek(null)
         }

         if (res.data.currentWeek) {
            setCurrentWeek(res.data.currentWeek)

            // Если сейчас просматривается текущая неделя, обновляем её позиции
            if (
               !selectedWeekId ||
               selectedWeekId === res.data.currentWeek?.id
            ) {
               const regularItems: PlanItem[] =
                  res.data.currentWeek?.items || []

               // Загружаем новинки в отработке на эту неделю, чтобы отобразить их прямо в основном плане чеклиста
               let inTrialItems: PlanItem[] = []
               try {
                  const trialRes = await api.get('/api/trial-novelties', {
                     params: {
                        status: 'IN_TRIAL',
                        weekId: res.data.currentWeek?.id,
                     },
                  })
                  const trialNovelties = trialRes.data?.items || []
                  inTrialItems = trialNovelties.map((tn: any) => ({
                     id: `trial_${tn.id}`,
                     trialNoveltyId: tn.id,
                     isTrialNovelty: true,
                     productName: tn.name,
                     category: tn.category || 'Новинки (отработка)',
                     price: null,
                     stockKg: null,
                     isNew: true,
                     isPlanned: true,
                     imageUrl: tn.imageUrl,
                     resultStatus: tn.resultStatus,
                     reasonComment: tn.resultComment,
                     createdBy: tn.createdBy,
                     createdAt: tn.plannedAt || tn.createdAt,
                     updatedAt: tn.updatedAt,
                  }))
               } catch (e) {}

               const newItems: PlanItem[] = [...inTrialItems, ...regularItems]
               if (isBackground) {
                  setItems((prev) => {
                     if (prev.length !== newItems.length) {
                        setSnapshotRefreshKey((k) => k + 1)
                        return newItems
                     }
                     const hasDiff = prev.some((p, idx) => {
                        const n = newItems[idx]
                        return (
                           !n ||
                           p.id !== n.id ||
                           p.isPlanned !== n.isPlanned ||
                           p.updatedAt !== n.updatedAt ||
                           p.resultStatus !== n.resultStatus
                        )
                     })
                     if (hasDiff) {
                        setSnapshotRefreshKey((k) => k + 1)
                        return newItems
                     }
                     return prev
                  })
               } else {
                  setItems(newItems)
               }
            }

            if (res.data.currentWeek?.id) {
               // 1. Приоритет: отчет из базы данных (доступен с любого браузера и устройства)
               if (res.data.currentWeek.uploadReport) {
                  const serverReport = res.data.currentWeek.uploadReport
                  if (!serverReport.uploadedAt) {
                     serverReport.uploadedAt =
                        res.data.currentWeek.excelFileUploadedAt ||
                        res.data.currentWeek.lastUploadedAt ||
                        res.data.currentWeek.updatedAt
                  }
                  setUploadDiffData(serverReport)
                  try {
                     localStorage.setItem(
                        `topfish_diff_${res.data.currentWeek.id}`,
                        JSON.stringify(serverReport)
                     )
                  } catch (e) {}
               } else {
                  // 2. Резерв: локальный кэш браузера или базовый отчет по загруженному файлу
                  try {
                     const cachedDiff = localStorage.getItem(
                        `topfish_diff_${res.data.currentWeek.id}`
                     )
                     if (cachedDiff) {
                        const parsed = JSON.parse(cachedDiff)
                        if (!parsed.uploadedAt) {
                           parsed.uploadedAt =
                              res.data.currentWeek.excelFileUploadedAt ||
                              res.data.currentWeek.lastUploadedAt ||
                              res.data.currentWeek.updatedAt
                        }
                        setUploadDiffData(parsed)
                     } else if (res.data.currentWeek.excelFileName) {
                        const fallbackReport: UploadDiffData = {
                           fileName: res.data.currentWeek.excelFileName,
                           uploadedAt:
                              res.data.currentWeek.excelFileUploadedAt ||
                              res.data.currentWeek.lastUploadedAt ||
                              res.data.currentWeek.updatedAt,
                           stats: {
                              total: res.data.currentWeek.items?.length || 0,
                              created: res.data.currentWeek.items?.length || 0,
                              updated: 0,
                              novelties:
                                 res.data.currentWeek.items?.filter(
                                    (i: any) => i.isNew
                                 ).length || 0,
                              outOfStock:
                                 res.data.currentWeek.items?.filter(
                                    (i: any) => (i.stockKg ?? 0) === 0
                                 ).length || 0,
                           },
                           changes: {
                              hits: [],
                              novelties:
                                 res.data.currentWeek.items
                                    ?.filter((i: any) => i.isNew)
                                    .map((i: any) => ({
                                       name: i.productName,
                                       category: i.category,
                                       price: i.price,
                                       stockKg: i.stockKg,
                                    })) || [],
                              outOfStock:
                                 res.data.currentWeek.items
                                    ?.filter((i: any) => (i.stockKg ?? 0) === 0)
                                    .map((i: any) => ({
                                       name: i.productName,
                                       category: i.category,
                                       newStock: 0,
                                    })) || [],
                              backInStock: [],
                              priceChanges: [],
                              stockChanges: [],
                              addedToWeek: [],
                           },
                        }
                        setUploadDiffData(fallbackReport)
                     } else {
                        setUploadDiffData(null)
                     }
                  } catch (e) {}
               }
            }
         }
      } catch (err: any) {
         toast.error(err.response?.data?.error || 'Ошибка загрузки недели')
      } finally {
         setIsInitialLoading(false)
      }
   }

   useEffect(() => {
      if (user) {
         fetchCurrentWeek()
      }
   }, [user])

   const displayWeek = selectedWeekData?.week || currentWeek
   const isViewingArchive =
      Boolean(
         selectedWeekId && currentWeek && selectedWeekId !== currentWeek.id
      ) || displayWeek?.status === 'CLOSED'

   // Периодическая фоновая синхронизация данных (каждые 5 сек), чтобы изменения от других пользователей
   // (например, Технолога на другом компьютере) сразу появлялись на экране без перезагрузки
   useEffect(() => {
      if (!user || isViewingArchive) return

      const interval = setInterval(() => {
         if (
            typeof document !== 'undefined' &&
            document.visibilityState === 'visible'
         ) {
            fetchCurrentWeek(true)
         }
      }, 5000)

      const handleFocusOrVisible = () => {
         if (
            typeof document !== 'undefined' &&
            document.visibilityState === 'visible'
         ) {
            fetchCurrentWeek(true)
         }
      }

      window.addEventListener('focus', handleFocusOrVisible)
      document.addEventListener('visibilitychange', handleFocusOrVisible)

      return () => {
         clearInterval(interval)
         window.removeEventListener('focus', handleFocusOrVisible)
         document.removeEventListener('visibilitychange', handleFocusOrVisible)
      }
   }, [user, isViewingArchive, selectedWeekId])

   // Переключение выбранной недели (просмотр архива или текущей)
   const handleSelectWeek = async (weekId: string) => {
      if (!currentWeek) return

      if (weekId === currentWeek.id) {
         setSelectedWeekId(null)
         setSelectedWeekData(null)
         setItems(currentWeek.items || [])
         setCurrentFilter('all')
         if (currentWeek.uploadReport) {
            setUploadDiffData(currentWeek.uploadReport)
         }
         return
      }

      try {
         setIsInitialLoading(true)
         setSelectedWeekId(weekId)
         const res = await api.get(`/api/weeks/${weekId}`)
         setSelectedWeekData(res.data)
         setItems(res.data.items || [])
         setCurrentFilter('planned') // По умолчанию открываем план недели
         if (res.data.week?.uploadReport) {
            setUploadDiffData(res.data.week.uploadReport)
         } else {
            try {
               const cached = localStorage.getItem(`topfish_diff_${weekId}`)
               setUploadDiffData(cached ? JSON.parse(cached) : null)
            } catch (e) {
               setUploadDiffData(null)
            }
         }
      } catch (err: any) {
         toast.error(
            err.response?.data?.error ||
               'Ошибка загрузки данных архивной недели'
         )
      } finally {
         setIsInitialLoading(false)
      }
   }

   if (loading || !user) {
      return (
         <div className='min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-300 gap-4 p-4'>
            <div className='w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin'></div>
            <p className='text-base font-semibold text-teal-400'>
               Проверка авторизации...
            </p>
            <a
               href='/login'
               className='mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 text-xs font-medium transition'
            >
               Перейти на страницу входа &rarr;
            </a>
         </div>
      )
   }

   // Обновление одного пункта в локальном стейте
   const handleItemUpdated = (updatedItem: PlanItem) => {
      let nextItems: PlanItem[] = []
      setItems((prev) => {
         nextItems = prev.map((i) => {
            if (i.id !== updatedItem.id) return i
            return {
               ...i,
               ...updatedItem,
               smartMeta:
                  updatedItem.smartMeta !== undefined
                     ? updatedItem.smartMeta
                     : i.smartMeta,
               salesPercent:
                  updatedItem.salesPercent !== undefined
                     ? updatedItem.salesPercent
                     : i.salesPercent,
               salesHistoryWeeks:
                  updatedItem.salesHistoryWeeks !== undefined
                     ? updatedItem.salesHistoryWeeks
                     : i.salesHistoryWeeks,
               rawAbcCategory: updatedItem.rawAbcCategory ?? i.rawAbcCategory,
               rawIsHit: updatedItem.rawIsHit ?? i.rawIsHit,
            }
         })
         return nextItems
      })

      // Если мы просматриваем закрытую архивную неделю, пересчитываем статистику и обновляем логи
      if (isViewingArchive && selectedWeekId) {
         const planned = nextItems.filter((i) => i.isPlanned)
         const totalPlanned = planned.length
         const completed = planned.filter(
            (i) => i.resultStatus === 'COMPLETED'
         ).length
         const forgotten = planned.filter(
            (i) => i.resultStatus === 'FORGOTTEN'
         ).length
         const noRaw = planned.filter(
            (i) => i.resultStatus === 'NO_RAW_MATERIAL'
         ).length
         const other = planned.filter((i) => i.resultStatus === 'OTHER').length
         const percentCompleted =
            totalPlanned > 0 ? Math.round((completed / totalPlanned) * 100) : 0

         setSelectedWeekData((prev: any) => {
            if (!prev) return prev
            return {
               ...prev,
               stats: {
                  ...prev.stats,
                  totalPlanned,
                  completed,
                  forgotten,
                  noRaw,
                  other,
                  percentCompleted,
               },
            }
         })

         setWeeksHistory((prev) =>
            prev.map((w) => {
               if (w.id !== selectedWeekId) return w
               return {
                  ...w,
                  totalPlanned,
                  completed,
                  forgotten,
                  noRaw,
                  other,
                  percentCompleted,
               }
            })
         )

         // Фоновое обновление логов архива
         api.get(`/api/weeks/${selectedWeekId}/logs`)
            .then((res) => {
               setSelectedWeekData((prev: any) =>
                  prev ? { ...prev, auditLogs: res.data } : prev
               )
            })
            .catch(() => {})
      }

      // Обновляем панель "План vs Факт" при каждом изменении галочки
      setSnapshotRefreshKey((k) => k + 1)
   }

   // Удаление товара из локального стейта
   const handleItemDeleted = (deletedId: string) => {
      setItems((prev) => prev.filter((i) => i.id !== deletedId))
      setSnapshotRefreshKey((k) => k + 1)
   }

   const handleReviewConfirmed = () => {
      setNeedsReview(false)
      setReviewWeek(null)
      setIsReviewDismissed(false)
      fetchCurrentWeek()
   }

   const handleCloseReview = () => {
      setIsReviewDismissed(true)
   }

   const activeItems = items.filter((i) => !i.isDeleted)
   const plannedCount = activeItems.filter((i) => i.isPlanned).length
   const noveltiesCount = activeItems.filter((i) => i.isNew).length
   const outOfStockCount = activeItems.filter(
      (i) => (i.stockKg ?? 0) === 0
   ).length
   const hitsCount = activeItems.filter(
      (i) => i.smartMeta?.tag === 'HIT_REPEAT'
   ).length
   const isConfirmedWeek =
      displayWeek?.status && displayWeek.status !== 'PLANNING'
   const longTimeCount = activeItems.filter(
      (i) =>
         i.smartMeta?.tag === 'LONG_TIME_NO_PLAN' &&
         !(isConfirmedWeek && i.isPlanned)
   ).length
   const unfinishedCount = activeItems.filter(
      (i) => i.smartMeta?.tag === 'LAST_WEEK_UNFINISHED'
   ).length

   const canEditArchive =
      isViewingArchive &&
      (hasPermission('TOGGLE_PLAN') || hasPermission('FULL_ACCESS'))

   return (
      <div className='min-h-screen bg-slate-100/60 pb-16'>
         {/* Навигация */}
         <Navbar
            currentWeek={currentWeek}
            viewingWeek={displayWeek}
            weeksHistory={weeksHistory}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenLogs={() => setIsLogsOpen(true)}
            onOpenRoles={() => setIsRolesOpen(true)}
            onOpenDiff={() => setIsDiffOpen(true)}
            hasDiff={Boolean(uploadDiffData)}
            onOpenHistory={() => setIsHistoryOpen(true)}
            onSelectWeek={handleSelectWeek}
            onReturnToCurrent={() => handleSelectWeek(currentWeek.id)}
            onRevertUpload={() => setIsRevertConfirmOpen(true)}
         />

         <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6'>
            {/* Напоминание о необходимости подвести итоги недели, если модалка была закрыта */}
            {needsReview && reviewWeek && isReviewDismissed && (
               <div className='mb-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                  <div className='flex items-center gap-3'>
                     <div className='w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs'>
                        ⚠️
                     </div>
                     <div>
                        <div className='font-bold text-amber-950 text-sm flex items-center gap-2'>
                           <span>Итоги недели №{reviewWeek.weekNumber} ({reviewWeek.year}) не подведены</span>
                           <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900'>
                              Чеклист отложен
                           </span>
                        </div>
                        <p className='text-amber-800 text-xs mt-0.5'>
                           Вы можете продолжить работу с планом, но перед началом полноценного цикла контроля рекомендуется зафиксировать результаты прошлой недели.
                        </p>
                     </div>
                  </div>
                  <button
                     type='button'
                     onClick={() => setIsReviewDismissed(false)}
                     className='px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer'
                  >
                     <span>Заполнить итоги недели</span>
                     <ArrowRight className='w-4 h-4' />
                  </button>
               </div>
            )}

            {/* Главный переключатель вкладок: Основной план производства vs Вторые новинки (Отработка) */}
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs'>
               <div className='flex items-center gap-1.5 flex-wrap'>
                  <button
                     type='button'
                     onClick={() => setActiveTab('main_plan')}
                     className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'main_plan'
                           ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10 ring-1 ring-slate-800'
                           : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                     }`}
                  >
                     <ClipboardList className='w-4 h-4 text-teal-400' />
                     <span>Основной план производства</span>
                     <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                           activeTab === 'main_plan'
                              ? 'bg-slate-800 text-teal-300'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                     >
                        {plannedCount} поз.
                     </span>
                  </button>

                  <button
                     type='button'
                     onClick={() => setActiveTab('trial_novelties')}
                     className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'trial_novelties'
                           ? 'bg-gradient-to-r from-teal-600 to-indigo-600 text-white shadow-md shadow-teal-600/20'
                           : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                     }`}
                  >
                     <FlaskConical className='w-4 h-4 text-teal-300' />
                     <span>Вторые новинки (Отработка)</span>
                     {trialStats.inTrial > 0 ? (
                        <span className='px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-xs animate-pulse'>
                           🔥 {trialStats.inTrial} в плане
                        </span>
                     ) : trialStats.total > 0 ? (
                        <span
                           className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              activeTab === 'trial_novelties'
                                 ? 'bg-teal-500/30 text-teal-100'
                                 : 'bg-teal-50 text-teal-700'
                           }`}
                        >
                           {trialStats.total}
                        </span>
                     ) : null}
                  </button>

                  {hasPermission('MANAGE_CLIENTS') && (
                     <button
                        type='button'
                        onClick={() => setActiveTab('clients')}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                           activeTab === 'clients'
                              ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-600/20'
                              : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                     >
                        <PhoneCall className='w-4 h-4 text-emerald-300' />
                        <span>База обзвона (Клиенты)</span>
                        {clientsCount > 0 && (
                           <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                 activeTab === 'clients'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-emerald-50 text-emerald-700'
                              }`}
                           >
                              {clientsCount}
                           </span>
                        )}
                     </button>
                  )}

                  {hasPermission('FULL_ACCESS') && (
                     <button
                        type='button'
                        onClick={() => setActiveTab('finance')}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                           activeTab === 'finance'
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/25 ring-1 ring-emerald-500/50'
                              : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                     >
                        <Wallet className='w-4 h-4 text-emerald-300' />
                        <span>Анализ финансов</span>
                        <span
                           className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              activeTab === 'finance'
                                 ? 'bg-white/20 text-white'
                                 : 'bg-emerald-50 text-emerald-700'
                           }`}
                        >
                           Склад ₽
                        </span>
                     </button>
                  )}

                  {/* Вкладка «Тех. карты & Производство» */}
                  <button
                     type='button'
                     onClick={() => setActiveTab('tech_cards')}
                     className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'tech_cards'
                           ? 'bg-gradient-to-r from-teal-700 via-slate-900 to-indigo-950 text-white shadow-md shadow-slate-900/25 ring-1 ring-teal-500/50'
                           : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                     }`}
                  >
                     <ChefHat className='w-4 h-4 text-teal-300' />
                     <span>Тех. карты</span>
                     <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                           activeTab === 'tech_cards'
                              ? 'bg-white/20 text-white'
                              : 'bg-teal-50 text-teal-700'
                        }`}
                     >
                        Цех
                     </span>
                  </button>
               </div>

               {/* Быстрая подсказка / статус */}
               <div className='text-right text-[11px] text-slate-400 font-medium px-2 hidden sm:block'>
                  {activeTab === 'main_plan'
                     ? 'Чеклист 1С • Остатки и распределение'
                     : activeTab === 'trial_novelties'
                       ? 'Внутренний банк идей • Не попадает в прайс клиентов'
                       : activeTab === 'finance'
                         ? 'Финансовая оценка складских остатков • Оптовый прайс'
                         : activeTab === 'tech_cards'
                           ? 'Технологические карты • Справочник ингредиентов, нормы и контроль цеха'
                           : 'База клиентов и контрагентов • Обзвон и контакты'}
               </div>
            </div>

            {/* Контент активной вкладки */}
            {activeTab === 'finance' && hasPermission('FULL_ACCESS') ? (
               <FinancialAnalysisTab currentWeek={displayWeek} />
            ) : activeTab === 'clients' && hasPermission('MANAGE_CLIENTS') ? (
               <ClientsCallingTab onCountChange={setClientsCount} />
            ) : activeTab === 'trial_novelties' ? (
               <TrialNoveltiesTab
                  currentWeek={displayWeek}
                  onStatsChange={setTrialStats}
                  onPlanChanged={() => fetchCurrentWeek(true)}
               />
            ) : activeTab === 'tech_cards' ? (
               <TechCardsTab />
            ) : (
               <>
                  {/* Информационный баннер в основном плане, если есть новинки в отработке */}
                  {trialStats.inTrial > 0 && !isViewingArchive && (
                     <div
                        onClick={() => setActiveTab('trial_novelties')}
                        className='mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-300/80 shadow-xs flex items-center justify-between gap-3 cursor-pointer hover:border-amber-400 hover:shadow-md transition'
                     >
                        <div className='flex items-center gap-2.5'>
                           <div className='w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs'>
                              <FlaskConical className='w-4 h-4' />
                           </div>
                           <div>
                              <span className='font-extrabold text-amber-950 text-xs sm:text-sm block'>
                                 На этой неделе в отработке {trialStats.inTrial}{' '}
                                 экспериментальных новинок на пробу!
                              </span>
                              <span className='text-amber-800/80 text-[11px] block'>
                                 Они хранятся отдельно, не меняют складские
                                 остатки 1С и не уходят клиентам в прайс.
                              </span>
                           </div>
                        </div>
                        <button
                           type='button'
                           className='px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition flex items-center gap-1 shadow-2xs cursor-pointer'
                        >
                           <span>Открыть новинки</span>
                           <ArrowRight className='w-3.5 h-3.5' />
                        </button>
                     </div>
                  )}

                  {/* Если просматриваем архивную закрытую неделю — выводим заключение недели */}
                  {isViewingArchive && selectedWeekData?.stats ? (
                     <WeekConclusionBanner
                        week={displayWeek}
                        stats={selectedWeekData.stats}
                        closeAuditLog={selectedWeekData.closeAuditLog}
                        auditLogs={selectedWeekData.auditLogs || []}
                        canEditArchive={canEditArchive}
                        currentFilter={currentFilter}
                        onFilterChange={setCurrentFilter}
                        onReturnToCurrent={() =>
                           handleSelectWeek(currentWeek.id)
                        }
                        currentWeekNumber={currentWeek?.weekNumber}
                     />
                  ) : (
                     /* Обычные карточки внимания и быстрые фильтры для рабочей недели */
                     <AttentionBanner
                        totalItems={activeItems.length}
                        plannedCount={plannedCount}
                        noveltiesCount={noveltiesCount}
                        outOfStockCount={outOfStockCount}
                        hitsCount={hitsCount}
                        longTimeCount={longTimeCount}
                        unfinishedCount={unfinishedCount}
                        currentFilter={currentFilter}
                        onFilterChange={setCurrentFilter}
                     />
                  )}

                  {/* Панель "План vs Факт" — показываем только для текущей рабочей недели после утверждения плана */}
                  {!isViewingArchive &&
                     !isInitialLoading &&
                     displayWeek?.id && (
                        <div className='mt-4'>
                           <PlanSnapshotPanel
                              weekId={displayWeek.id}
                              weekStatus={displayWeek.status || 'PLANNING'}
                              isArchive={false}
                              refreshTrigger={snapshotRefreshKey}
                              currentItems={activeItems}
                           />
                        </div>
                     )}

                  {/* Чеклист */}
                  {isInitialLoading ? (
                     <div className='p-12 text-center text-slate-400 text-sm'>
                        Загрузка производственного плана...
                     </div>
                  ) : (
                     <Checklist
                        weekId={displayWeek?.id || ''}
                        weekStatus={displayWeek?.status || 'PLANNING'}
                        weekNumber={displayWeek?.weekNumber || 1}
                        items={items}
                        currentFilter={currentFilter}
                        autoSyncPrice={autoSyncPrice}
                        isArchive={isViewingArchive}
                        onToggleAutoSync={() => handleToggleAutoSync()}
                        onFilterChange={setCurrentFilter}
                        onItemUpdated={handleItemUpdated}
                        onItemDeleted={handleItemDeleted}
                        onBulkUpdated={() => {
                           fetchCurrentWeek()
                           setSnapshotRefreshKey((k) => k + 1)
                        }}
                        onPlanConfirmed={() => {
                           fetchCurrentWeek()
                           setSnapshotRefreshKey((k) => k + 1)
                        }}
                        onOpenUpload={() => setIsUploadOpen(true)}
                     />
                  )}
               </>
            )}
         </main>

         {/* Окно подведения итогов по понедельникам */}
         {needsReview && reviewWeek && !isReviewDismissed && (
            <ReviewModal
               reviewWeek={reviewWeek}
               onReviewConfirmed={handleReviewConfirmed}
               onClose={handleCloseReview}
            />
         )}

         {/* Модалка загрузки файла 1С */}
         {isUploadOpen && currentWeek && (
            <UploadModal
               isOpen={isUploadOpen}
               onClose={() => setIsUploadOpen(false)}
               weekId={currentWeek.id}
               autoSyncPrice={autoSyncPrice}
               onAutoSyncChange={(val) => handleToggleAutoSync(val)}
               onSuccess={(newItems, uploadResult) => {
                  setItems(newItems)
                  fetchCurrentWeek()
                  if (
                     uploadResult &&
                     (uploadResult.changes || uploadResult.syncResult)
                  ) {
                     setUploadDiffData(uploadResult)
                     setIsDiffOpen(true)
                     try {
                        localStorage.setItem(
                           `topfish_diff_${currentWeek.id}`,
                           JSON.stringify(uploadResult)
                        )
                     } catch (e) {}
                  }
               }}
            />
         )}

         {/* Модалка сводки изменений после загрузки 1С */}
         {isDiffOpen && uploadDiffData && (
            <UploadDiffModal
               isOpen={isDiffOpen}
               onClose={() => setIsDiffOpen(false)}
               data={uploadDiffData}
               uploadedAtFallback={
                  displayWeek?.lastUploadedAt || displayWeek?.updatedAt
               }
               weekId={displayWeek?.id}
               canRevert={Boolean(currentWeek?.canRevertUpload)}
               onRevertSuccess={(restoredItems) => {
                  setItems(restoredItems)
                  fetchCurrentWeek()
                  setUploadDiffData(null)
                  try {
                     localStorage.removeItem(`topfish_diff_${currentWeek.id}`)
                  } catch (e) {}
               }}
            />
         )}

         {/* Модалка подтверждения отката из Navbar */}
         {isRevertConfirmOpen && currentWeek && (
            <div className='fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4'>
               <div className='bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95'>
                  <div className='flex items-center gap-3'>
                     <div className='w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0'>
                        <RotateCcw className='w-5 h-5 text-rose-600' />
                     </div>
                     <div>
                        <h4 className='font-bold text-slate-900 text-base'>
                           Откатить загрузку файла?
                        </h4>
                        <p className='text-xs text-slate-500'>
                           Возврат к состоянию до загрузки
                        </p>
                     </div>
                  </div>
                  <p className='text-xs text-slate-600 leading-relaxed'>
                     Вы действительно хотите отменить загрузку файла{' '}
                     <strong>
                        «
                        {currentWeek.backupInfo?.appliedFileName ||
                           currentWeek.excelFileName ||
                           '1С'}
                        »
                     </strong>
                     ? Все позиции недели вернутся к прежнему состоянию (
                     {currentWeek.backupInfo?.itemsCount ?? 'прежние'} поз.), а
                     правильные остатки будут повторно синхронизированы с
                     Прайсом и Доставкой.
                  </p>
                  <div className='flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100'>
                     <button
                        type='button'
                        onClick={() => setIsRevertConfirmOpen(false)}
                        disabled={isReverting}
                        className='px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition'
                     >
                        Отмена
                     </button>
                     <button
                        type='button'
                        onClick={async () => {
                           if (!currentWeek?.id) return
                           try {
                              setIsReverting(true)
                              const res = await api.post(
                                 '/api/plan/upload/revert',
                                 { weekId: currentWeek.id }
                              )
                              toast.success(
                                 res.data.message ||
                                    'Загрузка успешно отменена!'
                              )
                              setItems(res.data.items || [])
                              fetchCurrentWeek()
                              setUploadDiffData(null)
                              setIsRevertConfirmOpen(false)
                              try {
                                 localStorage.removeItem(
                                    `topfish_diff_${currentWeek.id}`
                                 )
                              } catch (e) {}
                           } catch (err: any) {
                              toast.error(
                                 err.response?.data?.error ||
                                    'Ошибка отката загрузки'
                              )
                           } finally {
                              setIsReverting(false)
                           }
                        }}
                        disabled={isReverting}
                        className='px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-600/20 transition flex items-center gap-1.5'
                     >
                        {isReverting ? (
                           <span>Откат...</span>
                        ) : (
                           <span>Да, откатить загрузку</span>
                        )}
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Выдвижная панель логов аудита */}
         <AuditLogsDrawer
            isOpen={isLogsOpen}
            onClose={() => setIsLogsOpen(false)}
         />

         {/* Модалка управления ролями и сотрудниками */}
         <RolesModal
            isOpen={isRolesOpen}
            onClose={() => setIsRolesOpen(false)}
         />

         {/* Модалка архива производственных недель */}
         <WeekHistoryModal
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            weeks={weeksHistory}
            currentWeekId={currentWeek?.id}
            selectedWeekId={displayWeek?.id}
            onSelectWeek={handleSelectWeek}
         />
      </div>
   )
}
