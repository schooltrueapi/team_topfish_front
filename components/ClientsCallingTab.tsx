'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import {
   Phone,
   Mail,
   Plus,
   Search,
   CheckCircle2,
   AlertTriangle,
   Ban,
   Users,
   Copy,
   Check,
   Pencil,
   Trash2,
   X,
   Building2,
   MapPin,
   Filter,
   ShieldCheck,
   Clock4,
   Send,
   PhoneMissed,
   AlertCircle,
   MessageSquare,
   XCircle,
   ShoppingBag,
   Play,
   PhoneCall,
   SkipForward,
   RotateCcw,
   ChevronLeft,
   ChevronRight,
   ChevronDown,
   ChevronUp,
   Sparkles,
   Store,
   UserX,
   PhoneIncoming,
   PhoneForwarded,
   Calendar,
   Bell,
   Volume2,
   BarChart3,
   TrendingUp,
   History,
   UserCheck,
   Maximize2,
   Minimize2,
   ExternalLink,
   Clock,
   Flame,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'


function formatCallbackTime(dateStr?: string | null): string {
   if (!dateStr) return ''
   const d = new Date(dateStr)
   if (isNaN(d.getTime())) return ''
   const now = new Date()
   const isToday = d.toDateString() === now.toDateString()
   const tomorrow = new Date(now)
   tomorrow.setDate(tomorrow.getDate() + 1)
   const isTomorrow = d.toDateString() === tomorrow.toDateString()
   const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
   if (isToday) return `Сегодня, ${timeStr}`
   if (isTomorrow) return `Завтра, ${timeStr}`
   return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${timeStr}`
}

export interface Client {
   id: string
   name: string
   city: string
   phones: string[]
   emails?: string[]
   category: string
   comment?: string | null
   callbackAt?: string | null
   callbackNote?: string | null
   callbackSource?: 'CALL' | 'MEETING' | null
   lastCalledAt?: string | null
   lastCalledBy?: string | null
   createdAt: string
   updatedAt: string
}

export interface ClientStats {
   total: number
   working: number
   orderPlaced?: number
   didNotPay?: number
   skipped?: number
   onDemand?: number
   priceSent?: number
   noAnswer?: number
   wrongNumber?: number
   other?: number
   rejected?: number
   blacklist: number
   notWorking?: number
   closed?: number
   stopped?: number
   callThemselves?: number
   callback?: number
   pendingCallbacks?: number
   activeForCalling?: number
}

export interface CategoryMeta {
   label: string
   shortLabel?: string
   color: string
   activeBg: string
   badge: string
   dot: string
   icon: React.ComponentType<{ className?: string }>
   description: string
   hasNote?: boolean
   noteLabel?: string
   notePlaceholder?: string
   notePromptTitle?: string
}

// Звуковое оповещение при наступлении времени звонка
function playNotificationChime() {
   if (typeof window === 'undefined') return
   try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15) // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
   } catch (e) {
      // Audio playback might be deferred until user interaction
   }
}

export const CATEGORIES_CONFIG: Record<string, CategoryMeta> = {
   WORKING: {
      label: 'Работаем',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100',
      activeBg: 'bg-emerald-700 text-white',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-500',
      icon: CheckCircle2,
      description: 'Действующие клиенты',
   },
   ORDER_PLACED: {
      label: 'Сделала заявку',
      shortLabel: 'Заявка',
      color: 'bg-teal-50 text-teal-900 border-teal-300 hover:bg-teal-100',
      activeBg: 'bg-teal-700 text-white',
      badge: 'bg-teal-100 text-teal-900 border-teal-200',
      dot: 'bg-teal-500',
      icon: ShoppingBag,
      description: 'Оформила заявку / заказ',
   },
   CALLBACK: {
      label: 'Перезвонить',
      shortLabel: 'Перезвонить',
      color: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100',
      activeBg: 'bg-amber-600 text-white',
      badge: 'bg-amber-100 text-amber-900 border-amber-300',
      dot: 'bg-amber-500',
      icon: Clock4,
      description: 'Отложенный звонок (назначено время)',
   },
   SKIPPED: {
      label: 'Пропустила',
      shortLabel: 'Пропустила',
      color: 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200',
      activeBg: 'bg-slate-700 text-white',
      badge: 'bg-slate-100 text-slate-800 border-slate-200',
      dot: 'bg-slate-500',
      icon: SkipForward,
      description: 'Клиент пропущен оператором',
   },
   DID_NOT_PAY: {
      label: 'Не оплатила поставку',
      shortLabel: 'Не оплатила',
      color: 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100',
      activeBg: 'bg-rose-700 text-white',
      badge: 'bg-rose-100 text-rose-900 border-rose-200',
      dot: 'bg-rose-600',
      icon: AlertTriangle,
      description: 'Не оплатила прошлую поставку',
   },
   ON_DEMAND: {
      label: 'По потребности',
      color: 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100',
      activeBg: 'bg-sky-700 text-white',
      badge: 'bg-sky-100 text-sky-800 border-sky-200',
      dot: 'bg-sky-500',
      icon: Clock4,
      description: 'Берут по мере надобности',
   },
   PRICE_SENT: {
      label: 'Скинули прайс',
      color: 'bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100',
      activeBg: 'bg-indigo-700 text-white',
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      dot: 'bg-indigo-500',
      icon: Send,
      description: 'Отправлен прайс-лист',
   },
   CALL_THEMSELVES: {
      label: 'Сами звонят',
      shortLabel: 'Сами звонят',
      color: 'bg-cyan-50 text-cyan-900 border-cyan-300 hover:bg-cyan-100',
      activeBg: 'bg-cyan-700 text-white',
      badge: 'bg-cyan-100 text-cyan-900 border-cyan-200',
      dot: 'bg-cyan-500',
      icon: PhoneIncoming,
      description: 'Заказывают сами, не звонить',
   },
   NO_ANSWER: {
      label: 'Не отвечают',
      color: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
      activeBg: 'bg-amber-600 text-white',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
      dot: 'bg-amber-500',
      icon: PhoneMissed,
      description: 'Не берут трубку / сброс',
   },
   WRONG_NUMBER: {
      label: 'Неправильный номер',
      color: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200',
      activeBg: 'bg-slate-700 text-white',
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-400',
      icon: AlertCircle,
      description: 'Номер не существует / чужой',
   },
   OTHER: {
      label: 'Другое',
      color: 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100',
      activeBg: 'bg-purple-700 text-white',
      badge: 'bg-purple-100 text-purple-800 border-purple-200',
      dot: 'bg-purple-500',
      icon: MessageSquare,
      hasNote: true,
      noteLabel: 'Примечание',
      notePlaceholder: 'Впишите примечание к клиенту...',
      notePromptTitle: 'Укажите примечание',
      description: 'Особый статус с примечанием',
   },
   CLOSED: {
      label: 'Закрылись',
      shortLabel: 'Закрылись',
      color: 'bg-rose-50 text-rose-950 border-rose-300 hover:bg-rose-100',
      activeBg: 'bg-rose-800 text-white',
      badge: 'bg-rose-100 text-rose-900 border-rose-300',
      dot: 'bg-rose-700',
      icon: Store,
      description: 'Торговая точка или ИП закрылись',
   },
   STOPPED: {
      label: 'Перестали работать',
      shortLabel: 'Перестали',
      color: 'bg-zinc-100 text-zinc-800 border-zinc-300 hover:bg-zinc-200',
      activeBg: 'bg-zinc-700 text-white',
      badge: 'bg-zinc-100 text-zinc-800 border-zinc-300',
      dot: 'bg-zinc-500',
      icon: UserX,
      description: 'Отказались от сотрудничества навсегда',
   },
   REJECTED: {
      label: 'Отказали',
      color: 'bg-orange-50 text-orange-900 border-orange-300 hover:bg-orange-100',
      activeBg: 'bg-orange-600 text-white',
      badge: 'bg-orange-100 text-orange-800 border-orange-200',
      dot: 'bg-orange-500',
      icon: XCircle,
      hasNote: true,
      noteLabel: 'Причина отказа',
      notePlaceholder:
         'Укажите причину отказа (дорого, есть поставщик и т.д.)...',
      notePromptTitle: 'Укажите причину отказа',
      description: 'Отказ от сотрудничества',
   },
   BLACKLIST: {
      label: 'В ЧС',
      color: 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100',
      activeBg: 'bg-rose-700 text-white',
      badge: 'bg-rose-100 text-rose-800 border-rose-200',
      dot: 'bg-rose-500',
      icon: Ban,
      hasNote: true,
      noteLabel: 'Причина ЧС',
      notePlaceholder:
         'Укажите причину добавления в ЧС (долг, конфликт и т.д.)...',
      notePromptTitle: 'Укажите причину ЧС',
      description: 'Черный список',
   },
   // Legacy
   NOT_WORKING: {
      label: 'Не работаем',
      color: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200',
      activeBg: 'bg-slate-700 text-white',
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-400',
      icon: Users,
      description: 'Потенциальные клиенты',
   },
}

interface ClientsCallingTabProps {
   onCountChange?: (count: number) => void
   isGlobalTabActive?: boolean
   onRequestSwitchToCallingTab?: () => void
}

export default function ClientsCallingTab({
   onCountChange,
   isGlobalTabActive = true,
   onRequestSwitchToCallingTab,
}: ClientsCallingTabProps) {
   const { user } = useAuth()

   const [clients, setClients] = useState<Client[]>([])
   const [cities, setCities] = useState<string[]>([])
   const [stats, setStats] = useState<ClientStats>({
      total: 0,
      working: 0,
      orderPlaced: 0,
      skipped: 0,
      didNotPay: 0,
      onDemand: 0,
      priceSent: 0,
      noAnswer: 0,
      wrongNumber: 0,
      other: 0,
      rejected: 0,
      blacklist: 0,
      notWorking: 0,
      stopped: 0,
   })
   const [loading, setLoading] = useState(true)

   // Фильтры
   const [search, setSearch] = useState('')
   const [selectedCity, setSelectedCity] = useState('ALL')
   const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

   // Модальное окно добавления/редактирования
   const [isModalOpen, setIsModalOpen] = useState(false)
   const [editingClient, setEditingClient] = useState<Client | null>(null)

   // Поля формы
   const [formName, setFormName] = useState('')
   const [formCity, setFormCity] = useState('')
   const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false)
   const cityInputContainerRef = useRef<HTMLDivElement>(null)
   const [formCategory, setFormCategory] = useState<string>('ON_DEMAND')
   const [formComment, setFormComment] = useState('')
   const [formPhones, setFormPhones] = useState<string[]>([''])
   const [formEmails, setFormEmails] = useState<string[]>([''])
   const [isSubmitting, setIsSubmitting] = useState(false)

   // Быстрое добавление номера прямо в строке клиента
   const [quickPhoneClientId, setQuickPhoneClientId] = useState<string | null>(
      null
   )
   const [quickPhoneValue, setQuickPhoneValue] = useState('')
   const [isAddingQuickPhone, setIsAddingQuickPhone] = useState(false)

   // Быстрое добавление email прямо в строке клиента
   const [quickEmailClientId, setQuickEmailClientId] = useState<string | null>(
      null
   )
   const [quickEmailValue, setQuickEmailValue] = useState('')
   const [isAddingQuickEmail, setIsAddingQuickEmail] = useState(false)

   // Модальное окно быстрого ввода примечания / причины отказа / причины ЧС
   const [quickNoteModal, setQuickNoteModal] = useState<{
      isOpen: boolean
      client: Client
      newCategory: string
      commentText: string
      noteLabel: string
      notePromptTitle: string
      notePlaceholder: string
      isPrompt: boolean
   } | null>(null)

   // Быстрое копирование
   const [copiedText, setCopiedText] = useState<string | null>(null)

   // Режим отображения вкладки: 'registry' (реестр), 'workspace' (рабочее место обзвона), 'supervisor' (контроль дня)
   const [activeViewMode, setActiveViewMode] = useState<'registry' | 'workspace' | 'supervisor' | 'callbacks'>('registry')

   // Ожидающие перезвоны (для алертов, звука и виджета)
   const [callbacksSearchQuery, setCallbacksSearchQuery] = useState('')
   const [callbacksFilterTab, setCallbacksFilterTab] = useState<'all' | 'due' | 'upcoming'>('all')
   const [activeCallbacks, setActiveCallbacks] = useState<{
      dueNow: Client[]
      upcoming: Client[]
      total: number
   }>({ dueNow: [], upcoming: [], total: 0 })
   const alertedCallbackIdsRef = useRef<Set<string>>(new Set())

   // Модальное окно назначения перезвона
   const [isCallbackModalOpen, setIsCallbackModalOpen] = useState(false)
   // Модальное окно просмотра всех клиентов, ожидающих звонка сейчас
   const [isWaitingCallbacksModalOpen, setIsWaitingCallbacksModalOpen] = useState(false)
   const [callbackTargetClient, setCallbackTargetClient] = useState<Client | null>(null)
   const [callbackPreset, setCallbackPreset] = useState<'+30m' | '+1h' | '+2h' | 'tomorrow' | 'custom'>('+30m')
   const [callbackCustomDate, setCallbackCustomDate] = useState<string>('')
   const [callbackCustomTime, setCallbackCustomTime] = useState<string>('10:00')
   const [callbackSource, setCallbackSource] = useState<'CALL' | 'MEETING'>('CALL')
   const [callbackNote, setCallbackNote] = useState<string>('')
   const [isSavingCallback, setIsSavingCallback] = useState(false)

   // Монтирование на клиенте (для Portal)
   const [isMounted, setIsMounted] = useState(false)
   useEffect(() => {
      setIsMounted(true)
   }, [])

   // Состояния фиксации звонка в модальном окне «Ждут звонка» (Контур Б)
   const [fixatingClientId, setFixatingClientId] = useState<string | null>(null)
   const [fixatingAction, setFixatingAction] = useState<
      'ORDER_PLACED' | 'CALLBACK' | 'NO_ANSWER' | 'STOPPED' | null
   >(null)
   const [fixatingOrderNote, setFixatingOrderNote] = useState('')
   const [fixatingCallbackPreset, setFixatingCallbackPreset] = useState<
      '+30m' | '+1h' | '+2h' | 'tomorrow' | 'custom'
   >('+30m')
   const [fixatingCallbackCustomDate, setFixatingCallbackCustomDate] =
      useState('')
   const [fixatingCallbackCustomTime, setFixatingCallbackCustomTime] =
      useState('10:00')
   const [fixatingCallbackNote, setFixatingCallbackNote] = useState('')
   const [fixatingNoAnswerChoice, setFixatingNoAnswerChoice] = useState<
      'remind_20m' | 'clear'
   >('remind_20m')
   const [isFixatingSubmitting, setIsFixatingSubmitting] = useState(false)

   // Прикрепленный сворачивающийся список (Floating Docked Drawer)
   const [isDockCollapsed, setIsDockCollapsed] = useState(false)
   const [isDockVisible, setIsDockVisible] = useState(true)

   // Панель контроля руководителя (Антифрод & Метрики дня)
   const [dailyStats, setDailyStats] = useState<any>(null)
   const [selectedDailyDate, setSelectedDailyDate] = useState<string>(
      new Date().toISOString().slice(0, 10)
   )
   const [selectedDailyOperator, setSelectedDailyOperator] = useState<string>('ALL')
   const [isDailyStatsLoading, setIsDailyStatsLoading] = useState(false)

   // Режим работы «Начать работу» (Обзвон по городам)
   const [isCallingSessionActive, setIsCallingSessionActive] = useState(false)
   const [isCitySelectModalOpen, setIsCitySelectModalOpen] = useState(false)
   const [sessionCity, setSessionCity] = useState<string>('')
   const [sessionCitySearch, setSessionCitySearch] = useState<string>('')
   const [sessionClients, setSessionClients] = useState<Client[]>([])
   const [currentCallIndex, setCurrentCallIndex] = useState(0)
   const [selectedCallAction, setSelectedCallAction] = useState<'OTHER' | null>(
      null
   )
   const [callActionNote, setCallActionNote] = useState('')
   const [isSavingCallAction, setIsSavingCallAction] = useState(false)
   const [workspaceQueueSearch, setWorkspaceQueueSearch] = useState('')
   const [sessionStats, setSessionStats] = useState({
      orderPlaced: 0,
      callback: 0,
      noAnswer: 0,
      didNotPay: 0,
      other: 0,
      skipped: 0,
      closed: 0,
      stopped: 0,
      callThemselves: 0,
   })
   const [isSessionFinished, setIsSessionFinished] = useState(false)
   const [sessionQuickPhoneValue, setSessionQuickPhoneValue] = useState('')
   const [isAddingSessionQuickPhone, setIsAddingSessionQuickPhone] =
      useState(false)

   // Загрузка данных
   const fetchClients = async (silent = false) => {
      try {
         if (!silent) setLoading(true)
         const res = await api.get('/api/clients', {
            params: {
               search: search.trim() || undefined,
               city: selectedCity !== 'ALL' ? selectedCity : undefined,
               category:
                  selectedCategory !== 'ALL' ? selectedCategory : undefined,
            },
         })

         setClients(res.data.items || [])
         setStats(
            res.data.stats || {
               total: 0,
               working: 0,
               orderPlaced: 0,
               skipped: 0,
               didNotPay: 0,
               onDemand: 0,
               priceSent: 0,
               noAnswer: 0,
               wrongNumber: 0,
               other: 0,
               rejected: 0,
               blacklist: 0,
               notWorking: 0,
               closed: 0,
               stopped: 0,
               callThemselves: 0,
               callback: 0,
               pendingCallbacks: 0,
               activeForCalling: 0,
            }
         )
         setCities(res.data.cities || [])
         if (onCountChange && res.data.stats?.total !== undefined) {
            onCountChange(res.data.stats.total)
         }
      } catch (err: any) {
         console.error('Ошибка загрузки клиентов:', err)
         toast.error('Не удалось загрузить базу клиентов')
      } finally {
         if (!silent) setLoading(false)
      }
   }

   // Загрузка активных перезвонов по всей базе
   const fetchActiveCallbacks = async () => {
      try {
         const res = await api.get('/api/clients/active-callbacks')
         const data = res.data || { dueNow: [], upcoming: [], total: 0 }
         setActiveCallbacks(data)

         // Проверка новых наступивших перезвонов
         const dueNow: Client[] = data.dueNow || []
         let hasNewDue = false
         dueNow.forEach((client) => {
            if (!alertedCallbackIdsRef.current.has(client.id)) {
               alertedCallbackIdsRef.current.add(client.id)
               hasNewDue = true
               toast(
                  (t) => (
                     <div className='flex items-start gap-2.5'>
                        <Clock4 className='w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-bounce' />
                        <div>
                           <div className='font-bold text-xs text-slate-900'>
                              ⏰ Пора перезвонить!
                           </div>
                           <div className='text-xs text-slate-700 font-semibold'>
                              {client.name} ({client.city})
                           </div>
                           {client.callbackNote && (
                              <div className='text-[11px] text-amber-800 italic mt-0.5'>
                                 «{client.callbackNote}»
                              </div>
                           )}
                           {client.phones?.[0] && (
                              <a
                                 href={`tel:${client.phones[0].replace(/[^\d+]/g, '')}`}
                                 className='font-mono font-bold text-xs text-teal-700 underline block mt-1 hover:text-teal-800'
                              >
                                 📞 {client.phones[0]}
                              </a>
                           )}
                        </div>
                     </div>
                  ),
                  {
                     duration: 7000,
                     style: {
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                     },
                  }
               )
            }
         })

         if (hasNewDue) {
            playNotificationChime()
         }
      } catch (err) {
         // Silently ignore polling error
      }
   }

   // Загрузка метрик дня для руководителя
   const fetchDailyStats = async () => {
      try {
         setIsDailyStatsLoading(true)
         const res = await api.get('/api/clients/daily-stats', {
            params: {
               date: selectedDailyDate || undefined,
               operator:
                  selectedDailyOperator !== 'ALL'
                     ? selectedDailyOperator
                     : undefined,
            },
         })
         setDailyStats(res.data)
      } catch (err) {
         console.error('Ошибка загрузки статистики дня:', err)
         toast.error('Не удалось загрузить метрики дня')
      } finally {
         setIsDailyStatsLoading(false)
      }
   }

   // Периодический опрос перезвонов (каждые 25 секунд)
   useEffect(() => {
      fetchActiveCallbacks()
      const interval = setInterval(() => {
         fetchActiveCallbacks()
      }, 25000)
      return () => clearInterval(interval)
   }, [])

   // Загрузка метрик руководителя при переключении режима
   useEffect(() => {
      if (activeViewMode === 'supervisor') {
         fetchDailyStats()
      }
   }, [activeViewMode, selectedDailyDate, selectedDailyOperator])

   useEffect(() => {
      fetchClients()
   }, [selectedCity, selectedCategory])

   // Поиск с дебаунсом
   useEffect(() => {
      const timer = setTimeout(() => {
         fetchClients(true)
      }, 250)
      return () => clearTimeout(timer)
   }, [search])

   // Закрытие выпадающего списка городов при клике вне поля
   useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
         if (
            cityInputContainerRef.current &&
            !cityInputContainerRef.current.contains(e.target as Node)
         ) {
            setIsCityDropdownOpen(false)
         }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
         document.removeEventListener('mousedown', handleClickOutside)
      }
   }, [])

   // Защита от утечки данных: запрет Ctrl+A (выделение), Ctrl+P (печать), Ctrl+S (сохранение), выделения и контекстного меню
   useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
         const isCtrlOrCmd = e.ctrlKey || e.metaKey
         const key = e.key.toLowerCase()
         const target = e.target as HTMLElement | null
         const isInput =
            target &&
            (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')

         // Блокировка Ctrl+A (Выделить всё) вне полей ввода формы
         if (isCtrlOrCmd && key === 'a' && !isInput) {
            e.preventDefault()
            window.getSelection()?.removeAllRanges()
            toast.error('Выделение клиентской базы отключено', {
               id: 'select-protected',
               duration: 1500,
            })
            return
         }

         // Блокировка Ctrl+P (Печать / Экспорт в PDF)
         if (isCtrlOrCmd && key === 'p') {
            e.preventDefault()
            toast.error('Печать и выгрузка клиентской базы запрещены', {
               id: 'print-protected',
               duration: 2000,
            })
            return
         }

         // Блокировка Ctrl+S (Сохранение HTML)
         if (isCtrlOrCmd && key === 's') {
            e.preventDefault()
            toast.error('Сохранение клиентской базы запрещено', {
               id: 'save-protected',
               duration: 2000,
            })
            return
         }

         // Блокировка Ctrl+C при выделении вне полей ввода
         if (isCtrlOrCmd && key === 'c' && !isInput) {
            const selection = window.getSelection()?.toString()
            if (selection && selection.length > 0) {
               e.preventDefault()
               window.getSelection()?.removeAllRanges()
               toast.error('Копирование фрагментов базы запрещено', {
                  id: 'copy-protected',
                  duration: 1500,
               })
            }
         }
      }

      const handleCopy = (e: ClipboardEvent) => {
         const target = e.target as HTMLElement | null
         const isInput =
            target &&
            (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
         if (!isInput) {
            e.preventDefault()
            window.getSelection()?.removeAllRanges()
         }
      }

      const handleSelectStart = (e: Event) => {
         const target = e.target as HTMLElement | null
         const isInput =
            target &&
            (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
         if (!isInput) {
            e.preventDefault()
         }
      }

      window.addEventListener('keydown', handleKeyDown)
      document.addEventListener('copy', handleCopy)
      document.addEventListener('selectstart', handleSelectStart)

      return () => {
         window.removeEventListener('keydown', handleKeyDown)
         document.removeEventListener('copy', handleCopy)
         document.removeEventListener('selectstart', handleSelectStart)
      }
   }, [])

   // Копирование телефона, почты или названия
   const handleCopyText = (
      text: string,
      type: string = 'phone',
      e?: React.MouseEvent
   ) => {
      if (e) e.stopPropagation()
      navigator.clipboard.writeText(text)
      setCopiedText(type)
      const label =
         type === 'email'
            ? 'Email скопирован'
            : type === 'name'
            ? 'Название скопировано'
            : 'Номер скопирован'
      toast.success(`${label}: ${text}`, { duration: 1500 })
      setTimeout(() => {
         setCopiedText((prev) => (prev === type ? null : prev))
      }, 2000)
   }

   const handleCopy = (text: string, type: string = 'name') => {
      handleCopyText(text, type)
   }

   // Изменение категории в строке таблицы
   const handleCategorySelectChange = async (
      client: Client,
      newCat: string
   ) => {
      if (newCat === 'CALLBACK') {
         handleOpenCallbackModal(client)
         return
      }

      const cfg = CATEGORIES_CONFIG[newCat]
      if (cfg?.hasNote) {
         // Открываем модальное окно для ввода примечания / причины
         setQuickNoteModal({
            isOpen: true,
            client,
            newCategory: newCat,
            commentText: client.category === newCat ? client.comment || '' : '',
            noteLabel: cfg.noteLabel || 'Примечание',
            notePromptTitle: cfg.notePromptTitle || 'Укажите примечание',
            notePlaceholder: cfg.notePlaceholder || 'Впишите текст...',
            isPrompt: true,
         })
      } else {
         // Категория без обязательного примечания (автоматически снимает старый перезвон)
         try {
            setClients((prev) =>
               prev.map((c) =>
                  c.id === client.id
                     ? {
                          ...c,
                          category: newCat,
                          callbackAt: null,
                          callbackNote: null,
                          callbackSource: null,
                       }
                     : c
               )
            )
            await api.put(`/api/clients/${client.id}`, { category: newCat })
            fetchClients(true)
            fetchActiveCallbacks()
            toast.success('Категория обновлена', { duration: 1500 })
         } catch (err: any) {
            toast.error('Ошибка сохранения категории')
            fetchClients(true)
         }
      }
   }

   // Сохранение быстрого примечания / причины
   const handleSaveQuickNote = async (includeComment = true) => {
      if (!quickNoteModal) return
      const { client, newCategory, commentText } = quickNoteModal
      const comment = includeComment ? commentText.trim() || null : null

      try {
         setClients((prev) =>
            prev.map((c) =>
               c.id === client.id ? { ...c, category: newCategory, comment } : c
            )
         )
         await api.put(`/api/clients/${client.id}`, {
            category: newCategory,
            comment,
         })
         setQuickNoteModal(null)
         fetchClients(true)
         toast.success('Данные сохранены', { duration: 1500 })
      } catch (err: any) {
         toast.error('Ошибка сохранения')
         fetchClients(true)
      }
   }

   // Открытие редактора примечания по клику на бейдж / карандаш в строке
   const handleOpenQuickNoteEditor = (client: Client) => {
      const cfg = CATEGORIES_CONFIG[client.category] || CATEGORIES_CONFIG.OTHER
      setQuickNoteModal({
         isOpen: true,
         client,
         newCategory: client.category,
         commentText: client.comment || '',
         noteLabel: cfg.noteLabel || 'Примечание',
         notePromptTitle: cfg.notePromptTitle || 'Редактирование примечания',
         notePlaceholder: cfg.notePlaceholder || 'Впишите текст...',
         isPrompt: false,
      })
   }

   // Быстрое добавление номера в строке
   const handleAddQuickPhone = async (clientId: string) => {
      if (!quickPhoneValue.trim()) return
      try {
         setIsAddingQuickPhone(true)
         await api.post(`/api/clients/${clientId}/phones`, {
            phone: quickPhoneValue.trim(),
         })
         toast.success('Номер добавлен!')
         setQuickPhoneClientId(null)
         setQuickPhoneValue('')
         fetchClients(true)
      } catch (err: any) {
         toast.error(err.response?.data?.error || 'Ошибка добавления номера')
      } finally {
         setIsAddingQuickPhone(false)
      }
   }

   // Быстрое добавление email в строке
   const handleAddQuickEmail = async (clientId: string) => {
      if (!quickEmailValue.trim()) return
      try {
         setIsAddingQuickEmail(true)
         await api.post(`/api/clients/${clientId}/emails`, {
            email: quickEmailValue.trim(),
         })
         toast.success('Email добавлен!')
         setQuickEmailClientId(null)
         setQuickEmailValue('')
         fetchClients(true)
      } catch (err: any) {
         toast.error(err.response?.data?.error || 'Ошибка добавления email')
      } finally {
         setIsAddingQuickEmail(false)
      }
   }

   // Удаление номера у клиента
   const handleDeletePhone = async (
      clientId: string,
      phone: string,
      e: React.MouseEvent
   ) => {
      e.stopPropagation()
      if (!confirm(`Удалить номер ${phone} у этого клиента?`)) return
      try {
         await api.delete(`/api/clients/${clientId}/phones`, {
            data: { phone },
         })
         toast.success('Номер удален')
         fetchClients(true)
      } catch (err: any) {
         toast.error('Не удалось удалить номер')
      }
   }

   // Удаление email у клиента
   const handleDeleteEmail = async (
      clientId: string,
      email: string,
      e: React.MouseEvent
   ) => {
      e.stopPropagation()
      if (!confirm(`Удалить email ${email} у этого клиента?`)) return
      try {
         await api.delete(`/api/clients/${clientId}/emails`, {
            data: { email },
         })
         toast.success('Email удален')
         fetchClients(true)
      } catch (err: any) {
         toast.error('Не удалось удалить email')
      }
   }

   // Удаление клиента
   const handleDeleteClient = async (client: Client) => {
      if (
         !confirm(
            `Вы действительно хотите удалить клиента "${client.name}" (${client.city})?`
         )
      ) {
         return
      }
      try {
         await api.delete(`/api/clients/${client.id}`)
         toast.success('Клиент удален')
         fetchClients(true)
      } catch (err: any) {
         toast.error('Ошибка удаления клиента')
      }
   }

   // Открытие модалки создания/редактирования
   const handleOpenCreateModal = () => {
      setEditingClient(null)
      setFormName('')
      setFormCity(selectedCity !== 'ALL' ? selectedCity : '')
      setFormCategory('ON_DEMAND')
      setFormComment('')
      setFormPhones([''])
      setFormEmails([])
      setIsCityDropdownOpen(false)
      setIsModalOpen(true)
   }

   const handleOpenEditModal = (client: Client) => {
      setEditingClient(client)
      setFormName(client.name)
      setFormCity(client.city)
      setFormCategory(client.category || 'ON_DEMAND')
      setFormComment(client.comment || '')
      setFormPhones(client.phones?.length ? [...client.phones] : [])
      setFormEmails(client.emails?.length ? [...client.emails] : [])
      setIsCityDropdownOpen(false)
      setIsModalOpen(true)
   }

   // Добавление/удаление полей телефонов в форме
   const handleAddPhoneField = () => {
      setFormPhones((prev) => [...prev, ''])
   }

   const handlePhoneFieldChange = (index: number, val: string) => {
      setFormPhones((prev) => {
         const copy = [...prev]
         copy[index] = val
         return copy
      })
   }

   const handleRemovePhoneField = (index: number) => {
      setFormPhones((prev) => prev.filter((_, i) => i !== index))
   }

   // Добавление/удаление полей email в форме
   const handleAddEmailField = () => {
      setFormEmails((prev) => [...prev, ''])
   }

   const handleEmailFieldChange = (index: number, val: string) => {
      setFormEmails((prev) => {
         const copy = [...prev]
         copy[index] = val
         return copy
      })
   }

   const handleRemoveEmailField = (index: number) => {
      setFormEmails((prev) => prev.filter((_, i) => i !== index))
   }

   // Сохранение формы
   const handleSubmitForm = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!formName.trim()) {
         toast.error('Укажите название клиента')
         return
      }
      if (!formCity.trim()) {
         toast.error('Укажите город')
         return
      }

      const cleanedPhones = formPhones.map((p) => p.trim()).filter(Boolean)

      const cleanedEmails = formEmails
         .map((e) => e.trim().toLowerCase())
         .filter(Boolean)

      try {
         setIsSubmitting(true)
         const payload = {
            name: formName.trim(),
            city: formCity.trim(),
            category: formCategory,
            comment: formComment.trim() || null,
            phones: cleanedPhones,
            emails: cleanedEmails,
         }

         if (editingClient) {
            await api.put(`/api/clients/${editingClient.id}`, payload)
            toast.success('Клиент успешно обновлен')
         } else {
            await api.post('/api/clients', payload)
            toast.success('Клиент успешно добавлен в базу')
         }

         setIsModalOpen(false)
         fetchClients(true)
      } catch (err: any) {
         toast.error(
            err.response?.data?.error || 'Ошибка при сохранении клиента'
         )
      } finally {
         setIsSubmitting(false)
      }
   }

   // Обработчики режима «Начать работу» (Обзвон по городам)
   const handleOpenCitySelect = () => {
      setSessionCitySearch('')
      if (selectedCity && selectedCity !== 'ALL') {
         setSessionCity(selectedCity)
      } else if (cities.length > 0 && !sessionCity) {
         setSessionCity(cities[0])
      }
      setIsCitySelectModalOpen(true)
   }

   const handleStartSession = async (targetCity?: string) => {
      const cityToLoad =
         targetCity ||
         sessionCity ||
         (selectedCity !== 'ALL' ? selectedCity : cities[0])
      if (!cityToLoad) {
         toast.error('Пожалуйста, выберите город для обзвона')
         return
      }

      try {
         setLoading(true)
         // Загружаем ТОЛЬКО РЕАЛЬНО РАБОЧИХ клиентов города (горящие перезвоны идут первыми!)
         const res = await api.get('/api/clients/queue', {
            params: {
               city: cityToLoad,
            },
         })

         const items: Client[] = res.data.items || []
         if (items.length === 0) {
            toast.error(
               `В городе «${cityToLoad}» нет активных клиентов для обзвона (все закрылись или уже обработаны)`
            )
            return
         }

         setSessionCity(cityToLoad)
         setSessionClients(items)
         setCurrentCallIndex(0)
         setSelectedCallAction(null)
         setCallActionNote('')
         setSessionStats({
            orderPlaced: 0,
            callback: 0,
            noAnswer: 0,
            didNotPay: 0,
            other: 0,
            skipped: 0,
            closed: 0,
            stopped: 0,
            callThemselves: 0,
         })
         setIsSessionFinished(false)
         setIsCitySelectModalOpen(false)
         setIsCallingSessionActive(true)
         setActiveViewMode('workspace')
         toast.success(
            `Рабочее место обзвона: ${cityToLoad} (${items.length} активных кл.)`
         )
         fetchActiveCallbacks()
      } catch (err) {
         console.error('Ошибка загрузки клиентов для обзвона:', err)
         toast.error('Не удалось загрузить клиентов города')
      } finally {
         setLoading(false)
      }
   }

   // Переход к следующему клиенту
   const advanceToNextClient = () => {
      setSelectedCallAction(null)
      setCallActionNote('')
      if (currentCallIndex < sessionClients.length - 1) {
         setCurrentCallIndex((prev) => prev + 1)
      } else {
         setIsSessionFinished(true)
         fetchClients(true)
      }
   }

   // Открытие модалки назначения перезвона
   const handleOpenCallbackModal = (client?: Client) => {
      const target = client || sessionClients[currentCallIndex]
      if (!target) return
      setCallbackTargetClient(target)
      setCallbackPreset('+30m')
      setCallbackSource('CALL')
      setCallbackNote('')
      const now = new Date()
      setCallbackCustomDate(now.toISOString().slice(0, 10))
      setCallbackCustomTime('10:00')
      setIsCallbackModalOpen(true)
   }

   // Сохранение перезвона
   const handleSaveCallback = async () => {
      if (!callbackTargetClient) return
      let targetDate = new Date()

      if (callbackPreset === '+30m') {
         targetDate = new Date(Date.now() + 30 * 60 * 1000)
      } else if (callbackPreset === '+1h') {
         targetDate = new Date(Date.now() + 60 * 60 * 1000)
      } else if (callbackPreset === '+2h') {
         targetDate = new Date(Date.now() + 120 * 60 * 1000)
      } else if (callbackPreset === 'tomorrow') {
         targetDate = new Date()
         targetDate.setDate(targetDate.getDate() + 1)
         targetDate.setHours(10, 0, 0, 0)
      } else if (callbackPreset === 'custom') {
         if (!callbackCustomDate) {
            toast.error('Укажите дату перезвона')
            return
         }
         const [hours, mins] = (callbackCustomTime || '10:00')
            .split(':')
            .map(Number)
         targetDate = new Date(callbackCustomDate)
         targetDate.setHours(hours || 10, mins || 0, 0, 0)
      }

      setIsSavingCallback(true)
      try {
         await handleCallAction('CALLBACK', undefined, {
            callbackAt: targetDate.toISOString(),
            callbackNote:
               callbackNote.trim() ||
               (callbackSource === 'MEETING'
                  ? 'Встретили вживую'
                  : 'Попросили перезвонить'),
            callbackSource,
         })
         setIsCallbackModalOpen(false)
      } finally {
         setIsSavingCallback(false)
      }
   }

   // Снять отметку перезвона (клиенту уже перезвонили)
   const handleClearCallback = async (clientId: string) => {
      try {
         const res = await api.post(`/api/clients/${clientId}/clear-callback`)
         const updated: Client = res.data.client
         toast.success('Отметка перезвона снята (клиенту перезвонили)', {
            icon: '✅',
            duration: 2000,
         })
         // Обновляем очередь обзвона если клиент в ней есть
         setSessionClients((prev) =>
            prev.map((c) =>
               c.id === clientId
                  ? {
                       ...c,
                       callbackAt: null,
                       callbackNote: null,
                       callbackSource: null,
                       category: updated.category,
                    }
                  : c
            )
         )
         // Обновляем общий список клиентов
         setClients((prev) =>
            prev.map((c) =>
               c.id === clientId
                  ? {
                       ...c,
                       callbackAt: null,
                       callbackNote: null,
                       callbackSource: null,
                       category: updated.category,
                    }
                  : c
            )
         )
         // Обновляем список горящих звонков
         fetchActiveCallbacks()
         fetchClients(true)
      } catch (err: any) {
         console.error('Ошибка снятия перезвона:', err)
         toast.error(err.response?.data?.error || 'Не удалось снять перезвон')
      }
   }

   // Обработка действий в обзвоне
   const handleCallAction = async (
      action:
         | 'ORDER_PLACED'
         | 'SKIPPED'
         | 'OTHER'
         | 'DID_NOT_PAY'
         | 'NO_ANSWER'
         | 'CLOSED'
         | 'STOPPED'
         | 'CALL_THEMSELVES'
         | 'CALLBACK',
      customNote?: string,
      callbackPayload?: {
         callbackAt?: string | null
         callbackNote?: string | null
         callbackSource?: 'CALL' | 'MEETING'
      }
   ) => {
      const currentClient = sessionClients[currentCallIndex]
      if (!currentClient) return

      try {
         setIsSavingCallAction(true)

         const payload: any = {
            action,
            comment:
               customNote !== undefined
                  ? customNote.trim()
                  : callActionNote.trim() || null,
         }

         if (action === 'CALLBACK' && callbackPayload) {
            payload.callbackAt = callbackPayload.callbackAt
            payload.callbackNote = callbackPayload.callbackNote
            payload.callbackSource = callbackPayload.callbackSource
            payload.source = callbackPayload.callbackSource
         }

         // Отправляем на бэкенд: фиксирует в CallLog + обновляет Client + пишет в AuditLog
         const res = await api.post(
            `/api/clients/${currentClient.id}/calls`,
            payload
         )
         const updatedClient: Client = res.data.client || {
            ...currentClient,
            category: action,
         }

         // Обновляем локально список клиентов сессии
         setSessionClients((prev) =>
            prev.map((c, idx) => (idx === currentCallIndex ? updatedClient : c))
         )

         // Обновляем счетчики сессии
         setSessionStats((prev) => {
            const keyMap: Record<string, keyof typeof prev> = {
               ORDER_PLACED: 'orderPlaced',
               CALLBACK: 'callback',
               NO_ANSWER: 'noAnswer',
               DID_NOT_PAY: 'didNotPay',
               OTHER: 'other',
               SKIPPED: 'skipped',
               CLOSED: 'closed',
               STOPPED: 'stopped',
               CALL_THEMSELVES: 'callThemselves',
            }
            const key = keyMap[action]
            return key ? { ...prev, [key]: (prev[key] || 0) + 1 } : prev
         })

         // Информативные тосты
         if (action === 'ORDER_PLACED') {
            toast.success('🎉 Сделала заявку!', { duration: 1500 })
         } else if (action === 'CALLBACK') {
            toast.success('🕒 Назначен перезвон', { icon: '⏰', duration: 1500 })
         } else if (action === 'NO_ANSWER') {
            toast('Отмечено: Не ответили', { icon: '📵', duration: 1200 })
         } else if (action === 'SKIPPED') {
            toast('Клиент пропущен', { icon: '⏭️', duration: 1200 })
         } else if (action === 'CLOSED') {
            toast.error('Зафиксировано: Закрылись (исключен из обзвона)', {
               duration: 1800,
            })
         } else if (action === 'STOPPED') {
            toast.error(
               'Зафиксировано: Перестали работать (исключен из обзвона)',
               {
                  duration: 1800,
               }
            )
         } else if (action === 'CALL_THEMSELVES') {
            toast.success('Зафиксировано: Сами звонят (исключен из обзвона)', {
               icon: '📲',
               duration: 1800,
            })
         } else if (action === 'DID_NOT_PAY') {
            toast.error('Зафиксировано: Не оплатила поставку', {
               duration: 1500,
            })
         } else {
            toast.success('Сохранено', { duration: 1200 })
         }

         advanceToNextClient()
         fetchActiveCallbacks()
      } catch (err: any) {
         console.error('Ошибка сохранения результата звонка:', err)
         toast.error(
            err.response?.data?.error || 'Ошибка при сохранении результата'
         )
      } finally {
         setIsSavingCallAction(false)
      }
   }

   // Быстрое добавление телефона прямо из карточки звонка
   const handleAddSessionPhone = async () => {
      const currentClient = sessionClients[currentCallIndex]
      if (!currentClient || !sessionQuickPhoneValue.trim()) return

      try {
         setIsAddingSessionQuickPhone(true)
         const res = await api.post(`/api/clients/${currentClient.id}/phones`, {
            phone: sessionQuickPhoneValue.trim(),
         })
         const updated = res.data
         setSessionClients((prev) =>
            prev.map((c) =>
               c.id === currentClient.id ? { ...c, phones: updated.phones } : c
            )
         )
         setSessionQuickPhoneValue('')
         toast.success('Номер добавлен к клиенту')
      } catch (err: any) {
         toast.error(err.response?.data?.error || 'Ошибка добавления номера')
      } finally {
         setIsAddingSessionQuickPhone(false)
      }
   }

   const handlePrevCall = () => {
      if (isSessionFinished) {
         setIsSessionFinished(false)
         setCurrentCallIndex(Math.max(0, sessionClients.length - 1))
         setSelectedCallAction(null)
         setCallActionNote('')
         return
      }
      if (currentCallIndex > 0) {
         setCurrentCallIndex((prev) => prev - 1)
         setSelectedCallAction(null)
         setCallActionNote('')
      }
   }

   // Свернуть в реестр (не сбрасывая сессию)
   const handleCloseSession = () => {
      setActiveViewMode('registry')
      setIsDockCollapsed(false)
   }

   // Полное завершение сессии обзвона по городу (выход в реестр)
   const handleFinishAndExitSession = () => {
      const finishedCity = sessionCity
      setIsCallingSessionActive(false)
      setSessionCity('')
      setSessionClients([])
      setCurrentCallIndex(0)
      setIsSessionFinished(false)
      setActiveViewMode('registry')
      if (finishedCity) {
         toast.success(`Обзвон по г. ${finishedCity} завершен! Итоги зафиксированы.`)
      }
      fetchClients(true)
   }

   // Фиксация результата звонка по запланированному перезвону (Контур Б: Горячие перезвоны)
   const handleFixateCallOutcome = async (
      client: Client,
      action: 'ORDER_PLACED' | 'CALLBACK' | 'NO_ANSWER' | 'STOPPED',
      extra?: {
         comment?: string
         callbackPreset?: string
         customDate?: string
         customTime?: string
         callbackNote?: string
         rescheduleMinutes?: number
      }
   ) => {
      try {
         setIsFixatingSubmitting(true)
         let payload: any = { action }

         if (action === 'ORDER_PLACED') {
            payload.comment = extra?.comment?.trim() || 'Заявка принята по запланированному перезвону'
         } else if (action === 'CALLBACK') {
            let nextDate = new Date()
            const preset = extra?.callbackPreset || '+30m'
            if (preset === '+30m') nextDate = new Date(Date.now() + 30 * 60 * 1000)
            else if (preset === '+1h') nextDate = new Date(Date.now() + 60 * 60 * 1000)
            else if (preset === '+2h') nextDate = new Date(Date.now() + 120 * 60 * 1000)
            else if (preset === 'tomorrow') {
               nextDate = new Date()
               nextDate.setDate(nextDate.getDate() + 1)
               nextDate.setHours(10, 0, 0, 0)
            }
            payload.callbackAt = nextDate.toISOString()
            payload.callbackNote = extra?.callbackNote?.trim() || 'Перенос перезвона'
            payload.callbackSource = 'CALL'
            payload.source = 'CALL'
         } else if (action === 'NO_ANSWER') {
            if (extra?.rescheduleMinutes) {
               payload.action = 'CALLBACK'
               payload.callbackAt = new Date(Date.now() + extra.rescheduleMinutes * 60 * 1000).toISOString()
               payload.callbackNote = `Не ответил, перезвонить через ${extra.rescheduleMinutes}м`
               payload.callbackSource = 'CALL'
               payload.comment = `Не ответил (напомнить через ${extra.rescheduleMinutes}м)`
            } else {
               payload.comment = 'Не ответил (перезвон закрыт)'
            }
         } else if (action === 'STOPPED') {
            payload.comment = 'Закрылись / перестали работать'
         }

         await api.post(`/api/clients/${client.id}/calls`, payload)

         // Если это не перенос перезвона, снимаем текущее напоминание
         if (action !== 'CALLBACK' && !(action === 'NO_ANSWER' && extra?.rescheduleMinutes)) {
            try {
               await api.post(`/api/clients/${client.id}/clear-callback`)
            } catch (_) {}
         }

         toast.success(`Результат звонка зафиксирован: ${client.name}`)
         setFixatingClientId(null)
         setFixatingAction(null)
         fetchActiveCallbacks()
         fetchDailyStats()
         fetchClients(true)
      } catch (err: any) {
         console.error('Ошибка фиксации перезвона:', err)
         toast.error(err.response?.data?.error || 'Не удалось зафиксировать результат звонка')
      } finally {
         setIsFixatingSubmitting(false)
      }
   }

   // Список основных категорий для фильтров и модалок
   const MAIN_CATEGORIES = [
      'WORKING',
      'ORDER_PLACED',
      'CALLBACK',
      'SKIPPED',
      'ON_DEMAND',
      'PRICE_SENT',
      'CALL_THEMSELVES',
      'NO_ANSWER',
      'WRONG_NUMBER',
      'OTHER',
      'DID_NOT_PAY',
      'CLOSED',
      'STOPPED',
      'REJECTED',
      'BLACKLIST',
   ]

   return (
      <div
         className='protected-clients-view select-none space-y-6 pb-12'
         onContextMenu={(e) => {
            const target = e.target as HTMLElement
            if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
               e.preventDefault()
               toast.error('Контекстное меню базы клиентов отключено', {
                  id: 'ctx-disabled',
                  duration: 1500,
               })
            }
         }}
         onDragStart={(e) => {
            const target = e.target as HTMLElement
            if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
               e.preventDefault()
            }
         }}
      >
         {/* Предупреждение при попытке печати страницы */}
         <div className='protected-clients-print-warning p-10 text-center font-bold text-rose-600 text-lg bg-rose-50 border border-rose-300 rounded-2xl'>
            🔒 Печать и экспорт базы клиентов строго запрещены политикой
            безопасности TopFish Control.
         </div>

         {/* Баннер горящих перезвонов: Наступило время звонка! */}
         {activeCallbacks.dueNow.length > 0 && (
            <div className='bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-xl border border-amber-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-200'>
               <div className='flex items-start sm:items-center gap-3.5'>
                  <div className='w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner'>
                     <Flame className='w-6 h-6 text-amber-400 animate-bounce' />
                  </div>
                  <div>
                     <div className='flex items-center gap-2'>
                        <span className='font-black text-sm sm:text-base tracking-wide uppercase text-amber-300'>
                           🔥 Наступило время звонка:
                        </span>
                        <span className='px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-sm'>
                           {activeCallbacks.dueNow.length}
                        </span>
                     </div>
                     <p className='text-xs sm:text-sm text-slate-300 mt-0.5'>
                        {activeCallbacks.dueNow
                           .map((c) => `${c.name} (${c.city})`)
                           .slice(0, 3)
                           .join(', ')}
                        {activeCallbacks.dueNow.length > 3
                           ? ` и еще ${activeCallbacks.dueNow.length - 3}...`
                           : ''}
                     </p>
                  </div>
               </div>

               <div className='flex items-center gap-2 w-full md:w-auto shrink-0 justify-end'>
                  {activeCallbacks.dueNow[0]?.phones?.[0] && (
                     <a
                        href={`tel:${activeCallbacks.dueNow[0].phones[0].replace(/[^\d+]/g, '')}`}
                        className='px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition'
                     >
                        <PhoneCall className='w-3.5 h-3.5 fill-white' />
                        <span>Набрать: {activeCallbacks.dueNow[0].name}</span>
                     </a>
                  )}
                  <button
                     type='button'
                     onClick={() => setIsWaitingCallbacksModalOpen(true)}
                     className='px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer'
                  >
                     <span>Зафиксировать / Показать всех ({activeCallbacks.dueNow.length})</span>
                     <ChevronRight className='w-3.5 h-3.5' />
                  </button>
               </div>
            </div>
         )}

         {/* Верхняя навигационная панель переключения режимов */}
         <div className='bg-white rounded-3xl border border-slate-200 p-2.5 sm:p-3 shadow-xs flex flex-wrap items-center justify-between gap-3'>
            <div className='flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0'>
               <button
                  type='button'
                  onClick={() => setActiveViewMode('registry')}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                     activeViewMode === 'registry'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
               >
                  <Building2 className='w-4 h-4' />
                  <span>База & Реестр клиентов</span>
                  <span
                     className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                        activeViewMode === 'registry'
                           ? 'bg-slate-800 text-slate-300'
                           : 'bg-slate-100 text-slate-600'
                     }`}
                  >
                     {stats.total}
                  </span>
               </button>

               <button
                  type='button'
                  onClick={() => {
                     if (isCallingSessionActive) {
                        setActiveViewMode('workspace')
                     } else {
                        setIsCitySelectModalOpen(true)
                     }
                  }}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                     activeViewMode === 'workspace'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                        : isCallingSessionActive
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
               >
                  <div className='relative'>
                     <PhoneCall className='w-4 h-4' />
                     {isCallingSessionActive && (
                        <span className='absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping' />
                     )}
                  </div>
                  <span>Рабочее место обзвона</span>
                  {isCallingSessionActive ? (
                     <span className='text-[10px] px-2 py-0.5 rounded-md bg-emerald-700 text-white font-bold animate-pulse'>
                        г. {sessionCity} ({currentCallIndex + 1}/{sessionClients.length})
                     </span>
                  ) : (
                     <span className='text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600'>
                        Начать
                     </span>
                  )}
               </button>

               <button
                  type='button'
                  onClick={() => {
                     setActiveViewMode('callbacks')
                     fetchActiveCallbacks()
                  }}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                     activeViewMode === 'callbacks'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-extrabold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
               >
                  <Clock className='w-4 h-4 text-amber-500' />
                  <span>Кому перезвонить</span>
                  <span
                     className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                        activeViewMode === 'callbacks'
                           ? 'bg-amber-600 text-white'
                           : activeCallbacks.total > 0
                           ? 'bg-amber-100 text-amber-800'
                           : 'bg-slate-100 text-slate-600'
                     }`}
                  >
                     {activeCallbacks.total}
                  </span>
               </button>

               <button
                  type='button'
                  onClick={() => {
                     setActiveViewMode('supervisor')
                     fetchDailyStats()
                  }}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                     activeViewMode === 'supervisor'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
               >
                  <BarChart3 className='w-4 h-4' />
                  <span>Контроль дня & Антифрод</span>
               </button>
            </div>

            <div className='flex items-center gap-2 ml-auto'>
               {!isCallingSessionActive && (
                  <button
                     type='button'
                     onClick={() => setIsCitySelectModalOpen(true)}
                     className='px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer'
                  >
                     <Play className='w-3.5 h-3.5 fill-white' />
                     <span>Начать работу</span>
                  </button>
               )}
            </div>
         </div>

         {/* 1. РЕЖИМ: РЕЕСТР КЛИЕНТОВ */}
         {activeViewMode === 'registry' && (
            <div className='space-y-6'>
               {/* KPI карточки категорий (клик по карточке фильтрует список) */}
               <div className='grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 2xl:grid-cols-16 gap-2'>
            {/* Все клиенты */}
            <button
               type='button'
               onClick={() => setSelectedCategory('ALL')}
               className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                  selectedCategory === 'ALL'
                     ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-800 shadow-md'
                     : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
               }`}
            >
               <div className='flex items-center justify-between mb-1.5'>
                  <span className='text-[11px] font-semibold uppercase tracking-wider opacity-75 truncate'>
                     Все клиенты
                  </span>
                  <Building2
                     className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'ALL' ? 'text-teal-400' : 'text-slate-400'}`}
                  />
               </div>
               <div className='text-xl font-black'>{stats.total}</div>
               <div className='text-[10px] opacity-75 mt-0.5 truncate'>
                  База обзвона
               </div>
            </button>

            {/* Работаем */}
            <button
               type='button'
               onClick={() => setSelectedCategory('WORKING')}
               className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                  selectedCategory === 'WORKING'
                     ? 'bg-emerald-700 text-white border-emerald-700 ring-2 ring-emerald-500 shadow-md'
                     : 'bg-emerald-50/50 text-emerald-950 border-emerald-200 hover:bg-emerald-100/60'
               }`}
            >
               <div className='flex items-center justify-between mb-1.5'>
                  <span className='text-[11px] font-bold uppercase tracking-wider truncate'>
                     Работаем
                  </span>
                  <CheckCircle2
                     className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'WORKING' ? 'text-white' : 'text-emerald-600'}`}
                  />
               </div>
               <div className='text-xl font-black text-emerald-800'>
                  {stats.working}
               </div>
               <div className='text-[10px] opacity-75 mt-0.5 truncate'>
                  {stats.total > 0
                     ? `${Math.round((stats.working / stats.total) * 100)}% базы`
                     : '0%'}
               </div>
            </button>

            {/* Сделала заявку */}
            <button
               type='button'
               onClick={() => setSelectedCategory('ORDER_PLACED')}
               className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                  selectedCategory === 'ORDER_PLACED'
                     ? 'bg-teal-700 text-white border-teal-700 ring-2 ring-teal-500 shadow-md'
                     : 'bg-teal-50/50 text-teal-950 border-teal-200 hover:bg-teal-100/60'
               }`}
            >
               <div className='flex items-center justify-between mb-1.5'>
                  <span className='text-[11px] font-bold uppercase tracking-wider truncate'>
                     Заявка
                  </span>
                  <ShoppingBag
                     className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'ORDER_PLACED' ? 'text-white' : 'text-teal-600'}`}
                  />
               </div>
               <div className='text-xl font-black text-teal-800'>
                  {stats.orderPlaced || 0}
               </div>
               <div className='text-[10px] opacity-75 mt-0.5 truncate'>
                  Сделала заявку
               </div>
            </button>

            {/* Пропустила */}
            <button
               type='button'
               onClick={() => setSelectedCategory('SKIPPED')}
               className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                  selectedCategory === 'SKIPPED'
                     ? 'bg-slate-700 text-white border-slate-700 ring-2 ring-slate-500 shadow-md'
                     : 'bg-slate-100/80 text-slate-800 border-slate-200 hover:bg-slate-200/80'
               }`}
            >
               <div className='flex items-center justify-between mb-1.5'>
                  <span className='text-[11px] font-bold uppercase tracking-wider truncate'>
                     Пропустила
                  </span>
                  <SkipForward
                     className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'SKIPPED' ? 'text-white' : 'text-slate-500'}`}
                  />
               </div>
               <div className='text-xl font-black text-slate-900'>
                  {stats.skipped || 0}
               </div>
               <div className='text-[10px] opacity-75 mt-0.5 truncate'>
                  Пропущенные
               </div>
            </button>

            {/* По потребности */}
            <button
               type='button'
               onClick={() => setSelectedCategory('ON_DEMAND')}
               className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                  selectedCategory === 'ON_DEMAND'
                     ? 'bg-sky-700 text-white border-sky-700 ring-2 ring-sky-500 shadow-md'
                     : 'bg-sky-50/50 text-sky-950 border-sky-200 hover:bg-sky-100/60'
               }`}
            >
               <div className='flex items-center justify-between mb-1.5'>
                  <span className='text-[11px] font-bold uppercase tracking-wider truncate'>
                     По треб.
                  </span>
                  <Clock4
                     className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'ON_DEMAND' ? 'text-white' : 'text-sky-600'}`}
                  />
               </div>
               <div className='text-xl font-black text-sky-900'>
                  {stats.onDemand || 0}
               </div>
               <div className='text-[10px] opacity-75 mt-0.5 truncate'>
                  По потребности
               </div>
            </button>

            {/* Скинули прайс */}
            <button
               type='button'
               onClick={() => setSelectedCategory('PRICE_SENT')}
               className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                  selectedCategory === 'PRICE_SENT'
                     ? 'bg-indigo-700 text-white border-indigo-700 ring-2 ring-indigo-500 shadow-md'
                     : 'bg-indigo-50/50 text-indigo-950 border-indigo-200 hover:bg-indigo-100/60'
               }`}
            >
               <div className='flex items-center justify-between mb-1.5'>
                  <span className='text-[11px] font-bold uppercase tracking-wider truncate'>
                     Прайс
                  </span>
                  <Send
                     className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'PRICE_SENT' ? 'text-white' : 'text-indigo-600'}`}
                  />
               </div>
               <div className='text-xl font-black text-indigo-900'>
                  {stats.priceSent || 0}
               </div>
               <div className='text-[10px] opacity-75 mt-0.5 truncate'>
                  Скинули прайс
               </div>
            </button>

            {/* Не отвечают */}
            <button
               type='button'
               onClick={() => setSelectedCategory('NO_ANSWER')}
               className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                  selectedCategory === 'NO_ANSWER'
                     ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400 shadow-md'
                     : 'bg-amber-50/60 text-amber-950 border-amber-200 hover:bg-amber-100/70'
               }`}
            >
               <div className='flex items-center justify-between mb-1.5'>
                  <span className='text-[11px] font-bold uppercase tracking-wider truncate'>
                     Не ответ.
                  </span>
                  <PhoneMissed
                     className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'NO_ANSWER' ? 'text-white' : 'text-amber-600'}`}
                  />
               </div>
               <div className='text-xl font-black text-amber-900'>
                  {stats.noAnswer || 0}
               </div>
               <div className='text-[10px] opacity-75 mt-0.5 truncate'>
                  Гудки / сброс
               </div>
            </button>

            {/* Неправильный номер */}
            <button
               type='button'
               onClick={() => setSelectedCategory('WRONG_NUMBER')}
               className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                  selectedCategory === 'WRONG_NUMBER'
                     ? 'bg-slate-800 text-white border-slate-800 ring-2 ring-slate-600 shadow-md'
                     : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
               }`}
            >
               <div className='flex items-center justify-between mb-1.5'>
                  <span className='text-[11px] font-bold uppercase tracking-wider truncate'>
                     Не тот №
                  </span>
                  <AlertCircle
                     className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'WRONG_NUMBER' ? 'text-white' : 'text-slate-500'}`}
                  />
               </div>
               <div className='text-xl font-black text-slate-800'>
                  {stats.wrongNumber || 0}
               </div>
               <div className='text-[10px] opacity-75 mt-0.5 truncate'>
                  Неверный номер
               </div>
            </button>

            {/* Другое */}
            <button
               type='button'
               onClick={() => setSelectedCategory('OTHER')}
               className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                  selectedCategory === 'OTHER'
                     ? 'bg-purple-700 text-white border-purple-700 ring-2 ring-purple-500 shadow-md'
                     : 'bg-purple-50/50 text-purple-950 border-purple-200 hover:bg-purple-100/60'
               }`}
            >
               <div className='flex items-center justify-between mb-1.5'>
                  <span className='text-[11px] font-bold uppercase tracking-wider truncate'>
                     Другое
                  </span>
                  <MessageSquare
                     className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'OTHER' ? 'text-white' : 'text-purple-600'}`}
                  />
               </div>
               <div className='text-xl font-black text-purple-900'>
                  {stats.other || 0}
               </div>
               <div className='text-[10px] opacity-75 mt-0.5 truncate'>
                  С примечанием
               </div>
            </button>

            {/* Не оплатила */}
            <button
               type='button'
               onClick={() => setSelectedCategory('DID_NOT_PAY')}
               className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                  selectedCategory === 'DID_NOT_PAY'
                     ? 'bg-rose-700 text-white border-rose-700 ring-2 ring-rose-500 shadow-md'
                     : 'bg-rose-50/60 text-rose-950 border-rose-200 hover:bg-rose-100/70'
               }`}
            >
               <div className='flex items-center justify-between mb-1.5'>
                  <span className='text-[11px] font-bold uppercase tracking-wider truncate'>
                     Не оплатила
                  </span>
                  <AlertTriangle
                     className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'DID_NOT_PAY' ? 'text-white' : 'text-rose-600'}`}
                  />
               </div>
               <div className='text-xl font-black text-rose-800'>
                  {stats.didNotPay || 0}
               </div>
               <div className='text-[10px] opacity-75 mt-0.5 truncate'>
                  Прошлая поставка
               </div>
            </button>

            {/* Отказали */}
            <button
               type='button'
               onClick={() => setSelectedCategory('REJECTED')}
               className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                  selectedCategory === 'REJECTED'
                     ? 'bg-orange-600 text-white border-orange-600 ring-2 ring-orange-400 shadow-md'
                     : 'bg-orange-50/60 text-orange-950 border-orange-200 hover:bg-orange-100/70'
               }`}
            >
               <div className='flex items-center justify-between mb-1.5'>
                  <span className='text-[11px] font-bold uppercase tracking-wider truncate'>
                     Отказали
                  </span>
                  <XCircle
                     className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'REJECTED' ? 'text-white' : 'text-orange-600'}`}
                  />
               </div>
               <div className='text-xl font-black text-orange-900'>
                  {stats.rejected || 0}
               </div>
               <div className='text-[10px] opacity-75 mt-0.5 truncate'>
                  Причина отказа
               </div>
            </button>

            {/* В ЧС */}
            <button
               type='button'
               onClick={() => setSelectedCategory('BLACKLIST')}
               className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                  selectedCategory === 'BLACKLIST'
                     ? 'bg-rose-700 text-white border-rose-700 ring-2 ring-rose-500 shadow-md'
                     : 'bg-rose-50/60 text-rose-950 border-rose-200 hover:bg-rose-100/70'
               }`}
            >
               <div className='flex items-center justify-between mb-1.5'>
                  <span className='text-[11px] font-bold uppercase tracking-wider truncate'>
                     В ЧС
                  </span>
                  <Ban
                     className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'BLACKLIST' ? 'text-white' : 'text-rose-600'}`}
                  />
               </div>
               <div className='text-xl font-black text-rose-800'>
                  {stats.blacklist}
               </div>
               <div className='text-[10px] opacity-75 mt-0.5 truncate'>
                  Причина ЧС
               </div>
            </button>

            {/* Перезвонить */}
            <button
               type='button'
               onClick={() => setSelectedCategory('CALLBACK')}
               className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                  selectedCategory === 'CALLBACK'
                     ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400 shadow-md'
                     : 'bg-amber-50/70 text-amber-950 border-amber-300 hover:bg-amber-100'
               }`}
            >
               <div className='flex items-center justify-between mb-1.5'>
                  <span className='text-[11px] font-bold uppercase tracking-wider truncate'>
                     Перезвонить
                  </span>
                  <Clock4
                     className={`w-3.5 h-3.5 shrink-0 ${
                        selectedCategory === 'CALLBACK' ? 'text-white' : 'text-amber-600'
                     }`}
                  />
               </div>
               <div className='text-xl font-black text-amber-900'>
                  {stats.callback || 0}
               </div>
               <div className='text-[10px] opacity-75 mt-0.5 truncate'>
                  Ждут звонка
               </div>
            </button>

            {/* Сами звонят */}
            <button
               type='button'
               onClick={() => setSelectedCategory('CALL_THEMSELVES')}
               className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                  selectedCategory === 'CALL_THEMSELVES'
                     ? 'bg-cyan-700 text-white border-cyan-700 ring-2 ring-cyan-500 shadow-md'
                     : 'bg-cyan-50/70 text-cyan-950 border-cyan-300 hover:bg-cyan-100'
               }`}
            >
               <div className='flex items-center justify-between mb-1.5'>
                  <span className='text-[11px] font-bold uppercase tracking-wider truncate'>
                     Сами звонят
                  </span>
                  <PhoneIncoming
                     className={`w-3.5 h-3.5 shrink-0 ${
                        selectedCategory === 'CALL_THEMSELVES' ? 'text-white' : 'text-cyan-600'
                     }`}
                  />
               </div>
               <div className='text-xl font-black text-cyan-900'>
                  {stats.callThemselves || 0}
               </div>
               <div className='text-[10px] opacity-75 mt-0.5 truncate'>
                  Не беспокоить
               </div>
            </button>

            {/* Закрылись */}
            <button
               type='button'
               onClick={() => setSelectedCategory('CLOSED')}
               className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                  selectedCategory === 'CLOSED'
                     ? 'bg-rose-900 text-white border-rose-900 ring-2 ring-rose-700 shadow-md'
                     : 'bg-rose-50/50 text-rose-950 border-rose-200 hover:bg-rose-100'
               }`}
            >
               <div className='flex items-center justify-between mb-1.5'>
                  <span className='text-[11px] font-bold uppercase tracking-wider truncate'>
                     Закрылись
                  </span>
                  <Store
                     className={`w-3.5 h-3.5 shrink-0 ${
                        selectedCategory === 'CLOSED' ? 'text-white' : 'text-rose-700'
                     }`}
                  />
               </div>
               <div className='text-xl font-black text-rose-950'>
                  {stats.closed || 0}
               </div>
               <div className='text-[10px] opacity-75 mt-0.5 truncate'>
                  Точка закрыта
               </div>
            </button>

            {/* Перестали работать */}
            <button
               type='button'
               onClick={() => setSelectedCategory('STOPPED')}
               className={`p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                  selectedCategory === 'STOPPED'
                     ? 'bg-zinc-800 text-white border-zinc-800 ring-2 ring-zinc-600 shadow-md'
                     : 'bg-zinc-100 text-zinc-900 border-zinc-300 hover:bg-zinc-200'
               }`}
            >
               <div className='flex items-center justify-between mb-1.5'>
                  <span className='text-[11px] font-bold uppercase tracking-wider truncate'>
                     Перестали
                  </span>
                  <UserX
                     className={`w-3.5 h-3.5 shrink-0 ${
                        selectedCategory === 'STOPPED' ? 'text-white' : 'text-zinc-600'
                     }`}
                  />
               </div>
               <div className='text-xl font-black text-zinc-900'>
                  {stats.stopped || 0}
               </div>
               <div className='text-[10px] opacity-75 mt-0.5 truncate'>
                  Отказались
               </div>
            </button>
         </div>

         {/* 2. Панель управления и фильтров */}
         <div className='bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3'>
            <div className='flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3'>
               {/* Поиск */}
               <div className='relative flex-1'>
                  <Search className='w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400' />
                  <input
                     type='text'
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     placeholder='Поиск по названию, городу, телефону, email или примечанию...'
                     className='w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition'
                  />
                  {search && (
                     <button
                        type='button'
                        onClick={() => setSearch('')}
                        className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600'
                     >
                        <X className='w-4 h-4' />
                     </button>
                  )}
               </div>

               {/* Фильтр по городу */}
               <div className='flex items-center gap-2'>
                  <div className='relative min-w-[190px]'>
                     <MapPin className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none' />
                     <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className='w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white cursor-pointer appearance-none transition'
                     >
                        <option value='ALL'>
                           Все города ({cities.length})
                        </option>
                        {cities.map((c) => (
                           <option key={c} value={c}>
                              {c}
                           </option>
                        ))}
                     </select>
                     <div className='absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs'>
                        ▼
                     </div>
                  </div>

                  {/* Защитный бейдж */}
                  <div
                     className='flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-semibold shrink-0 select-none'
                     title='Выгрузка, печать и копирование закрыты политикой безопасности'
                  >
                     <ShieldCheck className='w-4 h-4 text-emerald-600 shrink-0' />
                     <span className='hidden sm:inline'>База защищена</span>
                  </div>


                  {/* Кнопка добавления клиента */}
                  <button
                     type='button'
                     onClick={handleOpenCreateModal}
                     className='px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-teal-600/20 transition cursor-pointer whitespace-nowrap'
                  >
                     <Plus className='w-4 h-4' />
                     <span>Добавить клиента</span>
                  </button>
               </div>
            </div>

            {/* Быстрые фильтры по категориям */}
            <div className='flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100'>
               <span className='text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1'>
                  <Filter className='w-3.5 h-3.5' /> Категория:
               </span>
               <button
                  type='button'
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                     selectedCategory === 'ALL'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
               >
                  Все ({stats.total})
               </button>

               {MAIN_CATEGORIES.map((catKey) => {
                  const cfg = CATEGORIES_CONFIG[catKey]
                  if (!cfg) return null
                  let count = 0
                  if (catKey === 'WORKING') count = stats.working
                  else if (catKey === 'ORDER_PLACED')
                     count = stats.orderPlaced || 0
                  else if (catKey === 'SKIPPED') count = stats.skipped || 0
                  else if (catKey === 'ON_DEMAND') count = stats.onDemand || 0
                  else if (catKey === 'PRICE_SENT') count = stats.priceSent || 0
                  else if (catKey === 'NO_ANSWER') count = stats.noAnswer || 0
                  else if (catKey === 'WRONG_NUMBER')
                     count = stats.wrongNumber || 0
                  else if (catKey === 'OTHER') count = stats.other || 0
                  else if (catKey === 'DID_NOT_PAY')
                     count = stats.didNotPay || 0
                  else if (catKey === 'REJECTED') count = stats.rejected || 0
                  else if (catKey === 'BLACKLIST') count = stats.blacklist

                  const isSelected = selectedCategory === catKey

                  return (
                     <button
                        key={catKey}
                        type='button'
                        onClick={() => setSelectedCategory(catKey)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                           isSelected
                              ? `${cfg.activeBg} shadow-2xs`
                              : `${cfg.color}`
                        }`}
                     >
                        <span
                           className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : cfg.dot} inline-block`}
                        ></span>
                        <span>
                           {cfg.label} ({count})
                        </span>
                     </button>
                  )
               })}

               {/* Legacy фильтры, если есть клиенты с такими категориями */}
               {(stats.notWorking || 0) > 0 && (
                  <button
                     type='button'
                     onClick={() => setSelectedCategory('NOT_WORKING')}
                     className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        selectedCategory === 'NOT_WORKING'
                           ? 'bg-slate-700 text-white'
                           : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                     }`}
                  >
                     Не работаем ({stats.notWorking})
                  </button>
               )}

               {(stats.stopped || 0) > 0 && (
                  <button
                     type='button'
                     onClick={() => setSelectedCategory('STOPPED')}
                     className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        selectedCategory === 'STOPPED'
                           ? 'bg-amber-600 text-white'
                           : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                     }`}
                  >
                     Перестали ({stats.stopped})
                  </button>
               )}

               <span className='ml-auto text-xs text-slate-400 font-medium'>
                  Найдено:{' '}
                  <strong className='text-slate-700'>{clients.length}</strong>
               </span>
            </div>
         </div>

         {/* 3. Список клиентов */}
         {loading ? (
            <div className='bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400'>
               <div className='w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3'></div>
               <span className='text-sm font-semibold'>
                  Загрузка базы клиентов...
               </span>
            </div>
         ) : clients.length === 0 ? (
            <div className='bg-white rounded-2xl border border-slate-200 p-12 text-center'>
               <Users className='w-12 h-12 text-slate-300 mx-auto mb-3' />
               <h3 className='text-base font-bold text-slate-800'>
                  Клиенты не найдены
               </h3>
               <p className='text-xs text-slate-500 mt-1 max-w-sm mx-auto'>
                  {search ||
                  selectedCity !== 'ALL' ||
                  selectedCategory !== 'ALL'
                     ? 'Попробуйте сбросить фильтры поиска или выбрать другой город.'
                     : 'База клиентов пуста. Вы можете добавить первого клиента с помощью кнопки выше.'}
               </p>
               {(search ||
                  selectedCity !== 'ALL' ||
                  selectedCategory !== 'ALL') && (
                  <button
                     type='button'
                     onClick={() => {
                        setSearch('')
                        setSelectedCity('ALL')
                        setSelectedCategory('ALL')
                     }}
                     className='mt-4 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition cursor-pointer'
                  >
                     Сбросить фильтры
                  </button>
               )}
            </div>
         ) : (
            <div className='bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden'>
               <div className='overflow-x-auto'>
                  <table className='w-full text-left text-xs border-collapse'>
                     <thead>
                        <tr className='bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]'>
                           <th className='py-3.5 px-4 w-[26%]'>
                              Название магазина / Контрагент
                           </th>
                           <th className='py-3.5 px-4 w-[13%]'>Город</th>
                           <th className='py-3.5 px-4 w-[21%]'>
                              Категория / Примечание
                           </th>
                           <th className='py-3.5 px-4 w-[32%]'>
                              Контакты (Телефон / Email)
                           </th>
                           <th className='py-3.5 px-4 text-right w-[8%]'>
                              Действия
                           </th>
                        </tr>
                     </thead>
                     <tbody className='divide-y divide-slate-100 text-slate-700'>
                        {clients.map((client) => {
                           const cfg =
                              CATEGORIES_CONFIG[
                                 client.category as keyof typeof CATEGORIES_CONFIG
                              ] || CATEGORIES_CONFIG.ON_DEMAND
                           const isQuickPhoneOpen =
                              quickPhoneClientId === client.id
                           const isQuickEmailOpen =
                              quickEmailClientId === client.id

                           return (
                              <tr
                                 key={client.id}
                                 className='hover:bg-slate-50/70 transition-colors group'
                              >
                                 {/* Название */}
                                 <td className='py-3.5 px-4 font-bold text-slate-900 text-sm align-top'>
                                    <div className='flex items-start gap-2'>
                                       <span className='leading-snug'>
                                          {client.name}
                                       </span>
                                    </div>
                                 </td>

                                 {/* Город */}
                                 <td className='py-3.5 px-4 align-top'>
                                    <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200'>
                                       <MapPin className='w-3 h-3 text-teal-600' />
                                       <span>{client.city}</span>
                                    </span>
                                 </td>

                                 {/* Категория (интерактивный селектор) + Примечание / Причина с показом при наведении */}
                                 <td className='py-3.5 px-4 align-top'>
                                    <div className='space-y-1.5'>
                                       {/* Селектор категории */}
                                       <div className='relative inline-block'>
                                          <select
                                             value={client.category}
                                             onChange={(e) =>
                                                handleCategorySelectChange(
                                                   client,
                                                   e.target.value
                                                )
                                             }
                                             className={`pl-2.5 pr-7 py-1 rounded-lg text-xs font-bold border transition cursor-pointer appearance-none shadow-2xs ${cfg.color}`}
                                             title={
                                                client.comment
                                                   ? `${cfg.noteLabel || 'Примечание'}: ${client.comment}`
                                                   : undefined
                                             }
                                          >
                                             <option value='WORKING'>
                                                🟢 Работаем
                                             </option>
                                             <option value='ORDER_PLACED'>
                                                🛒 Сделала заявку
                                             </option>
                                             <option value='SKIPPED'>
                                                ⏭️ Пропустила
                                             </option>
                                             <option value='ON_DEMAND'>
                                                🔵 По потребности
                                             </option>
                                             <option value='PRICE_SENT'>
                                                🟣 Скинули прайс
                                             </option>
                                             <option value='NO_ANSWER'>
                                                🟡 Не отвечают
                                             </option>
                                             <option value='WRONG_NUMBER'>
                                                ⚪ Неправильный номер
                                             </option>
                                             <option value='OTHER'>
                                                💬 Другое
                                             </option>
                                             <option value='DID_NOT_PAY'>
                                                🔴 Не оплатила поставку
                                             </option>
                                             <option value='REJECTED'>
                                                🟠 Отказали
                                             </option>
                                             <option value='BLACKLIST'>
                                                ⛔ В ЧС
                                             </option>
                                             {client.category ===
                                                'NOT_WORKING' && (
                                                <option value='NOT_WORKING'>
                                                   ⚪ Не работаем
                                                </option>
                                             )}
                                             {client.category === 'STOPPED' && (
                                                <option value='STOPPED'>
                                                   🟠 Перестали
                                                </option>
                                             )}
                                          </select>
                                          <div className='absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] opacity-60'>
                                             ▼
                                          </div>
                                       </div>

                                       {/* Примечание / Причина (показывается при наведении hover-тултипом) */}
                                       {client.comment ? (
                                          <div
                                             className='group/note relative flex items-center gap-1.5 max-w-[240px] px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100/90 border border-slate-200 text-slate-700 text-[11px] font-medium transition cursor-help shadow-2xs'
                                             title={`${cfg.noteLabel || 'Примечание'}: ${client.comment}`}
                                          >
                                             <MessageSquare className='w-3 h-3 text-slate-400 shrink-0' />
                                             <span className='truncate'>
                                                {client.comment}
                                             </span>

                                             {/* Всплывающая подсказка при наведении (hover tooltip) */}
                                             <div className='pointer-events-none absolute left-0 bottom-full mb-1.5 hidden group-hover/note:flex flex-col z-30 w-64 p-2.5 rounded-xl bg-slate-900 text-white text-xs shadow-2xl border border-slate-800 animate-in fade-in duration-150'>
                                                <span className='font-bold text-[10px] uppercase text-teal-400 mb-0.5 tracking-wider'>
                                                   {cfg.noteLabel ||
                                                      'Примечание'}
                                                </span>
                                                <span className='leading-snug break-words font-normal text-slate-200'>
                                                   {client.comment}
                                                </span>
                                                <div className='absolute left-4 top-full w-2.5 h-2.5 bg-slate-900 rotate-45 -translate-y-1.5'></div>
                                             </div>

                                             {/* Кнопка быстрого изменения примечания */}
                                             <button
                                                type='button'
                                                onClick={(e) => {
                                                   e.stopPropagation()
                                                   handleOpenQuickNoteEditor(
                                                      client
                                                   )
                                                }}
                                                className='ml-auto p-0.5 text-slate-400 hover:text-teal-600 rounded transition cursor-pointer'
                                                title='Редактировать примечание / причину'
                                             >
                                                <Pencil className='w-2.5 h-2.5' />
                                             </button>
                                          </div>
                                       ) : (
                                          cfg.hasNote && (
                                             <button
                                                type='button'
                                                onClick={() =>
                                                   handleOpenQuickNoteEditor(
                                                      client
                                                   )
                                                }
                                                className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-slate-400 hover:text-teal-700 hover:bg-teal-50 border border-dashed border-slate-300 hover:border-teal-300 transition cursor-pointer'
                                                title={`Указать ${cfg.noteLabel?.toLowerCase() || 'примечание'}`}
                                             >
                                                <Plus className='w-2.5 h-2.5' />
                                                <span>
                                                   +{' '}
                                                   {cfg.noteLabel ||
                                                      'Примечание'}
                                                </span>
                                             </button>
                                          )
                                       )}
                                    </div>
                                 </td>

                                 {/* Контакты: Номера телефонов и Адреса Email */}
                                 <td className='py-3.5 px-4 align-top'>
                                    <div className='space-y-1.5'>
                                       {/* Список существующих номеров и email */}
                                       <div className='flex flex-wrap gap-1.5 items-center'>
                                          {/* Номера телефонов */}
                                          {client.phones &&
                                             client.phones.length > 0 &&
                                             client.phones.map(
                                                (phone, pIdx) => {
                                                   const isCopied =
                                                      copiedText === phone
                                                   const cleanDigits =
                                                      phone.replace(
                                                         /[^\d+]/g,
                                                         ''
                                                      )

                                                   return (
                                                      <div
                                                         key={`p-${pIdx}`}
                                                         className='inline-flex items-center gap-1 pl-2 pr-1.5 py-1 rounded-lg bg-teal-50/70 border border-teal-200 text-teal-950 text-xs font-semibold group/phone hover:bg-teal-100/70 transition shadow-2xs'
                                                      >
                                                         <a
                                                            href={`tel:${cleanDigits}`}
                                                            className='flex items-center gap-1 hover:text-teal-700 hover:underline'
                                                            title='Позвонить'
                                                         >
                                                            <Phone className='w-3 h-3 text-teal-600 shrink-0' />
                                                            <span>{phone}</span>
                                                         </a>

                                                         {/* Скопировать */}
                                                         <button
                                                            type='button'
                                                            onClick={(e) =>
                                                               handleCopyText(
                                                                  phone,
                                                                  'phone',
                                                                  e
                                                               )
                                                            }
                                                            className='p-1 text-slate-400 hover:text-teal-700 rounded transition cursor-pointer'
                                                            title='Скопировать номер'
                                                         >
                                                            {isCopied ? (
                                                               <Check className='w-3 h-3 text-emerald-600' />
                                                            ) : (
                                                               <Copy className='w-3 h-3' />
                                                            )}
                                                         </button>

                                                         {/* Удалить конкретный номер */}
                                                         <button
                                                            type='button'
                                                            onClick={(e) =>
                                                               handleDeletePhone(
                                                                  client.id,
                                                                  phone,
                                                                  e
                                                               )
                                                            }
                                                            className='p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer'
                                                            title='Удалить этот номер'
                                                         >
                                                            <X className='w-3 h-3' />
                                                         </button>
                                                      </div>
                                                   )
                                                }
                                             )}

                                          {/* Адреса Email */}
                                          {client.emails &&
                                             client.emails.length > 0 &&
                                             client.emails.map(
                                                (email, eIdx) => {
                                                   const isCopied =
                                                      copiedText === email

                                                   return (
                                                      <div
                                                         key={`e-${eIdx}`}
                                                         className='inline-flex items-center gap-1 pl-2 pr-1.5 py-1 rounded-lg bg-sky-50/80 border border-sky-200 text-sky-950 text-xs font-semibold group/email hover:bg-sky-100/80 transition shadow-2xs'
                                                      >
                                                         <a
                                                            href={`mailto:${email}`}
                                                            className='flex items-center gap-1 hover:text-sky-700 hover:underline'
                                                            title='Отправить письмо на почту'
                                                         >
                                                            <Mail className='w-3 h-3 text-sky-600 shrink-0' />
                                                            <span>{email}</span>
                                                         </a>

                                                         {/* Скопировать */}
                                                         <button
                                                            type='button'
                                                            onClick={(e) =>
                                                               handleCopyText(
                                                                  email,
                                                                  'email',
                                                                  e
                                                               )
                                                            }
                                                            className='p-1 text-slate-400 hover:text-sky-700 rounded transition cursor-pointer'
                                                            title='Скопировать email'
                                                         >
                                                            {isCopied ? (
                                                               <Check className='w-3 h-3 text-emerald-600' />
                                                            ) : (
                                                               <Copy className='w-3 h-3' />
                                                            )}
                                                         </button>

                                                         {/* Удалить конкретный email */}
                                                         <button
                                                            type='button'
                                                            onClick={(e) =>
                                                               handleDeleteEmail(
                                                                  client.id,
                                                                  email,
                                                                  e
                                                               )
                                                            }
                                                            className='p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer'
                                                            title='Удалить этот email'
                                                         >
                                                            <X className='w-3 h-3' />
                                                         </button>
                                                      </div>
                                                   )
                                                }
                                             )}

                                          {(!client.phones ||
                                             client.phones.length === 0) &&
                                             (!client.emails ||
                                                client.emails.length === 0) && (
                                                <span className='text-slate-400 italic text-[11px]'>
                                                   Контакты не указаны
                                                </span>
                                             )}

                                          {/* Кнопки быстрого добавления телефона и email */}
                                          {!isQuickPhoneOpen &&
                                             !isQuickEmailOpen && (
                                                <div className='inline-flex items-center gap-1'>
                                                   <button
                                                      type='button'
                                                      onClick={() => {
                                                         setQuickPhoneClientId(
                                                            client.id
                                                         )
                                                         setQuickPhoneValue('')
                                                         setQuickEmailClientId(
                                                            null
                                                         )
                                                      }}
                                                      className='inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 border border-dashed border-slate-300 hover:border-teal-300 text-xs font-medium transition cursor-pointer'
                                                      title='Добавить номер телефона'
                                                   >
                                                      <Plus className='w-3 h-3' />
                                                      <span>+ Телефон</span>
                                                   </button>
                                                   <button
                                                      type='button'
                                                      onClick={() => {
                                                         setQuickEmailClientId(
                                                            client.id
                                                         )
                                                         setQuickEmailValue('')
                                                         setQuickPhoneClientId(
                                                            null
                                                         )
                                                      }}
                                                      className='inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-600 border border-dashed border-slate-300 hover:border-sky-300 text-xs font-medium transition cursor-pointer'
                                                      title='Добавить электронную почту'
                                                   >
                                                      <Plus className='w-3 h-3' />
                                                      <span>+ Email</span>
                                                   </button>
                                                </div>
                                             )}
                                       </div>

                                       {/* Инлайн форма быстрого добавления телефона */}
                                       {isQuickPhoneOpen && (
                                          <div className='flex items-center gap-1.5 animate-in fade-in duration-150'>
                                             <input
                                                type='text'
                                                autoFocus
                                                value={quickPhoneValue}
                                                onChange={(e) =>
                                                   setQuickPhoneValue(
                                                      e.target.value
                                                   )
                                                }
                                                onKeyDown={(e) => {
                                                   if (e.key === 'Enter')
                                                      handleAddQuickPhone(
                                                         client.id
                                                      )
                                                   if (e.key === 'Escape')
                                                      setQuickPhoneClientId(
                                                         null
                                                      )
                                                }}
                                                placeholder='+7 (___) ___-__-__'
                                                className='px-2.5 py-1 text-xs bg-white border border-teal-400 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 w-44 shadow-inner'
                                             />
                                             <button
                                                type='button'
                                                disabled={
                                                   isAddingQuickPhone ||
                                                   !quickPhoneValue.trim()
                                                }
                                                onClick={() =>
                                                   handleAddQuickPhone(
                                                      client.id
                                                   )
                                                }
                                                className='px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-2xs'
                                             >
                                                {isAddingQuickPhone
                                                   ? '...'
                                                   : 'Сохранить'}
                                             </button>
                                             <button
                                                type='button'
                                                onClick={() =>
                                                   setQuickPhoneClientId(null)
                                                }
                                                className='p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer'
                                             >
                                                <X className='w-3.5 h-3.5' />
                                             </button>
                                          </div>
                                       )}

                                       {/* Инлайн форма быстрого добавления email */}
                                       {isQuickEmailOpen && (
                                          <div className='flex items-center gap-1.5 animate-in fade-in duration-150'>
                                             <input
                                                type='email'
                                                autoFocus
                                                value={quickEmailValue}
                                                onChange={(e) =>
                                                   setQuickEmailValue(
                                                      e.target.value
                                                   )
                                                }
                                                onKeyDown={(e) => {
                                                   if (e.key === 'Enter')
                                                      handleAddQuickEmail(
                                                         client.id
                                                      )
                                                   if (e.key === 'Escape')
                                                      setQuickEmailClientId(
                                                         null
                                                      )
                                                }}
                                                placeholder='zakaz@company.ru'
                                                className='px-2.5 py-1 text-xs bg-white border border-sky-400 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 w-48 shadow-inner'
                                             />
                                             <button
                                                type='button'
                                                disabled={
                                                   isAddingQuickEmail ||
                                                   !quickEmailValue.trim()
                                                }
                                                onClick={() =>
                                                   handleAddQuickEmail(
                                                      client.id
                                                   )
                                                }
                                                className='px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-2xs'
                                             >
                                                {isAddingQuickEmail
                                                   ? '...'
                                                   : 'Сохранить'}
                                             </button>
                                             <button
                                                type='button'
                                                onClick={() =>
                                                   setQuickEmailClientId(null)
                                                }
                                                className='p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer'
                                             >
                                                <X className='w-3.5 h-3.5' />
                                             </button>
                                          </div>
                                       )}
                                    </div>
                                 </td>

                                 {/* Действия */}
                                 <td className='py-3.5 px-4 text-right align-top'>
                                    <div className='flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition'>
                                       <button
                                          type='button'
                                          onClick={() =>
                                             handleOpenEditModal(client)
                                          }
                                          className='p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition cursor-pointer'
                                          title='Редактировать клиента'
                                       >
                                          <Pencil className='w-4 h-4' />
                                       </button>
                                       <button
                                          type='button'
                                          onClick={() =>
                                             handleDeleteClient(client)
                                          }
                                          className='p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer'
                                          title='Удалить клиента'
                                       >
                                          <Trash2 className='w-4 h-4' />
                                       </button>
                                    </div>
                                 </td>
                              </tr>
                           )
                        })}
                     </tbody>
                  </table>
               </div>

               {/* Футер таблицы */}
               <div className='p-3 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium'>
                  <span>Показано клиентов: {clients.length}</span>
                  <span>Всего в базе: {stats.total}</span>
               </div>
            </div>
         )}
            </div>
         )}

         {/* 2. РЕЖИМ: РАБОЧЕЕ МЕСТО ОБЗВОНА («Проваливание в работу») */}
         {activeViewMode === 'workspace' && (
            <div className='space-y-6 animate-in fade-in duration-200'>
               {/* Шапка рабочего места */}
               <div className='bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4'>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                     <div className='flex items-center gap-3'>
                        <button
                           type='button'
                           onClick={() => setActiveViewMode('registry')}
                           className='px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer'
                           title='Свернуть работу и открыть реестр'
                        >
                           <ChevronLeft className='w-4 h-4' />
                           <span>В реестр (свернуть)</span>
                        </button>

                        <div className='h-6 w-px bg-slate-200 hidden sm:block' />

                        <div className='flex items-center gap-2'>
                           <span className='flex h-3 w-3 relative'>
                              <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
                              <span className='relative inline-flex rounded-full h-3 w-3 bg-emerald-500'></span>
                           </span>
                           <div>
                              <div className='flex items-center gap-2'>
                                 <h2 className='text-lg font-black text-slate-900'>
                                    Обзвон: г. {sessionCity || 'Город не выбран'}
                                 </h2>
                                 {sessionClients.length > 0 && !isSessionFinished && (
                                    <span className='px-2.5 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-extrabold'>
                                       Клиент {currentCallIndex + 1} из {sessionClients.length}
                                    </span>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className='flex items-center gap-2'>
                        <button
                           type='button'
                           onClick={() => {
                              setActiveViewMode('supervisor')
                              fetchDailyStats()
                           }}
                           className='px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer'
                        >
                           <BarChart3 className='w-4 h-4' />
                           <span>Метрики дня</span>
                        </button>

                        <button
                           type='button'
                           onClick={() => {
                              setActiveViewMode('registry')
                              setIsDockCollapsed(false)
                           }}
                           className='px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer'
                           title='Свернуть в мини-панель'
                        >
                           <Minimize2 className='w-4 h-4' />
                           <span className='hidden sm:inline'>В мини-панель</span>
                        </button>

                        <button
                           type='button'
                           onClick={handleCloseSession}
                           className='px-3.5 py-2 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer'
                        >
                           <X className='w-4 h-4' />
                           <span>Завершить</span>
                        </button>
                     </div>
                  </div>

                  {/* Прогресс-бар и счетчики сессии */}
                  {sessionClients.length > 0 && (
                     <div className='space-y-2 pt-2 border-t border-slate-100'>
                        <div className='flex items-center justify-between text-xs'>
                           <span className='text-slate-500 font-medium'>
                              Прогресс обзвона очереди:
                           </span>
                           <span className='font-extrabold text-slate-800'>
                              {isSessionFinished
                                 ? '100% выполнено (обзвон завершен)'
                                 : `${Math.round(
                                      (currentCallIndex /
                                         Math.max(1, sessionClients.length)) *
                                         100
                                   )}% выполнено`}
                           </span>
                        </div>
                        <div className='w-full h-2.5 bg-slate-100 rounded-full overflow-hidden'>
                           <div
                              className='h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 rounded-full'
                              style={{
                                 width: `${
                                    isSessionFinished
                                       ? 100
                                       : Math.round(
                                            (currentCallIndex /
                                               Math.max(
                                                  1,
                                                  sessionClients.length
                                               )) *
                                               100
                                         )
                                 }%`,
                              }}
                           />
                        </div>

                        {/* Чипсы статистики текущей сессии */}
                        <div className='flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold'>
                           <span className='px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1'>
                              <ShoppingBag className='w-3 h-3 text-teal-600' />
                              Заявки: {sessionStats.orderPlaced}
                           </span>
                           <span className='px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1'>
                              <Clock4 className='w-3 h-3 text-amber-600' />
                              Перезвоны: {sessionStats.callback}
                           </span>
                           <span className='px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1'>
                              <PhoneMissed className='w-3 h-3 text-slate-500' />
                              Не ответили: {sessionStats.noAnswer}
                           </span>
                           <span className='px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1'>
                              <Store className='w-3 h-3 text-rose-600' />
                              Закрылись/Перестали: {sessionStats.closed + sessionStats.stopped}
                           </span>
                           {activeCallbacks.dueNow.length > 0 && (
                              <button
                                 type='button'
                                 onClick={() => setIsWaitingCallbacksModalOpen(true)}
                                 className='px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold flex items-center gap-1 animate-pulse ml-auto cursor-pointer shadow-xs'
                                 title='Открыть список клиентов, ожидающих звонка'
                              >
                                 <Flame className='w-3 h-3 text-yellow-200' />
                                 Ждут звонка сейчас: {activeCallbacks.dueNow.length}
                              </button>
                           )}
                        </div>
                     </div>
                  )}
               </div>

               {/* Основная рабочая область: 2 колонки (Очередь слева + Карточка клиента справа) */}
               {sessionClients.length === 0 ? (
                  <div className='bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm'>
                     <Building2 className='w-12 h-12 text-slate-300 mx-auto mb-3' />
                     <h3 className='text-lg font-black text-slate-900'>
                        Очередь обзвона не сформирована
                     </h3>
                     <p className='text-xs text-slate-500 mt-1 mb-6'>
                        Выберите город, чтобы получить активных клиентов для последовательного обзвона.
                     </p>
                     <button
                        type='button'
                        onClick={() => setIsCitySelectModalOpen(true)}
                        className='px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition cursor-pointer'
                     >
                        Выбрать город обзвона
                     </button>
                  </div>
               ) : isSessionFinished ? (
                  /* Карточка завершения обзвона */
                  <div className='bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-lg space-y-6'>
                     <div className='w-20 h-20 rounded-3xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shadow-inner'>
                        <Sparkles className='w-10 h-10' />
                     </div>
                     <div>
                        <h2 className='text-2xl font-black text-slate-900'>
                           🎉 Первичный круг обзвона г. {sessionCity} завершён!
                        </h2>
                        <p className='text-sm text-slate-600 mt-2 font-medium leading-relaxed'>
                           Обработано: <strong className='text-slate-900'>{sessionClients.length} из {sessionClients.length}</strong> клиентов (100%).
                           <br />
                           <span className='text-slate-500 text-xs'>
                              Прямо сейчас доступных для звонка клиентов в этом городе нет. Если назначен перезвон, система уведомит в назначенное время.
                           </span>
                        </p>
                     </div>

                     <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 text-left'>
                        <div className='p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200'>
                           <div className='text-xs font-bold text-teal-800 uppercase'>Заявки</div>
                           <div className='text-2xl font-black text-teal-900 mt-0.5'>{sessionStats.orderPlaced}</div>
                        </div>
                        <div className='p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200'>
                           <div className='text-xs font-bold text-amber-800 uppercase'>Перезвоны</div>
                           <div className='text-2xl font-black text-amber-900 mt-0.5'>{sessionStats.callback}</div>
                        </div>
                        <div className='p-3.5 rounded-2xl bg-slate-50 border border-slate-200'>
                           <div className='text-xs font-bold text-slate-600 uppercase'>Не ответили</div>
                           <div className='text-2xl font-black text-slate-800 mt-0.5'>{sessionStats.noAnswer}</div>
                        </div>
                        <div className='p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200'>
                           <div className='text-xs font-bold text-rose-800 uppercase'>Закрылись</div>
                           <div className='text-2xl font-black text-rose-900 mt-0.5'>{sessionStats.closed + sessionStats.stopped}</div>
                        </div>
                     </div>

                     <div className='flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100'>
                        <button
                           type='button'
                           onClick={() => setIsCitySelectModalOpen(true)}
                           className='px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-teal-600/25 transition cursor-pointer flex items-center gap-2'
                        >
                           <span>🏙️ Выбрать следующий город</span>
                        </button>
                        <button
                           type='button'
                           onClick={handleFinishAndExitSession}
                           className='px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs sm:text-sm transition cursor-pointer flex items-center gap-2'
                        >
                           <span>📋 Завершить работу и выйти в реестр</span>
                        </button>
                     </div>
                  </div>
               ) : (
                  <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
                     {/* Левая колонка: Очередь клиентов (Queue) */}
                     <div className='lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col max-h-[820px]'>
                        <div className='flex items-center justify-between pb-3 border-b border-slate-100 shrink-0 mb-3'>
                           <div className='flex items-center gap-2'>
                              <Users className='w-4 h-4 text-slate-500' />
                              <span className='font-black text-xs text-slate-800 uppercase tracking-wide'>
                                 Очередь обзвона ({sessionClients.length})
                              </span>
                           </div>
                           <span className='text-[11px] text-slate-400 font-bold'>
                              #{currentCallIndex + 1}
                           </span>
                        </div>

                        {/* Поиск внутри очереди */}
                        <div className='relative mb-3 shrink-0'>
                           <Search className='w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
                           <input
                              type='text'
                              value={workspaceQueueSearch}
                              onChange={(e) => setWorkspaceQueueSearch(e.target.value)}
                              placeholder='Поиск в очереди...'
                              className='w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500'
                           />
                        </div>

                        {/* Скроллируемый список клиентов очереди */}
                        <div className='overflow-y-auto space-y-2 pr-1 flex-1'>
                           {sessionClients
                              .filter((c) =>
                                 c.name.toLowerCase().includes(workspaceQueueSearch.toLowerCase()) ||
                                 (c.phones && c.phones.some((p) => p.includes(workspaceQueueSearch)))
                              )
                              .map((client, idx) => {
                                 const realIdx = sessionClients.findIndex((sc) => sc.id === client.id);
                                 const isCurrent = realIdx === currentCallIndex;
                                 const isPassed = realIdx < currentCallIndex;
                                 const catConfig = CATEGORIES_CONFIG[client.category] || CATEGORIES_CONFIG.ON_DEMAND;

                                 return (
                                    <div
                                       key={client.id}
                                       onClick={() => {
                                          setCurrentCallIndex(realIdx);
                                          setSelectedCallAction(null);
                                          setCallActionNote('');
                                       }}
                                       className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                                          isCurrent
                                             ? 'bg-teal-50/90 border-teal-500 ring-2 ring-teal-500 shadow-xs'
                                             : isPassed
                                             ? 'bg-slate-50/70 border-slate-200 opacity-60 hover:opacity-100 hover:bg-slate-100'
                                             : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                       }`}
                                    >
                                       <div className='min-w-0 flex-1'>
                                          <div className='flex items-center gap-1.5 mb-0.5'>
                                             <span
                                                className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                                                   isCurrent
                                                      ? 'bg-teal-600 text-white'
                                                      : 'bg-slate-200 text-slate-700'
                                                }`}
                                             >
                                                #{realIdx + 1}
                                             </span>
                                             <span className='font-bold text-xs text-slate-900 truncate block'>
                                                {client.name}
                                             </span>
                                          </div>

                                          <div className='flex items-center gap-2 text-[10px] text-slate-500'>
                                             <span className='truncate'>{client.city}</span>
                                             {client.phones?.[0] && (
                                                <span className='font-mono font-semibold text-slate-600 truncate'>
                                                   {client.phones[0]}
                                                </span>
                                             )}
                                          </div>

                                          {/* Бейдж перезвона в строке очереди */}
                                          {client.callbackAt && (
                                             <div className='mt-1 flex items-center justify-between gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200'>
                                                <div className='flex items-center gap-1 truncate'>
                                                   <Clock4 className='w-3 h-3 text-amber-600 shrink-0' />
                                                   <span>
                                                      {new Date(client.callbackAt).toLocaleTimeString([], {
                                                         hour: '2-digit',
                                                         minute: '2-digit',
                                                      })}
                                                   </span>
                                                   {client.callbackNote && (
                                                      <span className='truncate opacity-75 font-normal'>
                                                         - {client.callbackNote}
                                                      </span>
                                                   )}
                                                </div>
                                                <button
                                                   type='button'
                                                   onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleClearCallback(client.id);
                                                   }}
                                                   className='text-slate-400 hover:text-rose-600 font-bold px-1 rounded transition cursor-pointer shrink-0'
                                                   title='Снять напоминание о звонке'
                                                >
                                                   ✕
                                                </button>
                                             </div>
                                          )}
                                       </div>

                                       <div className='flex items-center gap-1 shrink-0'>
                                          {client.phones?.[0] && (
                                             <a
                                                href={`tel:${client.phones[0].replace(/[^\d+]/g, '')}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className='p-2 rounded-xl bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-600 transition cursor-pointer'
                                                title='Быстрый вызов'
                                             >
                                                <Phone className='w-3.5 h-3.5' />
                                             </a>
                                          )}
                                          <span
                                             className={`w-2 h-2 rounded-full ${catConfig.dot}`}
                                             title={catConfig.label}
                                          />
                                       </div>
                                    </div>
                                 );
                              })}
                        </div>
                     </div>

                     {/* Правая колонка: Карточка текущего клиента & Кнопки действий */}
                     {(() => {
                        const currentClient = sessionClients[currentCallIndex];
                        if (!currentClient) return null;
                        const catMeta = CATEGORIES_CONFIG[currentClient.category] || CATEGORIES_CONFIG.ON_DEMAND;

                        return (
                           <div className='lg:col-span-8 space-y-5'>
                              {/* Основная карточка клиента */}
                              <div className='bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6'>
                                 {/* Заголовок карточки */}
                                 <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-slate-100'>
                                    <div>
                                       <div className='flex items-center gap-2.5 flex-wrap'>
                                          <h1 className='text-2xl font-black text-slate-900 tracking-tight'>
                                             {currentClient.name}
                                          </h1>
                                          <button
                                             type='button'
                                             onClick={() => handleCopy(currentClient.name, 'name')}
                                             className='text-slate-400 hover:text-slate-600 transition cursor-pointer p-1'
                                             title='Скопировать название'
                                          >
                                             {copiedText === 'name' ? (
                                                <Check className='w-4 h-4 text-emerald-600' />
                                             ) : (
                                                <Copy className='w-4 h-4' />
                                             )}
                                          </button>
                                       </div>
                                       <div className='flex items-center gap-2 mt-1 text-xs text-slate-500'>
                                          <MapPin className='w-3.5 h-3.5 text-slate-400' />
                                          <span className='font-bold text-slate-700'>{currentClient.city}</span>
                                          <span>•</span>
                                          <span>Клиент #{currentCallIndex + 1} из {sessionClients.length}</span>
                                       </div>
                                    </div>

                                    <div className='flex items-center gap-2 shrink-0'>
                                       <span
                                          className={`px-3 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 ${catMeta.badge}`}
                                       >
                                          <span className={`w-2 h-2 rounded-full ${catMeta.dot}`} />
                                          <span>{catMeta.label}</span>
                                       </span>
                                       <button
                                          type='button'
                                          onClick={() => handleOpenEditModal(currentClient)}
                                          className='p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer'
                                          title='Редактировать клиента'
                                       >
                                          <Pencil className='w-4 h-4' />
                                       </button>
                                    </div>
                                 </div>

                                 {/* Баннер запланированного перезвона (если есть) */}
                                 {currentClient.callbackAt && (
                                    <div className='bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse-subtle'>
                                       <div className='flex items-start gap-3 flex-1'>
                                          <div className='w-9 h-9 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center shrink-0 mt-0.5 font-bold'>
                                             <Clock4 className='w-5 h-5 text-amber-700' />
                                          </div>
                                          <div>
                                             <div className='flex items-center gap-2'>
                                                <span className='font-extrabold text-xs text-amber-950 uppercase tracking-wide'>
                                                   ⏰ Запланирован перезвон
                                                </span>
                                                <span className='text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md'>
                                                   {new Date(currentClient.callbackAt).toLocaleString('ru-RU', {
                                                      day: 'numeric',
                                                      month: 'short',
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                   })}
                                                </span>
                                             </div>
                                             {currentClient.callbackSource && (
                                                <div className='text-[11px] font-semibold text-amber-800 mt-0.5'>
                                                   Источник: {currentClient.callbackSource === 'MEETING' ? '🤝 Личная встреча (вживую)' : '📞 Телефонный звонок'}
                                                </div>
                                             )}
                                             {currentClient.callbackNote && (
                                                <div className='text-xs text-amber-900 mt-1 italic bg-amber-100/60 p-2 rounded-xl border border-amber-200/60'>
                                                   «{currentClient.callbackNote}»
                                                </div>
                                             )}
                                          </div>
                                       </div>

                                       <button
                                          type='button'
                                          onClick={() => handleClearCallback(currentClient.id)}
                                          className='px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition flex items-center gap-1.5 shrink-0 cursor-pointer'
                                          title='Снять напоминание о звонке (клиенту уже перезвонили)'
                                       >
                                          <CheckCircle2 className='w-4 h-4' />
                                          <span>Перезвонил (снять напоминание)</span>
                                       </button>
                                    </div>
                                 )}

                                 {/* Блок телефонов клиента — Крупные кнопки для быстрого вызова */}
                                 <div className='space-y-3'>
                                    <div className='text-xs font-bold text-slate-400 uppercase tracking-wider'>
                                       Телефоны для связи ({currentClient.phones?.length || 0})
                                    </div>

                                    {currentClient.phones && currentClient.phones.length > 0 ? (
                                       <div className='space-y-2'>
                                          {currentClient.phones.map((phone, pIdx) => (
                                             <div
                                                key={pIdx}
                                                className='p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 hover:bg-slate-50 transition'
                                             >
                                                <div className='flex items-center gap-3'>
                                                   <div className='w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center font-bold shrink-0'>
                                                      <Phone className='w-5 h-5 text-emerald-700' />
                                                   </div>
                                                   <div>
                                                      <div className='font-mono font-black text-lg text-slate-900 tracking-tight'>
                                                         {phone}
                                                      </div>
                                                      <span className='text-[10px] text-slate-500 font-semibold'>
                                                         Номер #{pIdx + 1}
                                                      </span>
                                                   </div>
                                                </div>

                                                <div className='flex items-center gap-2'>
                                                   <button
                                                      type='button'
                                                      onClick={() => handleCopy(phone, `phone-${pIdx}`)}
                                                      className='p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer'
                                                      title='Скопировать номер'
                                                   >
                                                      {copiedText === `phone-${pIdx}` ? (
                                                         <Check className='w-4 h-4 text-emerald-600' />
                                                      ) : (
                                                         <Copy className='w-4 h-4' />
                                                      )}
                                                   </button>

                                                   <a
                                                      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                                                      className='px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/25 transition flex items-center gap-2 cursor-pointer'
                                                   >
                                                      <PhoneCall className='w-4 h-4 fill-white' />
                                                      <span>Позвонить</span>
                                                   </a>

                                                   {currentClient.phones.length > 1 && (
                                                      <button
                                                         type='button'
                                                         onClick={(e) => handleDeletePhone(currentClient.id, phone, e)}
                                                         className='p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer'
                                                         title='Удалить номер'
                                                      >
                                                         <Trash2 className='w-4 h-4' />
                                                      </button>
                                                   )}
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                    ) : (
                                       <div className='p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold'>
                                          У клиента нет сохраненных номеров телефона. Добавьте номер ниже:
                                       </div>
                                    )}

                                    {/* Быстрое добавление нового номера прямо в карточке */}
                                    <div className='flex items-center gap-2 pt-1'>
                                       <input
                                          type='text'
                                          value={sessionQuickPhoneValue}
                                          onChange={(e) => setSessionQuickPhoneValue(e.target.value)}
                                          onKeyDown={(e) => {
                                             if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddSessionPhone();
                                             }
                                          }}
                                          placeholder='+7 (___) ___-__-__'
                                          className='flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500'
                                       />
                                       <button
                                          type='button'
                                          disabled={!sessionQuickPhoneValue.trim() || isAddingSessionQuickPhone}
                                          onClick={handleAddSessionPhone}
                                          className='px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5'
                                       >
                                          <Plus className='w-3.5 h-3.5' />
                                          <span>Добавить номер</span>
                                       </button>
                                    </div>
                                 </div>

                                 {/* Примечание и история звонков */}
                                 {currentClient.comment && (
                                    <div className='p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1'>
                                       <div className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>
                                          Примечание / Комментарий
                                       </div>
                                       <p className='text-xs text-slate-800 font-medium whitespace-pre-wrap'>
                                          {currentClient.comment}
                                       </p>
                                    </div>
                                 )}

                                 <div className='flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100'>
                                    <span>
                                       {currentClient.lastCalledBy
                                          ? `Последний звонок: ${currentClient.lastCalledBy} (${new Date(
                                               currentClient.lastCalledAt || ''
                                            ).toLocaleDateString('ru-RU')})`
                                          : 'Ранее не обзванивался'}
                                    </span>
                                 </div>
                              </div>

                              {/* СЕТКА КНОПОК РЕЗУЛЬТАТОВ ОБЗВОНА (9 ДЕЙСТВИЙ) */}
                              <div className='bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4'>
                                 <div className='flex items-center justify-between'>
                                    <span className='font-black text-xs text-slate-900 uppercase tracking-wider'>
                                       Зафиксировать результат звонка:
                                    </span>
                                    <span className='text-[11px] text-slate-400 font-semibold'>
                                       Действие автоматически переключит на следующего
                                    </span>
                                 </div>

                                 {/* Основные 9 действий */}
                                 <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3'>
                                    {/* 1. Сделала заявку */}
                                    <button
                                       type='button'
                                       disabled={isSavingCallAction}
                                       onClick={() => handleCallAction('ORDER_PLACED')}
                                       className='p-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-sm shadow-md shadow-teal-600/25 transition cursor-pointer flex items-center justify-between'
                                    >
                                       <div className='flex items-center gap-2.5'>
                                          <ShoppingBag className='w-5 h-5 fill-white' />
                                          <span>Сделала заявку</span>
                                       </div>
                                       <span className='text-xs bg-white/20 px-2 py-0.5 rounded-lg'>🎉</span>
                                    </button>

                                    {/* 2. Перезвонить */}
                                    <button
                                       type='button'
                                       disabled={isSavingCallAction}
                                       onClick={() => handleOpenCallbackModal(currentClient)}
                                       className='p-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md shadow-amber-500/25 transition cursor-pointer flex items-center justify-between'
                                    >
                                       <div className='flex items-center gap-2.5'>
                                          <Clock4 className='w-5 h-5 fill-white/20' />
                                          <span>Перезвонить</span>
                                       </div>
                                       <span className='text-xs bg-white/20 px-2 py-0.5 rounded-lg'>+30м/время</span>
                                    </button>

                                    {/* 3. Не ответили */}
                                    <button
                                       type='button'
                                       disabled={isSavingCallAction}
                                       onClick={() => handleCallAction('NO_ANSWER')}
                                       className='p-4 rounded-2xl bg-slate-100 hover:bg-amber-50 hover:text-amber-900 border border-slate-200 text-slate-800 font-bold text-sm transition cursor-pointer flex items-center justify-between'
                                    >
                                       <div className='flex items-center gap-2.5'>
                                          <PhoneMissed className='w-5 h-5 text-amber-600' />
                                          <span>Не ответили</span>
                                       </div>
                                       <span className='text-[10px] opacity-60'>Гудки / сброс</span>
                                    </button>

                                    {/* 4. Пропустить */}
                                    <button
                                       type='button'
                                       disabled={isSavingCallAction}
                                       onClick={() => advanceToNextClient()}
                                       className='p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-sm transition cursor-pointer flex items-center justify-between'
                                    >
                                       <div className='flex items-center gap-2.5'>
                                          <SkipForward className='w-5 h-5 text-slate-500' />
                                          <span>Пропустить</span>
                                       </div>
                                       <span className='text-[10px] opacity-60'>Без отметки</span>
                                    </button>

                                    {/* 5. Другое */}
                                    <button
                                       type='button'
                                       disabled={isSavingCallAction}
                                       onClick={() => {
                                          const note = prompt('Укажите примечание к звонку:');
                                          if (note !== null) handleCallAction('OTHER', note);
                                       }}
                                       className='p-4 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 font-bold text-sm transition cursor-pointer flex items-center justify-between'
                                    >
                                       <div className='flex items-center gap-2.5'>
                                          <MessageSquare className='w-5 h-5 text-purple-600' />
                                          <span>Другое</span>
                                       </div>
                                       <span className='text-[10px] opacity-60'>С примечанием</span>
                                    </button>

                                    {/* 6. Не оплатила поставку */}
                                    <button
                                       type='button'
                                       disabled={isSavingCallAction}
                                       onClick={() => handleCallAction('DID_NOT_PAY')}
                                       className='p-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 font-bold text-sm transition cursor-pointer flex items-center justify-between'
                                    >
                                       <div className='flex items-center gap-2.5'>
                                          <AlertTriangle className='w-5 h-5 text-rose-600' />
                                          <span>Не оплатила</span>
                                       </div>
                                       <span className='text-[10px] opacity-60'>Долг</span>
                                    </button>

                                    {/* 7. Закрылись (Исключить) */}
                                    <button
                                       type='button'
                                       disabled={isSavingCallAction}
                                       onClick={() => {
                                          if (confirm(`Отметить клиента "${currentClient.name}" как ЗАКРЫЛИСЬ? Он будет навсегда исключен из очереди обзвона.`)) {
                                             handleCallAction('CLOSED');
                                          }
                                       }}
                                       className='p-4 rounded-2xl bg-rose-900 hover:bg-rose-950 text-white font-extrabold text-sm transition cursor-pointer flex items-center justify-between shadow-xs'
                                    >
                                       <div className='flex items-center gap-2.5'>
                                          <Store className='w-5 h-5 text-rose-300' />
                                          <span>Закрылись</span>
                                       </div>
                                       <span className='text-[10px] text-rose-300'>Исключить</span>
                                    </button>

                                    {/* 8. Перестали работать (Исключить) */}
                                    <button
                                       type='button'
                                       disabled={isSavingCallAction}
                                       onClick={() => {
                                          if (confirm(`Отметить клиента "${currentClient.name}" как ПЕРЕСТАЛИ РАБОТАТЬ? Он будет исключен из очереди обзвона.`)) {
                                             handleCallAction('STOPPED');
                                          }
                                       }}
                                       className='p-4 rounded-2xl bg-zinc-800 hover:bg-zinc-900 text-white font-extrabold text-sm transition cursor-pointer flex items-center justify-between shadow-xs'
                                    >
                                       <div className='flex items-center gap-2.5'>
                                          <UserX className='w-5 h-5 text-zinc-400' />
                                          <span>Перестали</span>
                                       </div>
                                       <span className='text-[10px] text-zinc-400'>Исключить</span>
                                    </button>

                                    {/* 9. Сами звонят (Исключить) */}
                                    <button
                                       type='button'
                                       disabled={isSavingCallAction}
                                       onClick={() => handleCallAction('CALL_THEMSELVES')}
                                       className='p-4 rounded-2xl bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-950 font-bold text-sm transition cursor-pointer flex items-center justify-between'
                                    >
                                       <div className='flex items-center gap-2.5'>
                                          <PhoneIncoming className='w-5 h-5 text-cyan-700' />
                                          <span>Сами звонят</span>
                                       </div>
                                       <span className='text-[10px] opacity-60'>Не звонить</span>
                                    </button>
                                 </div>

                                 {/* Навигация: Предыдущий / Следующий клиент */}
                                 <div className='flex items-center justify-between pt-4 border-t border-slate-100'>
                                    <button
                                       type='button'
                                       disabled={currentCallIndex === 0}
                                       onClick={handlePrevCall}
                                       className='px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition disabled:opacity-40 flex items-center gap-1.5 cursor-pointer'
                                    >
                                       <ChevronLeft className='w-4 h-4' />
                                       <span>Предыдущий</span>
                                    </button>

                                    <button
                                       type='button'
                                       onClick={advanceToNextClient}
                                       className='px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs'
                                    >
                                       <span>Следующий клиент</span>
                                       <ChevronRight className='w-4 h-4' />
                                    </button>
                                 </div>
                              </div>
                           </div>
                        );
                     })()}
                  </div>
               )}
            </div>
         )}

         {/* 3. РЕЖИМ: ПАНЕЛЬ КОНТРОЛЯ РУКОВОДИТЕЛЯ & АНТИФРОД */}
         {activeViewMode === 'supervisor' && (
            <div className='space-y-6 animate-in fade-in duration-200'>
               {/* Панель фильтров руководителя */}
               <div className='bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4'>
                  <div className='flex items-center gap-3'>
                     <button
                        type='button'
                        onClick={() => setActiveViewMode('registry')}
                        className='px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer'
                     >
                        <ChevronLeft className='w-4 h-4' />
                        <span>В реестр</span>
                     </button>

                     <div className='h-6 w-px bg-slate-200 hidden sm:block' />

                     <div>
                        <h2 className='text-lg font-black text-slate-900 flex items-center gap-2'>
                           <BarChart3 className='w-5 h-5 text-indigo-600' />
                           <span>Контроль обзвона & Антифрод</span>
                        </h2>
                        <p className='text-xs text-slate-500'>
                           Проверка выполнения дневного плана, хронологии звонков и детекция простоев
                        </p>
                     </div>
                  </div>

                  <div className='flex items-center gap-3'>
                     <div className='flex items-center gap-2'>
                        <Calendar className='w-4 h-4 text-slate-400' />
                        <input
                           type='date'
                           value={selectedDailyDate}
                           onChange={(e) => setSelectedDailyDate(e.target.value)}
                           className='px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                        />
                     </div>

                     <select
                        value={selectedDailyOperator}
                        onChange={(e) => setSelectedDailyOperator(e.target.value)}
                        className='px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                     >
                        <option value='ALL'>Все сотрудники</option>
                        {dailyStats?.operators?.map((op: any) => (
                           <option key={op.operatorId} value={op.operatorId}>
                              {op.operatorName} ({op.totalCalls} зв.)
                           </option>
                        ))}
                     </select>

                     <button
                        type='button'
                        onClick={fetchDailyStats}
                        disabled={isDailyStatsLoading}
                        className='p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer'
                        title='Обновить метрики'
                     >
                        <RotateCcw className={`w-4 h-4 ${isDailyStatsLoading ? 'animate-spin' : ''}`} />
                     </button>
                  </div>
               </div>

               {/* 6 Карточек метрик дня */}
               <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3'>
                  <div className='p-4 rounded-3xl bg-white border border-slate-200 shadow-xs'>
                     <div className='text-xs font-bold text-slate-500 uppercase tracking-wider mb-1'>
                        Звонков за день
                     </div>
                     <div className='text-2xl font-black text-slate-900'>
                        {dailyStats?.summary?.totalCalls || 0}
                     </div>
                     <div className='text-[10px] text-slate-400 mt-0.5'>
                        Зафиксировано в базе
                     </div>
                  </div>

                  <div className='p-4 rounded-3xl bg-teal-50/60 border border-teal-200 shadow-xs'>
                     <div className='text-xs font-bold text-teal-800 uppercase tracking-wider mb-1'>
                        Заявки
                     </div>
                     <div className='text-2xl font-black text-teal-900'>
                        {dailyStats?.summary?.ordersPlaced || 0}
                     </div>
                     <div className='text-[10px] text-teal-700 font-semibold mt-0.5'>
                        Конверсия {dailyStats?.summary?.conversionRate || 0}%
                     </div>
                  </div>

                  <div className='p-4 rounded-3xl bg-amber-50/60 border border-amber-200 shadow-xs'>
                     <div className='text-xs font-bold text-amber-900 uppercase tracking-wider mb-1'>
                        Перезвоны
                     </div>
                     <div className='text-2xl font-black text-amber-900'>
                        {dailyStats?.summary?.callbacks || 0}
                     </div>
                     <div className='text-[10px] text-amber-700 mt-0.5'>
                        Назначено клиентам
                     </div>
                  </div>

                  <div className='p-4 rounded-3xl bg-slate-50 border border-slate-200 shadow-xs'>
                     <div className='text-xs font-bold text-slate-600 uppercase tracking-wider mb-1'>
                        Не ответили
                     </div>
                     <div className='text-2xl font-black text-slate-800'>
                        {dailyStats?.summary?.noAnswer || 0}
                     </div>
                     <div className='text-[10px] text-slate-400 mt-0.5'>
                        Сброс / гудки
                     </div>
                  </div>

                  <div className='p-4 rounded-3xl bg-indigo-50/60 border border-indigo-200 shadow-xs'>
                     <div className='text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1'>
                        Уникальных кл.
                     </div>
                     <div className='text-2xl font-black text-indigo-900'>
                        {dailyStats?.summary?.uniqueClientsCount || 0}
                     </div>
                     <div className='text-[10px] text-indigo-700 mt-0.5'>
                        Охвачено базой
                     </div>
                  </div>

                  <div className='p-4 rounded-3xl bg-rose-50/60 border border-rose-200 shadow-xs'>
                     <div className='text-xs font-bold text-rose-900 uppercase tracking-wider mb-1'>
                        Исключены
                     </div>
                     <div className='text-2xl font-black text-rose-900'>
                        {dailyStats?.summary?.excludedCount || 0}
                     </div>
                     <div className='text-[10px] text-rose-700 mt-0.5'>
                        Закрылись/Перестали
                     </div>
                  </div>
               </div>

               {/* АНТИФРОД: ДЕТЕКЦИЯ ПРОСТОЕВ (> 45 МИНУТ) */}
               <div className='bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3'>
                  <div className='flex items-center justify-between'>
                     <div className='flex items-center gap-2'>
                        <ShieldCheck className='w-5 h-5 text-indigo-600' />
                        <h3 className='font-black text-sm text-slate-900 uppercase tracking-wider'>
                           Антифрод-мониторинг пауз и простоев
                        </h3>
                     </div>
                     <span className='text-xs text-slate-400'>
                        Порог подозрительного простоя: &gt; 45 минут
                     </span>
                  </div>

                  {dailyStats?.idleIncidents && dailyStats.idleIncidents.length > 0 ? (
                     <div className='space-y-2.5'>
                        <div className='p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex items-center gap-2 text-xs font-bold'>
                           <AlertTriangle className='w-4 h-4 text-amber-600 shrink-0' />
                           <span>
                              Зафиксировано {dailyStats.idleIncidents.length} подозрительных пауз между звонками:
                           </span>
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-2 gap-2.5'>
                           {dailyStats.idleIncidents.map((incident: any, iIdx: number) => (
                              <div
                                 key={iIdx}
                                 className='p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3'
                              >
                                 <div className='w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-black text-xs'>
                                    {incident.durationMinutes}м
                                 </div>
                                 <div className='text-xs space-y-0.5'>
                                    <div className='font-bold text-slate-900'>
                                       Оператор: {incident.operatorName}
                                    </div>
                                    <div className='text-slate-500'>
                                       Пауза {incident.durationMinutes} минут: с{' '}
                                       <strong>
                                          {new Date(incident.fromTime).toLocaleTimeString([], {
                                             hour: '2-digit',
                                             minute: '2-digit',
                                          })}
                                       </strong>{' '}
                                       до{' '}
                                       <strong>
                                          {new Date(incident.toTime).toLocaleTimeString([], {
                                             hour: '2-digit',
                                             minute: '2-digit',
                                          })}
                                       </strong>
                                    </div>
                                    <div className='text-[11px] text-slate-400 italic truncate'>
                                       {incident.prevClient} → {incident.nextClient}
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  ) : (
                     <div className='p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 flex items-center gap-2 text-xs font-bold'>
                        <CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0' />
                        <span>
                           Подозрительных пауз (&gt; 45 мин) не обнаружено. Оператор работал ритмично.
                        </span>
                     </div>
                  )}
               </div>

               {/* Хронологический журнал звонков (Call Logs) */}
               <div className='bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm'>
                  <div className='p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between'>
                     <div className='flex items-center gap-2'>
                        <History className='w-4 h-4 text-slate-500' />
                        <h3 className='font-black text-xs text-slate-900 uppercase tracking-wider'>
                           Хронология всех звонков за {selectedDailyDate} ({dailyStats?.timeline?.length || 0})
                        </h3>
                     </div>
                  </div>

                  <div className='overflow-x-auto'>
                     <table className='w-full text-left text-xs'>
                        <thead className='bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider'>
                           <tr>
                              <th className='p-3.5'>Время</th>
                              <th className='p-3.5'>Оператор</th>
                              <th className='p-3.5'>Клиент</th>
                              <th className='p-3.5'>Город</th>
                              <th className='p-3.5'>Результат</th>
                              <th className='p-3.5'>Примечание / Перезвон</th>
                           </tr>
                        </thead>
                        <tbody className='divide-y divide-slate-100'>
                           {dailyStats?.timeline && dailyStats.timeline.length > 0 ? (
                              dailyStats.timeline.map((log: any) => {
                                 const cfg = CATEGORIES_CONFIG[log.action] || CATEGORIES_CONFIG.ON_DEMAND;

                                 return (
                                    <tr key={log.id} className='hover:bg-slate-50/80 transition'>
                                       <td className='p-3.5 font-mono font-bold text-slate-700 whitespace-nowrap'>
                                          {new Date(log.calledAt).toLocaleTimeString([], {
                                             hour: '2-digit',
                                             minute: '2-digit',
                                             second: '2-digit',
                                          })}
                                       </td>
                                       <td className='p-3.5 font-semibold text-slate-900 whitespace-nowrap'>
                                          <div className='flex items-center gap-1.5'>
                                             <UserCheck className='w-3.5 h-3.5 text-slate-400' />
                                             <span>{log.operatorName}</span>
                                          </div>
                                       </td>
                                       <td className='p-3.5 font-bold text-slate-900'>
                                          {log.clientName}
                                       </td>
                                       <td className='p-3.5 text-slate-600 font-medium whitespace-nowrap'>
                                          {log.city}
                                       </td>
                                       <td className='p-3.5 whitespace-nowrap'>
                                          <span
                                             className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border inline-flex items-center gap-1 ${cfg.badge}`}
                                          >
                                             <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                             <span>{cfg.label}</span>
                                          </span>
                                       </td>
                                       <td className='p-3.5 text-slate-600 max-w-xs truncate'>
                                          {log.callbackAt ? (
                                             <span className='font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block'>
                                                ⏰ На:{' '}
                                                {new Date(log.callbackAt).toLocaleTimeString([], {
                                                   hour: '2-digit',
                                                   minute: '2-digit',
                                                })}{' '}
                                                {log.source === 'MEETING' ? '(Вживую)' : ''}
                                                {log.comment ? ` - ${log.comment}` : ''}
                                             </span>
                                          ) : log.comment ? (
                                             log.comment
                                          ) : (
                                             <span className='text-slate-300'>—</span>
                                          )}
                                       </td>
                                    </tr>
                                 );
                              })
                           ) : (
                              <tr>
                                 <td colSpan={6} className='p-8 text-center text-slate-400'>
                                    Звонков за выбранную дату не зафиксировано
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         )}

         {/* 4. РЕЖИМ: ГРАФИК И СПИСОК «КОМУ ПЕРЕЗВОНИТЬ» */}
         {activeViewMode === 'callbacks' && (
            <div className='space-y-6 animate-in fade-in duration-200'>
               {/* Шапка раздела */}
               <div className='bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4'>
                  <div className='flex items-center gap-3'>
                     <div className='w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold shrink-0 shadow-inner'>
                        <Clock className='w-6 h-6 text-amber-600' />
                     </div>
                     <div>
                        <div className='flex items-center gap-2 flex-wrap'>
                           <h2 className='text-lg font-black text-slate-900'>
                              Кому перезвонить • График и напоминания
                           </h2>
                           <span className='px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs'>
                              {activeCallbacks.total} запланировано
                           </span>
                           {activeCallbacks.dueNow.length > 0 && (
                              <span className='px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-extrabold text-xs animate-pulse'>
                                 🔥 {activeCallbacks.dueNow.length} ждут звонка прямо сейчас
                              </span>
                           )}
                        </div>
                        <p className='text-xs text-slate-500 mt-0.5'>
                           Полный список клиентов с запланированным временем повторного звонка
                        </p>
                     </div>
                  </div>

                  <div className='flex items-center gap-2 w-full md:w-auto justify-end'>
                     <button
                        type='button'
                        onClick={() => fetchActiveCallbacks()}
                        className='px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer'
                        title='Обновить список'
                     >
                        <RotateCcw className='w-3.5 h-3.5' />
                        <span>Обновить</span>
                     </button>
                     <button
                        type='button'
                        onClick={() => setActiveViewMode('registry')}
                        className='px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs'
                     >
                        <Building2 className='w-3.5 h-3.5' />
                        <span>В реестр клиентов</span>
                     </button>
                  </div>
               </div>

               {/* Фильтры и поиск */}
               <div className='flex flex-col sm:flex-row items-center justify-between gap-3'>
                  {/* Поиск */}
                  <div className='relative w-full sm:max-w-md'>
                     <Search className='w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2' />
                     <input
                        type='text'
                        value={callbacksSearchQuery}
                        onChange={(e) => setCallbacksSearchQuery(e.target.value)}
                        placeholder='Поиск по имени, городу, телефону или примечанию...'
                        className='w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-xs'
                     />
                     {callbacksSearchQuery && (
                        <button
                           type='button'
                           onClick={() => setCallbacksSearchQuery('')}
                           className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer'
                        >
                           <X className='w-3.5 h-3.5' />
                        </button>
                     )}
                  </div>

                  {/* Вкладки фильтрации */}
                  <div className='flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shrink-0 w-full sm:w-auto'>
                     {[
                        { id: 'all', label: 'Все', count: activeCallbacks.total },
                        { id: 'due', label: '🔥 Ждут сейчас', count: activeCallbacks.dueNow.length },
                        { id: 'upcoming', label: '📅 Предстоящие', count: activeCallbacks.upcoming.length },
                     ].map((t) => (
                        <button
                           key={t.id}
                           type='button'
                           onClick={() => setCallbacksFilterTab(t.id as any)}
                           className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer flex-1 sm:flex-initial justify-center ${
                              callbacksFilterTab === t.id
                                 ? 'bg-slate-900 text-white shadow-xs'
                                 : 'text-slate-600 hover:bg-slate-100'
                           }`}
                        >
                           <span>{t.label}</span>
                           <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${
                              callbacksFilterTab === t.id ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'
                           }`}>
                              {t.count}
                           </span>
                        </button>
                     ))}
                  </div>
               </div>

               {/* Отображение списка перезвонов */}
               {(() => {
                  const query = callbacksSearchQuery.toLowerCase().trim()
                  const filterClient = (c: Client) => {
                     if (!query) return true
                     const nameMatch = c.name?.toLowerCase().includes(query)
                     const cityMatch = c.city?.toLowerCase().includes(query)
                     const noteMatch = c.callbackNote?.toLowerCase().includes(query)
                     const phoneMatch = c.phones?.some((p) => p.includes(query))
                     return nameMatch || cityMatch || noteMatch || phoneMatch
                  }

                  const dueFiltered = activeCallbacks.dueNow.filter(filterClient)
                  const upcomingFiltered = activeCallbacks.upcoming.filter(filterClient)

                  const showDue = callbacksFilterTab === 'all' || callbacksFilterTab === 'due'
                  const showUpcoming = callbacksFilterTab === 'all' || callbacksFilterTab === 'upcoming'

                  const totalFiltered = (showDue ? dueFiltered.length : 0) + (showUpcoming ? upcomingFiltered.length : 0)

                  if (totalFiltered === 0) {
                     return (
                        <div className='bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4 shadow-xs'>
                           <div className='w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner'>
                              <CheckCircle2 className='w-8 h-8' />
                           </div>
                           <div>
                              <h3 className='font-black text-slate-900 text-lg'>
                                 {callbacksSearchQuery
                                    ? 'По вашему запросу ничего не найдено'
                                    : 'Нет запланированных перезвонов'}
                              </h3>
                              <p className='text-xs text-slate-500 mt-1'>
                                 {callbacksSearchQuery
                                    ? 'Попробуйте изменить поисковый запрос'
                                    : 'Все звонки отработаны. Когда клиенты попросят перезвонить, они появятся в этом графике.'}
                              </p>
                           </div>
                           <button
                              type='button'
                              onClick={() => setActiveViewMode('registry')}
                              className='px-5 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer shadow-xs'
                           >
                              Перейти в реестр клиентов
                           </button>
                        </div>
                     )
                  }

                  return (
                     <div className='space-y-6'>
                        {/* Секция: Ждут звонка прямо сейчас */}
                        {showDue && dueFiltered.length > 0 && (
                           <div className='space-y-3'>
                              <div className='flex items-center gap-2'>
                                 <Flame className='w-5 h-5 text-amber-500 animate-bounce' />
                                 <h3 className='font-black text-sm text-slate-900 uppercase tracking-wider'>
                                    Время звонка наступило ({dueFiltered.length})
                                 </h3>
                              </div>
                              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                 {dueFiltered.map((client) => {
                                    return (
                                       <div
                                          key={client.id}
                                          className='p-4 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 rounded-2xl border-2 border-amber-300 shadow-sm space-y-3'
                                       >
                                          <div className='flex items-start justify-between gap-2'>
                                             <div>
                                                <div className='flex items-center gap-2'>
                                                   <h4 className='font-black text-sm text-slate-900'>
                                                      {client.name}
                                                   </h4>
                                                   <span className='px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-900 text-[10px] font-bold'>
                                                      {client.city}
                                                   </span>
                                                </div>
                                                <div className='flex items-center gap-2 mt-1 text-xs'>
                                                   <span className='px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[11px] shadow-2xs'>
                                                      ⏰ {formatCallbackTime(client.callbackAt)}
                                                   </span>
                                                </div>
                                                {client.callbackNote && (
                                                   <p className='text-xs text-amber-950 italic mt-1.5 bg-amber-100/70 border border-amber-200 px-2.5 py-1 rounded-xl'>
                                                      💬 «{client.callbackNote}»
                                                   </p>
                                                )}
                                             </div>
                                          </div>

                                          {/* Телефоны и действия */}
                                          <div className='flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200/80'>
                                             <div className='flex items-center gap-1.5 flex-wrap'>
                                                {client.phones && client.phones.length > 0 ? (
                                                   client.phones.map((phone, pIdx) => (
                                                      <div key={pIdx} className='flex items-center gap-1 bg-white border border-amber-300 px-2 py-1 rounded-xl shadow-2xs'>
                                                         <span className='font-mono text-xs font-bold text-slate-800'>{phone}</span>
                                                         <button
                                                            type='button'
                                                            onClick={(e) => handleCopyText(phone, 'phone', e)}
                                                            className='p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer'
                                                            title='Копировать'
                                                         >
                                                            <Copy className='w-3 h-3' />
                                                         </button>
                                                         <a
                                                            href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                                                            className='p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition'
                                                            title='Позвонить'
                                                         >
                                                            <PhoneCall className='w-3 h-3' />
                                                         </a>
                                                      </div>
                                                   ))
                                                ) : (
                                                   <span className='text-xs text-slate-400 italic'>Нет телефона</span>
                                                )}
                                             </div>

                                             <div className='flex items-center gap-1.5 ml-auto'>
                                                <button
                                                   type='button'
                                                   onClick={() => {
                                                      setIsWaitingCallbacksModalOpen(true)
                                                      setFixatingClientId(client.id)
                                                   }}
                                                   className='px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-xs transition cursor-pointer flex items-center gap-1'
                                                >
                                                   <Check className='w-3.5 h-3.5' />
                                                   <span>Зафиксировать</span>
                                                </button>
                                                <button
                                                   type='button'
                                                   onClick={() => handleClearCallback(client.id)}
                                                   className='p-1.5 rounded-xl hover:bg-amber-200 text-amber-800 transition cursor-pointer'
                                                   title='Снять перезвон'
                                                >
                                                   <X className='w-3.5 h-3.5' />
                                                </button>
                                             </div>
                                          </div>
                                       </div>
                                    )
                                 })}
                              </div>
                           </div>
                        )}

                        {/* Секция: Предстоящие перезвоны */}
                        {showUpcoming && upcomingFiltered.length > 0 && (
                           <div className='space-y-3'>
                              <div className='flex items-center gap-2'>
                                 <Calendar className='w-5 h-5 text-slate-500' />
                                 <h3 className='font-black text-sm text-slate-700 uppercase tracking-wider'>
                                    Предстоящие перезвоны ({upcomingFiltered.length})
                                 </h3>
                              </div>
                              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                 {upcomingFiltered.map((client) => {
                                    return (
                                       <div
                                          key={client.id}
                                          className='p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:border-slate-300 transition'
                                       >
                                          <div className='flex items-start justify-between gap-2'>
                                             <div>
                                                <div className='flex items-center gap-2'>
                                                   <h4 className='font-black text-sm text-slate-900'>
                                                      {client.name}
                                                   </h4>
                                                   <span className='px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200'>
                                                      {client.city}
                                                   </span>
                                                </div>
                                                <div className='flex items-center gap-2 mt-1 text-xs'>
                                                   <span className='px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-extrabold text-[11px] border border-slate-200 flex items-center gap-1'>
                                                      <Clock className='w-3 h-3 text-slate-500' />
                                                      <span>{formatCallbackTime(client.callbackAt)}</span>
                                                   </span>
                                                </div>
                                                {client.callbackNote && (
                                                   <p className='text-xs text-slate-600 italic mt-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl'>
                                                      💬 «{client.callbackNote}»
                                                   </p>
                                                )}
                                             </div>
                                          </div>

                                          {/* Телефоны и действия */}
                                          <div className='flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100'>
                                             <div className='flex items-center gap-1.5 flex-wrap'>
                                                {client.phones && client.phones.length > 0 ? (
                                                   client.phones.map((phone, pIdx) => (
                                                      <div key={pIdx} className='flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl'>
                                                         <span className='font-mono text-xs font-bold text-slate-800'>{phone}</span>
                                                         <button
                                                            type='button'
                                                            onClick={(e) => handleCopyText(phone, 'phone', e)}
                                                            className='p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer'
                                                            title='Копировать'
                                                         >
                                                            <Copy className='w-3 h-3' />
                                                         </button>
                                                         <a
                                                            href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                                                            className='p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition'
                                                            title='Позвонить'
                                                         >
                                                            <PhoneCall className='w-3 h-3' />
                                                         </a>
                                                      </div>
                                                   ))
                                                ) : (
                                                   <span className='text-xs text-slate-400 italic'>Нет телефона</span>
                                                )}
                                             </div>

                                             <div className='flex items-center gap-1.5 ml-auto'>
                                                <button
                                                   type='button'
                                                   onClick={() => handleOpenCallbackModal(client)}
                                                   className='px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1'
                                                   title='Изменить время перезвона'
                                                >
                                                   <Clock className='w-3.5 h-3.5 text-slate-500' />
                                                   <span>Перенести</span>
                                                </button>
                                                <button
                                                   type='button'
                                                   onClick={() => handleClearCallback(client.id)}
                                                   className='p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-rose-600 transition cursor-pointer'
                                                   title='Снять перезвон'
                                                >
                                                   <X className='w-3.5 h-3.5' />
                                                </button>
                                             </div>
                                          </div>
                                       </div>
                                    )
                                 })}
                              </div>
                           </div>
                        )}
                     </div>
                  )
               })()}
            </div>
         )}

         {/* 4. Модальное окно быстрого ввода примечания / причины */}
         {quickNoteModal && quickNoteModal.isOpen && (
            <div className='fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4'>
               <div className='bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200'>
                  <button
                     type='button'
                     onClick={() => setQuickNoteModal(null)}
                     className='absolute right-5 top-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer'
                  >
                     <X className='w-5 h-5' />
                  </button>

                  <div className='flex items-center gap-3 mb-4'>
                     <div className='w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold shrink-0'>
                        <MessageSquare className='w-5 h-5' />
                     </div>
                     <div>
                        <h3 className='text-base font-black text-slate-900 leading-tight'>
                           {quickNoteModal.notePromptTitle}
                        </h3>
                        <p className='text-xs text-slate-500 mt-0.5 truncate max-w-[280px]'>
                           {quickNoteModal.client.name} •{' '}
                           {quickNoteModal.client.city}
                        </p>
                     </div>
                  </div>

                  <div className='space-y-3'>
                     <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider'>
                        {quickNoteModal.noteLabel}
                     </label>
                     <textarea
                        autoFocus
                        rows={3}
                        value={quickNoteModal.commentText}
                        onChange={(e) =>
                           setQuickNoteModal((prev) =>
                              prev
                                 ? { ...prev, commentText: e.target.value }
                                 : null
                           )
                        }
                        placeholder={quickNoteModal.notePlaceholder}
                        className='w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition resize-none'
                     />

                     <div className='flex items-center justify-end gap-2 pt-2'>
                        <button
                           type='button'
                           onClick={() => setQuickNoteModal(null)}
                           className='px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer'
                        >
                           Отмена
                        </button>
                        {quickNoteModal.isPrompt && (
                           <button
                              type='button'
                              onClick={() => handleSaveQuickNote(false)}
                              className='px-3.5 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer'
                           >
                              Без примечания
                           </button>
                        )}
                        <button
                           type='button'
                           onClick={() => handleSaveQuickNote(true)}
                           className='px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer'
                        >
                           Сохранить
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* 5. Модальное окно создания / редактирования клиента */}
         {isModalOpen && (
            <div className='fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto'>
               <div className='bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200 my-8'>
                  {/* Крестик закрытия */}
                  <button
                     type='button'
                     onClick={() => setIsModalOpen(false)}
                     className='absolute right-5 top-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer'
                  >
                     <X className='w-5 h-5' />
                  </button>

                  {/* Заголовок */}
                  <div className='flex items-center gap-3 mb-5'>
                     <div className='w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold'>
                        <Building2 className='w-5 h-5' />
                     </div>
                     <div>
                        <h3 className='text-lg font-black text-slate-900 leading-tight'>
                           {editingClient
                              ? 'Редактирование клиента'
                              : 'Новый клиент в базу обзвона'}
                        </h3>
                        <p className='text-xs text-slate-500'>
                           {editingClient
                              ? 'Измените данные клиента, категорию или контакты'
                              : 'Заполните информацию о контрагенте, телефоны или email'}
                        </p>
                     </div>
                  </div>

                  <form onSubmit={handleSubmitForm} className='space-y-4'>
                     {/* Название */}
                     <div>
                        <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1'>
                           Название магазина / Контрагент{' '}
                           <span className='text-rose-500'>*</span>
                        </label>
                        <input
                           type='text'
                           required
                           value={formName}
                           onChange={(e) => setFormName(e.target.value)}
                           placeholder='Например: Пивной рай ООО Визит, ИП Иванов...'
                           className='w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition'
                        />
                     </div>

                     {/* Город (с поддержкой ввода нового, быстрого выбора из существующих и автопоиска) */}
                     <div>
                        <div className='flex items-center justify-between mb-1'>
                           <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider'>
                              Город <span className='text-rose-500'>*</span>
                           </label>
                           <span className='text-[11px] text-slate-400'>
                              Выберите из списка или введите новый
                           </span>
                        </div>

                        <div ref={cityInputContainerRef} className='relative'>
                           <div className='relative flex items-center'>
                              <MapPin className='w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none' />
                              <input
                                 type='text'
                                 required
                                 value={formCity}
                                 onChange={(e) => {
                                    setFormCity(e.target.value)
                                    setIsCityDropdownOpen(true)
                                 }}
                                 onFocus={() => setIsCityDropdownOpen(true)}
                                 placeholder='Введите новый город или выберите из существующих...'
                                 className='w-full pl-10 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition'
                              />

                              <div className='absolute right-2 flex items-center gap-1'>
                                 {formCity && (
                                    <button
                                       type='button'
                                       onClick={() => {
                                          setFormCity('')
                                          setIsCityDropdownOpen(true)
                                       }}
                                       className='p-1 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer'
                                       title='Очистить'
                                    >
                                       <X className='w-3.5 h-3.5' />
                                    </button>
                                 )}
                                 <button
                                    type='button'
                                    onClick={() =>
                                       setIsCityDropdownOpen((prev) => !prev)
                                    }
                                    className='p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition cursor-pointer'
                                    title='Показать все города'
                                 >
                                    <ChevronDown
                                       className={`w-4 h-4 transition-transform duration-200 ${
                                          isCityDropdownOpen
                                             ? 'rotate-180 text-teal-600'
                                             : ''
                                       }`}
                                    />
                                 </button>
                              </div>
                           </div>

                           {/* Выпадающий список городов */}
                           {isCityDropdownOpen && (
                              <div className='absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto p-1.5 animate-in fade-in zoom-in-95 duration-150'>
                                 {/* Если введен город, которого нет среди существующих */}
                                 {formCity.trim() &&
                                    !cities.some(
                                       (c) =>
                                          c.toLowerCase() ===
                                          formCity.trim().toLowerCase()
                                    ) && (
                                       <button
                                          type='button'
                                          onClick={() => {
                                             setFormCity(formCity.trim())
                                             setIsCityDropdownOpen(false)
                                          }}
                                          className='w-full px-3 py-2.5 rounded-xl text-left text-xs font-bold text-teal-900 bg-teal-50/90 hover:bg-teal-100 border border-teal-200 transition flex items-center justify-between cursor-pointer mb-1 shadow-2xs'
                                       >
                                          <div className='flex items-center gap-2 truncate'>
                                             <Plus className='w-4 h-4 text-teal-600 shrink-0' />
                                             <span className='truncate'>
                                                Использовать новый город: «
                                                {formCity.trim()}»
                                             </span>
                                          </div>
                                          <span className='text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded-md font-bold shrink-0'>
                                             Новый
                                          </span>
                                       </button>
                                    )}

                                 {/* Заголовок существующих городов */}
                                 <div className='px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between'>
                                    <span>
                                       Существующие города ({cities.length})
                                    </span>
                                    {formCity.trim() && (
                                       <span className='text-teal-600 font-semibold truncate max-w-[140px]'>
                                          Поиск: {formCity.trim()}
                                       </span>
                                    )}
                                 </div>

                                 {/* Список существующих городов с фильтрацией */}
                                 {cities.filter((c) =>
                                    c
                                       .toLowerCase()
                                       .includes(formCity.trim().toLowerCase())
                                 ).length > 0 ? (
                                    cities
                                       .filter((c) =>
                                          c
                                             .toLowerCase()
                                             .includes(
                                                formCity.trim().toLowerCase()
                                             )
                                       )
                                       .map((city) => {
                                          const isExact =
                                             city.toLowerCase() ===
                                             formCity.trim().toLowerCase()
                                          return (
                                             <button
                                                key={city}
                                                type='button'
                                                onClick={() => {
                                                   setFormCity(city)
                                                   setIsCityDropdownOpen(false)
                                                }}
                                                className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                                                   isExact
                                                      ? 'bg-teal-50 text-teal-900 font-bold border border-teal-200'
                                                      : 'text-slate-700 hover:bg-slate-100'
                                                }`}
                                             >
                                                <div className='flex items-center gap-2 truncate'>
                                                   <MapPin
                                                      className={`w-3.5 h-3.5 shrink-0 ${
                                                         isExact
                                                            ? 'text-teal-600'
                                                            : 'text-slate-400'
                                                      }`}
                                                   />
                                                   <span className='truncate'>
                                                      {city}
                                                   </span>
                                                </div>
                                                {isExact && (
                                                   <Check className='w-3.5 h-3.5 text-teal-600 shrink-0' />
                                                )}
                                             </button>
                                          )
                                       })
                                 ) : (
                                    <div className='px-3 py-3 text-xs text-slate-500 text-center space-y-1'>
                                       <p className='font-semibold text-slate-700'>
                                          Город «{formCity.trim()}» не найден
                                          среди существующих
                                       </p>
                                       <p className='text-[11px] text-slate-400'>
                                          Он сохранится как новый при создании
                                          клиента
                                       </p>
                                    </div>
                                 )}
                              </div>
                           )}

                           {/* Быстрые кликабельные теги существующих городов */}
                           {cities.length > 0 && (
                              <div className='mt-2 flex items-center gap-1.5 flex-wrap'>
                                 <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-0.5'>
                                    Быстрый выбор:
                                 </span>
                                 {cities.slice(0, 8).map((city) => {
                                    const isActive =
                                       city.toLowerCase() ===
                                       formCity.trim().toLowerCase()
                                    return (
                                       <button
                                          key={city}
                                          type='button'
                                          onClick={() => {
                                             setFormCity(city)
                                             setIsCityDropdownOpen(false)
                                          }}
                                          className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer border ${
                                             isActive
                                                ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                          }`}
                                       >
                                          {city}
                                       </button>
                                    )
                                 })}
                              </div>
                           )}
                        </div>
                     </div>

                     {/* Категория */}
                     <div>
                        <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5'>
                           Категория клиента{' '}
                           <span className='text-rose-500'>*</span>
                        </label>
                        <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
                           {MAIN_CATEGORIES.map((catKey) => {
                              const cfg = CATEGORIES_CONFIG[catKey]
                              if (!cfg) return null
                              const Icon = cfg.icon
                              const isSelected = formCategory === catKey

                              return (
                                 <button
                                    key={catKey}
                                    type='button'
                                    onClick={() => setFormCategory(catKey)}
                                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer text-center ${
                                       isSelected
                                          ? `${cfg.activeBg} shadow-sm ring-1 ring-slate-900/10`
                                          : `${cfg.color}`
                                    }`}
                                 >
                                    <Icon className='w-4 h-4 shrink-0' />
                                    <span className='leading-tight'>
                                       {cfg.label}
                                    </span>
                                 </button>
                              )
                           })}
                        </div>
                     </div>

                     {/* Поле примечания / причины (динамически в зависимости от категории) */}
                     <div>
                        <div className='flex items-center justify-between mb-1'>
                           <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider'>
                              {CATEGORIES_CONFIG[formCategory]?.hasNote
                                 ? CATEGORIES_CONFIG[formCategory]?.noteLabel
                                 : 'Примечание к клиенту (необязательно)'}
                           </label>
                           {CATEGORIES_CONFIG[formCategory]?.hasNote && (
                              <span className='text-[10px] text-teal-600 font-semibold'>
                                 Показывается при наведении
                              </span>
                           )}
                        </div>
                        <input
                           type='text'
                           value={formComment}
                           onChange={(e) => setFormComment(e.target.value)}
                           placeholder={
                              CATEGORIES_CONFIG[formCategory]
                                 ?.notePlaceholder ||
                              'Впишите примечание или дополнительную информацию...'
                           }
                           className='w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition'
                        />
                     </div>

                     {/* Номера телефонов (динамический список) */}
                     <div>
                        <div className='flex items-center justify-between mb-1.5'>
                           <label className='text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5'>
                              <Phone className='w-3.5 h-3.5 text-teal-600' />
                              <span>Номера телефонов</span>
                           </label>
                           <button
                              type='button'
                              onClick={handleAddPhoneField}
                              className='text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer'
                           >
                              <Plus className='w-3.5 h-3.5' />
                              <span>Добавить номер</span>
                           </button>
                        </div>

                        {formPhones.length === 0 ? (
                           <div className='py-2.5 px-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-500'>
                              <span>Номера телефонов не указаны</span>
                              <button
                                 type='button'
                                 onClick={handleAddPhoneField}
                                 className='text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1 cursor-pointer'
                              >
                                 <Plus className='w-3.5 h-3.5' />
                                 <span>Добавить номер</span>
                              </button>
                           </div>
                        ) : (
                           <div className='space-y-2 max-h-36 overflow-y-auto pr-1'>
                              {formPhones.map((phone, idx) => (
                                 <div
                                    key={idx}
                                    className='flex items-center gap-2'
                                 >
                                    <div className='relative flex-1'>
                                       <Phone className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
                                       <input
                                          type='text'
                                          value={phone}
                                          onChange={(e) =>
                                             handlePhoneFieldChange(
                                                idx,
                                                e.target.value
                                             )
                                          }
                                          placeholder={`Номер ${idx + 1} (например: 89224194014 или 20604)`}
                                          className='w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition'
                                       />
                                    </div>
                                    <button
                                       type='button'
                                       onClick={() =>
                                          handleRemovePhoneField(idx)
                                       }
                                       className='p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer shrink-0'
                                       title='Удалить этот номер'
                                    >
                                       <Trash2 className='w-4 h-4' />
                                    </button>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>

                     {/* Электронная почта (Email) (динамический список) */}
                     <div>
                        <div className='flex items-center justify-between mb-1.5'>
                           <label className='text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5'>
                              <Mail className='w-3.5 h-3.5 text-sky-600' />
                              <span>Электронная почта (Email)</span>
                           </label>
                           <button
                              type='button'
                              onClick={handleAddEmailField}
                              className='text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer'
                           >
                              <Plus className='w-3.5 h-3.5' />
                              <span>Добавить email</span>
                           </button>
                        </div>

                        {formEmails.length === 0 ? (
                           <div className='py-2.5 px-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-500'>
                              <span>Электронная почта не указана</span>
                              <button
                                 type='button'
                                 onClick={handleAddEmailField}
                                 className='text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 cursor-pointer'
                              >
                                 <Plus className='w-3.5 h-3.5' />
                                 <span>Добавить email</span>
                              </button>
                           </div>
                        ) : (
                           <div className='space-y-2 max-h-36 overflow-y-auto pr-1'>
                              {formEmails.map((email, idx) => (
                                 <div
                                    key={idx}
                                    className='flex items-center gap-2'
                                 >
                                    <div className='relative flex-1'>
                                       <Mail className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
                                       <input
                                          type='email'
                                          value={email}
                                          onChange={(e) =>
                                             handleEmailFieldChange(
                                                idx,
                                                e.target.value
                                             )
                                          }
                                          placeholder={`Email ${idx + 1} (например: opt@ribatrade.ru)`}
                                          className='w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition'
                                       />
                                    </div>
                                    <button
                                       type='button'
                                       onClick={() =>
                                          handleRemoveEmailField(idx)
                                       }
                                       className='p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer shrink-0'
                                       title='Удалить этот email'
                                    >
                                       <Trash2 className='w-4 h-4' />
                                    </button>
                                 </div>
                              ))}
                           </div>
                        )}
                        <p className='text-[11px] text-slate-400 mt-1 italic'>
                           * Можно указать только телефон, только email или оба
                           контакта
                        </p>
                     </div>

                     {/* Кнопки действий */}
                     <div className='flex items-center justify-end gap-2 pt-4 border-t border-slate-100'>
                        <button
                           type='button'
                           onClick={() => setIsModalOpen(false)}
                           className='px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer'
                        >
                           Отмена
                        </button>
                        <button
                           type='submit'
                           disabled={isSubmitting}
                           className='px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer'
                        >
                           {isSubmitting
                              ? 'Сохранение...'
                              : editingClient
                                ? 'Сохранить изменения'
                                : 'Создать клиента'}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {/* МОДАЛЬНОЕ ОКНО ВЫБОРА ГОРОДА ДЛЯ НАЧАЛА ОБЗВОНА */}
         {isCitySelectModalOpen && (
            <div className='fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4'>
               <div className='bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150'>
                  <div className='flex items-center justify-between pb-4 border-b border-slate-100'>
                     <div className='flex items-center gap-2.5'>
                        <div className='w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shadow-xs'>
                           <PhoneCall className='w-5 h-5 animate-pulse' />
                        </div>
                        <div>
                           <h3 className='font-extrabold text-slate-900 text-lg'>
                              Начать работу — Обзвон
                           </h3>
                           <p className='text-xs text-slate-500'>
                              Выберите город для выдачи номеров клиентов
                           </p>
                        </div>
                     </div>
                     <button
                        type='button'
                        onClick={() => setIsCitySelectModalOpen(false)}
                        className='p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer'
                     >
                        <X className='w-5 h-5' />
                     </button>
                  </div>

                  <div className='py-4 space-y-3'>
                     {/* Поиск города */}
                     <div className='relative'>
                        <Search className='w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400' />
                        <input
                           type='text'
                           value={sessionCitySearch}
                           onChange={(e) =>
                              setSessionCitySearch(e.target.value)
                           }
                           placeholder='Поиск города...'
                           className='w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500'
                        />
                     </div>

                     {/* Список городов */}
                     <div className='max-h-64 overflow-y-auto space-y-1.5 pr-1'>
                        {cities
                           .filter((c) =>
                              c
                                 .toLowerCase()
                                 .includes(
                                    sessionCitySearch.toLowerCase().trim()
                                 )
                           )
                           .map((city) => {
                              const isSelected = sessionCity === city
                              return (
                                 <button
                                    key={city}
                                    type='button'
                                    onClick={() => setSessionCity(city)}
                                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                                       isSelected
                                          ? 'bg-teal-50/80 border-teal-500 ring-2 ring-teal-500 text-teal-950 shadow-xs'
                                          : 'bg-slate-50/60 border-slate-200 text-slate-800 hover:bg-slate-100/80'
                                    }`}
                                 >
                                    <div className='flex items-center gap-2.5'>
                                       <MapPin
                                          className={`w-4 h-4 ${isSelected ? 'text-teal-600' : 'text-slate-400'}`}
                                       />
                                       <span className='font-bold text-sm'>
                                          {city}
                                       </span>
                                    </div>
                                    <span
                                       className={`text-xs px-2.5 py-1 rounded-lg font-bold ${
                                          isSelected
                                             ? 'bg-teal-600 text-white'
                                             : 'bg-white border border-slate-200 text-slate-600'
                                       }`}
                                    >
                                       {isSelected ? 'Выбран' : 'Выбрать'}
                                    </span>
                                 </button>
                              )
                           })}
                        {cities.length === 0 && (
                           <p className='text-center text-xs text-slate-400 py-6'>
                              Города в базе не найдены
                           </p>
                        )}
                     </div>
                  </div>

                  <div className='pt-4 border-t border-slate-100 flex items-center justify-end gap-2'>
                     <button
                        type='button'
                        onClick={() => setIsCitySelectModalOpen(false)}
                        className='px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer'
                     >
                        Отмена
                     </button>
                     <button
                        type='button'
                        disabled={!sessionCity}
                        onClick={() => handleStartSession(sessionCity)}
                        className='px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/25 transition disabled:opacity-50 cursor-pointer flex items-center gap-2'
                     >
                        <Play className='w-4 h-4 fill-white' />
                        <span>
                           Начать обзвон: {sessionCity || 'Выберите город'}
                        </span>
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* ПРИКРЕПЛЕННЫЙ СВОРАЧИВАЮЩИЙСЯ СПИСОК (Floating Docked Drawer) */}
         {isCallingSessionActive && activeViewMode !== 'workspace' && (
            <div className='fixed bottom-5 right-5 z-40 max-w-md w-full sm:w-[420px] drop-shadow-2xl animate-in slide-in-from-bottom-5 duration-200'>
               {isDockCollapsed ? (
                  /* Свернутое состояние (компактная плашка) */
                  <div className='bg-slate-900/95 backdrop-blur-md text-white p-3 sm:p-3.5 rounded-2xl border border-slate-700/80 shadow-2xl flex items-center justify-between gap-3'>
                     <div className='flex items-center gap-2.5 min-w-0'>
                        <span className='flex h-2.5 w-2.5 relative shrink-0'>
                           <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
                           <span className='relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500'></span>
                        </span>
                        <div className='min-w-0'>
                           <div className='text-xs font-bold text-white truncate flex items-center gap-1.5'>
                              <span>{sessionClients[currentCallIndex]?.name || `г. ${sessionCity}`}</span>
                              <span className='text-[10px] text-teal-400 bg-teal-950/60 px-1.5 py-0.2 rounded font-mono'>
                                 #{currentCallIndex + 1}/{sessionClients.length}
                              </span>
                           </div>
                           {sessionClients[currentCallIndex]?.phones?.[0] && (
                              <div className='text-[11px] font-mono text-slate-300 truncate'>
                                 {sessionClients[currentCallIndex].phones[0]}
                              </div>
                           )}
                        </div>
                     </div>

                     <div className='flex items-center gap-1.5 shrink-0'>
                        {sessionClients[currentCallIndex]?.phones?.[0] && (
                           <a
                              href={`tel:${sessionClients[currentCallIndex].phones[0].replace(/[^\d+]/g, '')}`}
                              className='p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition'
                              title='Быстрый звонок'
                           >
                              <PhoneCall className='w-4 h-4 fill-white' />
                           </a>
                        )}

                        <button
                           type='button'
                           onClick={() => setIsDockCollapsed(false)}
                           className='p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer'
                           title='Развернуть список'
                        >
                           <ChevronUp className='w-4 h-4' />
                        </button>

                        <button
                           type='button'
                           onClick={() => setActiveViewMode('workspace')}
                           className='p-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white transition cursor-pointer'
                           title='Провалиться в работу'
                        >
                           <Maximize2 className='w-4 h-4' />
                        </button>
                     </div>
                  </div>
               ) : (
                  /* Развернутое состояние: интерактивный плавающий ящик (Drawer) */
                  <div className='bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[560px] animate-in zoom-in-95 duration-150'>
                     {/* Шапка дока */}
                     <div className='p-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between gap-2 shrink-0'>
                        <div className='flex items-center gap-2 min-w-0'>
                           <span className='w-2 h-2 rounded-full bg-emerald-400 animate-pulse' />
                           <span className='font-bold text-xs truncate text-white'>
                              Обзвон: г. {sessionCity} ({currentCallIndex + 1}/{sessionClients.length})
                           </span>
                        </div>

                        <div className='flex items-center gap-1 shrink-0'>
                           <button
                              type='button'
                              onClick={() => setActiveViewMode('workspace')}
                              className='px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer'
                           >
                              <Maximize2 className='w-3 h-3' />
                              <span>Развернуть</span>
                           </button>

                           <button
                              type='button'
                              onClick={() => setIsDockCollapsed(true)}
                              className='p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer'
                              title='Свернуть'
                           >
                              <ChevronDown className='w-4 h-4' />
                           </button>

                           <button
                              type='button'
                              onClick={handleCloseSession}
                              className='p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer'
                              title='Завершить работу'
                           >
                              <X className='w-4 h-4' />
                           </button>
                        </div>
                     </div>

                     {/* Текущий клиент в доке */}
                     {(() => {
                        const cur = sessionClients[currentCallIndex];
                        if (!cur) return null;

                        return (
                           <div className='p-3.5 bg-teal-50/70 border-b border-teal-100 space-y-2 shrink-0'>
                              <div className='flex items-start justify-between gap-2'>
                                 <div>
                                    <div className='font-black text-sm text-slate-900 truncate'>
                                       {cur.name}
                                    </div>
                                    <div className='text-[10px] text-slate-500 font-bold'>
                                       {cur.city} • Клиент #{currentCallIndex + 1}
                                    </div>
                                 </div>

                                 {cur.phones?.[0] && (
                                    <a
                                       href={`tel:${cur.phones[0].replace(/[^\d+]/g, '')}`}
                                       className='px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1 shadow-sm transition'
                                    >
                                       <PhoneCall className='w-3.5 h-3.5 fill-white' />
                                       <span>{cur.phones[0]}</span>
                                    </a>
                                 )}
                              </div>

                              {/* Быстрые 4 кнопки фиксации */}
                              <div className='grid grid-cols-4 gap-1.5 pt-1'>
                                 <button
                                    type='button'
                                    onClick={() => handleCallAction('ORDER_PLACED')}
                                    className='py-1.5 px-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold text-center transition cursor-pointer'
                                    title='Сделала заявку'
                                 >
                                    🛒 Заявка
                                 </button>
                                 <button
                                    type='button'
                                    onClick={() => handleOpenCallbackModal(cur)}
                                    className='py-1.5 px-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold text-center transition cursor-pointer'
                                    title='Перезвонить'
                                 >
                                    ⏰ Перезвон
                                 </button>
                                 <button
                                    type='button'
                                    onClick={() => handleCallAction('NO_ANSWER')}
                                    className='py-1.5 px-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-bold text-center transition cursor-pointer'
                                    title='Не ответили'
                                 >
                                    📵 Сброс
                                 </button>
                                 <button
                                    type='button'
                                    onClick={advanceToNextClient}
                                    className='py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold text-center transition cursor-pointer'
                                    title='Следующий'
                                 >
                                    ⏭️ След.
                                 </button>
                              </div>
                           </div>
                        );
                     })()}

                     {/* Список следующих клиентов очереди */}
                     <div className='overflow-y-auto p-2 space-y-1 divide-y divide-slate-100 flex-1'>
                        <div className='text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1'>
                           Далее по списку:
                        </div>
                        {sessionClients.map((c, idx) => {
                           const isCur = idx === currentCallIndex;
                           return (
                              <div
                                 key={c.id}
                                 onClick={() => setCurrentCallIndex(idx)}
                                 className={`p-2 rounded-xl flex items-center justify-between gap-2 text-xs transition cursor-pointer ${
                                    isCur
                                       ? 'bg-teal-50 border border-teal-300 font-bold'
                                       : 'hover:bg-slate-50 text-slate-700'
                                 }`}
                              >
                                 <div className='truncate flex items-center gap-1.5 min-w-0'>
                                    <span className='text-[10px] opacity-60'>#{idx + 1}</span>
                                    <span className='truncate'>{c.name}</span>
                                 </div>
                                 {c.phones?.[0] && (
                                    <a
                                       href={`tel:${c.phones[0].replace(/[^\d+]/g, '')}`}
                                       onClick={(e) => e.stopPropagation()}
                                       className='text-slate-400 hover:text-emerald-600 p-1 shrink-0'
                                    >
                                       <Phone className='w-3.5 h-3.5' />
                                    </a>
                                 )}
                              </div>
                           );
                        })}
                     </div>
                  </div>
               )}
            </div>
         )}

         {/* МОДАЛЬНОЕ ОКНО НАЗНАЧЕНИЯ ПЕРЕЗВОНА — ПОРТАЛ В document.body */}
         {isMounted && isCallbackModalOpen && callbackTargetClient && typeof document !== 'undefined' && createPortal(
            <div className='fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150'>
               <div className='bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150'>
                  <div className='flex items-center justify-between pb-3 border-b border-slate-100'>
                     <div className='flex items-center gap-2.5'>
                        <div className='w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold'>
                           <Clock4 className='w-5 h-5 text-amber-600' />
                        </div>
                        <div>
                           <h3 className='font-black text-slate-900 text-base'>
                              Назначить перезвон
                           </h3>
                           <p className='text-xs text-slate-500 font-semibold truncate max-w-[240px]'>
                              {callbackTargetClient.name} ({callbackTargetClient.city})
                           </p>
                        </div>
                     </div>
                     <button
                        type='button'
                        onClick={() => setIsCallbackModalOpen(false)}
                        className='p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer'
                     >
                        <X className='w-5 h-5' />
                     </button>
                  </div>

                  {/* Быстрые пресеты времени */}
                  <div className='space-y-2'>
                     <label className='text-xs font-bold text-slate-600 uppercase tracking-wider block'>
                        Когда перезвонить:
                     </label>
                     <div className='grid grid-cols-3 gap-2'>
                        {[
                           { key: '+30m', label: '+30 минут' },
                           { key: '+1h', label: '+1 час' },
                           { key: '+2h', label: '+2 часа' },
                           { key: 'tomorrow', label: 'Завтра 10:00' },
                           { key: 'custom', label: 'Своё время' },
                        ].map((p) => (
                           <button
                              key={p.key}
                              type='button'
                              onClick={() => setCallbackPreset(p.key as any)}
                              className={`py-2 px-2.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                                 callbackPreset === p.key
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                           >
                              {p.label}
                           </button>
                        ))}
                     </div>

                     {/* Если выбран ручной выбор времени */}
                     {callbackPreset === 'custom' && (
                        <div className='grid grid-cols-2 gap-2 pt-2 animate-in fade-in duration-100'>
                           <div>
                              <label className='text-[10px] font-bold text-slate-500 block mb-1'>
                                 Дата
                              </label>
                              <input
                                 type='date'
                                 value={callbackCustomDate}
                                 onChange={(e) => setCallbackCustomDate(e.target.value)}
                                 className='w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800'
                              />
                           </div>
                           <div>
                              <label className='text-[10px] font-bold text-slate-500 block mb-1'>
                                 Время
                              </label>
                              <input
                                 type='time'
                                 value={callbackCustomTime}
                                 onChange={(e) => setCallbackCustomTime(e.target.value)}
                                 className='w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800'
                              />
                           </div>
                        </div>
                     )}
                  </div>

                  {/* Источник договорённости (Звонок или Вживую) */}
                  <div className='space-y-1.5'>
                     <label className='text-xs font-bold text-slate-600 uppercase tracking-wider block'>
                        Источник договорённости:
                     </label>
                     <div className='grid grid-cols-2 gap-2'>
                        <button
                           type='button'
                           onClick={() => setCallbackSource('CALL')}
                           className={`p-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                              callbackSource === 'CALL'
                                 ? 'bg-teal-50 border-teal-500 text-teal-900 ring-1 ring-teal-500 font-extrabold'
                                 : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                           }`}
                        >
                           <Phone className='w-3.5 h-3.5' />
                           <span>По звонку</span>
                        </button>

                        <button
                           type='button'
                           onClick={() => setCallbackSource('MEETING')}
                           className={`p-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                              callbackSource === 'MEETING'
                                 ? 'bg-amber-50 border-amber-500 text-amber-900 ring-1 ring-amber-500 font-extrabold'
                                 : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                           }`}
                        >
                           <Users className='w-3.5 h-3.5' />
                           <span>Встретили вживую</span>
                        </button>
                     </div>
                  </div>

                  {/* Примечание к перезвону */}
                  <div className='space-y-1.5'>
                     <label className='text-xs font-bold text-slate-600 uppercase tracking-wider block'>
                        Примечание к перезвону:
                     </label>
                     <input
                        type='text'
                        value={callbackNote}
                        onChange={(e) => setCallbackNote(e.target.value)}
                        placeholder='Например: освободится к 15:00, спросить про форель...'
                        className='w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500'
                     />
                  </div>

                  {/* Кнопки действий */}
                  <div className='flex items-center justify-end gap-2 pt-2 border-t border-slate-100'>
                     <button
                        type='button'
                        onClick={() => setIsCallbackModalOpen(false)}
                        className='px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer'
                     >
                        Отмена
                     </button>
                     <button
                        type='button'
                        disabled={isSavingCallback}
                        onClick={handleSaveCallback}
                        className='px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md shadow-amber-500/25 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5'
                     >
                        <Clock4 className='w-4 h-4' />
                        <span>{isSavingCallback ? 'Сохранение...' : 'Запланировать перезвон'}</span>
                     </button>
                  </div>
               </div>
             </div>,
             document.body
          )}
          {/* ПЛАВАЮЩИЙ ВИДЖЕТ ОБЗВОНА — СКВОЗНОЙ ДЛЯ ВСЕХ ВКЛАДОК (Портал в document.body) */}
         {isMounted &&
            isCallingSessionActive &&
            (!isGlobalTabActive || activeViewMode !== 'workspace') &&
            typeof document !== 'undefined' &&
            createPortal(
               <div className='fixed bottom-5 right-5 z-[9999] max-w-sm w-full bg-slate-900 text-white rounded-2xl shadow-2xl border border-teal-500/40 p-4 space-y-3 backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200 select-none'>
                  {/* Dock Header */}
                  <div className='flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5'>
                     <div className='flex items-center gap-2 min-w-0'>
                        <span className='w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0'></span>
                        <div className='min-w-0'>
                           <h4 className='text-xs font-black text-white truncate'>
                              Обзвон: г. {sessionCity}
                           </h4>
                           <div className='text-[10px] text-teal-400 font-bold'>
                              Клиент {currentCallIndex + 1} из {sessionClients.length} (
                              {sessionClients.length > 0
                                 ? Math.round(
                                      (currentCallIndex / sessionClients.length) * 100
                                   )
                                 : 0}
                              %)
                           </div>
                        </div>
                     </div>
                     <div className='flex items-center gap-1 shrink-0'>
                        <button
                           type='button'
                           onClick={() => {
                              onRequestSwitchToCallingTab?.()
                              setActiveViewMode('workspace')
                           }}
                           className='px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs'
                           title='Развернуть рабочее место на весь экран'
                        >
                           <Maximize2 className='w-3 h-3' />
                           <span>Развернуть</span>
                        </button>
                        <button
                           type='button'
                           onClick={() => {
                              if (confirm('Завершить сессию обзвона?')) {
                                 handleFinishAndExitSession()
                              }
                           }}
                           className='p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer'
                           title='Завершить обзвон'
                        >
                           <X className='w-3.5 h-3.5' />
                        </button>
                     </div>
                  </div>

                  {/* Dock Content */}
                  {(() => {
                     const currentClient = sessionClients[currentCallIndex]
                     if (!currentClient || isSessionFinished) {
                        return (
                           <div className='text-xs text-center py-2 space-y-2'>
                              <p className='text-emerald-400 font-bold'>
                                 🎉 Обзвон по г. {sessionCity} завершен!
                              </p>
                              <div className='flex items-center justify-center gap-2'>
                                 <button
                                    type='button'
                                    onClick={() => {
                                       onRequestSwitchToCallingTab?.()
                                       setActiveViewMode('workspace')
                                    }}
                                    className='px-3 py-1 rounded-lg bg-teal-600 text-white text-xs font-bold'
                                 >
                                    Итоги обзвона
                                 </button>
                                 <button
                                    type='button'
                                    onClick={handleFinishAndExitSession}
                                    className='px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold'
                                 >
                                    Выйти
                                 </button>
                              </div>
                           </div>
                        )
                     }
                     const primaryPhone = currentClient.phones?.[0]
                     const cleanDigits = primaryPhone?.replace(/[^\d+]/g, '')

                     return (
                        <div className='space-y-2.5'>
                           <div>
                              <div className='text-[10px] uppercase font-bold text-slate-400 tracking-wider'>
                                 Текущий клиент:
                              </div>
                              <div className='text-sm font-black text-white truncate'>
                                 {currentClient.name}
                              </div>
                              <div className='text-[11px] text-slate-400 truncate'>
                                 {currentClient.city}
                              </div>
                           </div>

                           {/* Phone & Call Button */}
                           {primaryPhone ? (
                              <div className='flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-800/80 border border-slate-700/60'>
                                 <span className='font-mono text-xs font-black text-teal-300 truncate'>
                                    {primaryPhone}
                                 </span>
                                 <div className='flex items-center gap-1.5 shrink-0'>
                                    <button
                                       type='button'
                                       onClick={(e) =>
                                          handleCopyText(primaryPhone, 'phone', e)
                                       }
                                       className='p-1 rounded-lg hover:bg-slate-700 text-slate-300'
                                       title='Скопировать'
                                    >
                                       <Copy className='w-3.5 h-3.5' />
                                    </button>
                                    <a
                                       href={`tel:${cleanDigits}`}
                                       className='px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1 shadow-sm'
                                    >
                                       <Phone className='w-3.5 h-3.5' />
                                       <span>Набрать</span>
                                    </a>
                                 </div>
                              </div>
                           ) : (
                              <div className='text-[11px] text-amber-400'>
                                 Номера телефонов не указаны
                              </div>
                           )}

                           {/* Quick outcomes in dock */}
                           <div className='grid grid-cols-5 gap-1 pt-1'>
                              <button
                                 type='button'
                                 disabled={isSavingCallAction}
                                 onClick={() => handleCallAction('ORDER_PLACED')}
                                 className='p-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] text-center transition cursor-pointer'
                                 title='Сделала заявку'
                              >
                                 🛒 Заявка
                              </button>
                               <button
                                  type='button'
                                  disabled={isSavingCallAction}
                                  onClick={() => handleOpenCallbackModal(currentClient)}
                                  className='p-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] text-center transition cursor-pointer ring-1 ring-amber-400/50'
                                  title='Назначить перезвон'
                               >
                                  ⏰ Перезвонить
                               </button>
                              <button
                                 type='button'
                                 disabled={isSavingCallAction}
                                 onClick={() => handleCallAction('NO_ANSWER')}
                                 className='p-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] text-center transition cursor-pointer'
                                 title='Не ответили'
                              >
                                 📵 Не ответ
                              </button>
                              <button
                                 type='button'
                                 disabled={isSavingCallAction}
                                 onClick={() => handleCallAction('SKIPPED')}
                                 className='p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-[10px] text-center transition cursor-pointer'
                                 title='Пропустить'
                              >
                                 ⏭️ Пропуск
                              </button>
                              <button
                                 type='button'
                                 disabled={isSavingCallAction}
                                 onClick={() => handleCallAction('DID_NOT_PAY')}
                                 className='p-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold text-[10px] text-center transition cursor-pointer'
                                 title='Не оплатила'
                              >
                                 ⚠️ Не опл.
                              </button>
                           </div>

                           <div className='text-[10px] text-slate-400 text-center pt-0.5'>
                              Работа не сбрасывается при переходе между вкладками
                           </div>
                        </div>
                     )
                  })()}
               </div>,
               document.body
            )}

         {/* МОДАЛЬНОЕ ОКНО ФИКСАЦИИ ПЕРЕЗВОНОВ («ЖДУТ ЗВОНКА») — Портал в document.body */}
         {isMounted &&
            isWaitingCallbacksModalOpen &&
            typeof document !== 'undefined' &&
            createPortal(
               <div className='fixed inset-0 z-[10000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto'>
                  <div className='bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[90vh]'>
                     {/* Шапка модалки */}
                     <div className='p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-800 flex items-center justify-between shrink-0'>
                        <div className='flex items-center gap-2.5'>
                           <div className='w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center'>
                              <Flame className='w-5 h-5 animate-pulse' />
                           </div>
                           <div>
                              <h3 className='font-black text-base sm:text-lg text-white'>
                                 Ждут повторного звонка ({activeCallbacks.dueNow.length})
                              </h3>
                              <p className='text-xs text-slate-300'>
                                 Зафиксируйте итог звонка по каждому клиенту
                              </p>
                           </div>
                        </div>
                        <button
                           type='button'
                           onClick={() => setIsWaitingCallbacksModalOpen(false)}
                           className='p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer'
                        >
                           <X className='w-5 h-5' />
                        </button>
                     </div>

                     {/* Список ожидающих клиентов */}
                     <div className='p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-slate-50/50'>
                        {activeCallbacks.dueNow.length === 0 ? (
                           <div className='text-center py-8 text-slate-500 space-y-2'>
                              <CheckCircle2 className='w-12 h-12 text-emerald-500 mx-auto' />
                              <p className='font-bold text-slate-800'>
                                 Все перезвоны отработаны!
                              </p>
                              <p className='text-xs text-slate-400'>
                                 Нет клиентов, ожидающих повторного звонка прямо сейчас.
                              </p>
                           </div>
                        ) : (
                           activeCallbacks.dueNow.map((client) => {
                              const isThisFixating = fixatingClientId === client.id
                              const primaryPhone = client.phones?.[0]
                              const cleanDigits = primaryPhone?.replace(/[^\d+]/g, '')

                              return (
                                 <div
                                    key={client.id}
                                    className='p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3'
                                 >
                                    <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2'>
                                       <div>
                                          <div className='flex items-center gap-2'>
                                             <h4 className='font-black text-base text-slate-900'>
                                                {client.name}
                                             </h4>
                                             <span className='px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200'>
                                                {client.city}
                                             </span>
                                          </div>
                                          {client.callbackNote && (
                                             <p className='text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg mt-1 inline-block font-medium'>
                                                💬 {client.callbackNote}
                                             </p>
                                          )}
                                       </div>

                                       {/* Телефон и быстрый набор */}
                                       {primaryPhone && (
                                          <div className='flex items-center gap-2'>
                                             <span className='font-mono font-bold text-sm text-slate-800'>
                                                {primaryPhone}
                                             </span>
                                             <button
                                                type='button'
                                                onClick={(e) =>
                                                   handleCopyText(
                                                      primaryPhone,
                                                      'phone',
                                                      e
                                                   )
                                                }
                                                className='p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600'
                                                title='Скопировать'
                                             >
                                                <Copy className='w-3.5 h-3.5' />
                                             </button>
                                             <a
                                                href={`tel:${cleanDigits}`}
                                                className='px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm flex items-center gap-1'
                                             >
                                                <Phone className='w-3.5 h-3.5' />
                                                <span>Набрать</span>
                                             </a>
                                          </div>
                                       )}
                                    </div>

                                    {/* 4 Кнопки исхода (БЕЗ "Поговорили (заявка пока не нужна)") */}
                                    <div className='pt-2 border-t border-slate-100'>
                                       <div className='text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2'>
                                          Зафиксировать результат звонка:
                                       </div>
                                       <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
                                          {/* 1. Сделала заявку */}
                                          <button
                                             type='button'
                                             onClick={() => {
                                                setFixatingClientId(client.id)
                                                setFixatingAction('ORDER_PLACED')
                                                setFixatingOrderNote('')
                                             }}
                                             className={`p-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs ${
                                                isThisFixating &&
                                                fixatingAction === 'ORDER_PLACED'
                                                   ? 'bg-emerald-700 text-white ring-2 ring-emerald-500'
                                                   : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                                             }`}
                                          >
                                             <ShoppingBag className='w-4 h-4 shrink-0' />
                                             <span>🛒 Заявка</span>
                                          </button>

                                          {/* 2. Перенести */}
                                          <button
                                             type='button'
                                             onClick={() => {
                                                setFixatingClientId(client.id)
                                                setFixatingAction('CALLBACK')
                                                setFixatingCallbackPreset('+30m')
                                                setFixatingCallbackNote('')
                                             }}
                                             className={`p-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs ${
                                                isThisFixating &&
                                                fixatingAction === 'CALLBACK'
                                                   ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                                                   : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                                             }`}
                                          >
                                             <Clock className='w-4 h-4 shrink-0' />
                                             <span>⏰ Перенести</span>
                                          </button>

                                          {/* 3. Не ответил */}
                                          <button
                                             type='button'
                                             onClick={() => {
                                                setFixatingClientId(client.id)
                                                setFixatingAction('NO_ANSWER')
                                             }}
                                             className={`p-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs ${
                                                isThisFixating &&
                                                fixatingAction === 'NO_ANSWER'
                                                   ? 'bg-slate-800 text-white ring-2 ring-slate-600'
                                                   : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                                             }`}
                                          >
                                             <PhoneMissed className='w-4 h-4 shrink-0' />
                                             <span>📵 Не ответ</span>
                                          </button>

                                          {/* 4. Закрылись / Перестали */}
                                          <button
                                             type='button'
                                             onClick={() => {
                                                setFixatingClientId(client.id)
                                                setFixatingAction('STOPPED')
                                             }}
                                             className={`p-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs ${
                                                isThisFixating &&
                                                fixatingAction === 'STOPPED'
                                                   ? 'bg-rose-700 text-white ring-2 ring-rose-500'
                                                   : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300'
                                             }`}
                                          >
                                             <XCircle className='w-4 h-4 shrink-0' />
                                             <span>⛔ Закрылись</span>
                                          </button>
                                       </div>

                                       {/* Инлайн форма подтверждения для выбранного действия */}
                                        {isThisFixating && fixatingAction === 'ORDER_PLACED' && (
                                           <div className='mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150'>
                                              <div className='text-xs font-bold text-emerald-950'>
                                                 Подтвердить оформление заявки от клиента?
                                              </div>
                                              <div className='flex items-center justify-end gap-2 shrink-0'>
                                                 <button
                                                    type='button'
                                                    onClick={() => {
                                                       setFixatingClientId(null)
                                                       setFixatingAction(null)
                                                    }}
                                                    className='px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100 font-semibold cursor-pointer'
                                                 >
                                                    Отмена
                                                 </button>
                                                 <button
                                                    type='button'
                                                    disabled={isFixatingSubmitting}
                                                    onClick={() =>
                                                       handleFixateCallOutcome(
                                                          client,
                                                          'ORDER_PLACED'
                                                       )
                                                    }
                                                    className='px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm disabled:opacity-50 cursor-pointer'
                                                 >
                                                    Подтвердить заявку
                                                 </button>
                                              </div>
                                           </div>
                                        )}

                                       {isThisFixating && fixatingAction === 'CALLBACK' && (
                                          <div className='mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2 animate-in fade-in duration-150'>
                                             <div className='text-xs font-bold text-amber-950'>
                                                Перенести звонок на другое время:
                                             </div>
                                             <div className='flex items-center gap-1.5 flex-wrap'>
                                                {[
                                                   { id: '+30m', label: '+30 минут' },
                                                   { id: '+1h', label: '+1 час' },
                                                   { id: '+2h', label: '+2 часа' },
                                                   {
                                                      id: 'tomorrow',
                                                      label: 'Завтра 10:00',
                                                   },
                                                ].map((preset) => (
                                                   <button
                                                      key={preset.id}
                                                      type='button'
                                                      onClick={() =>
                                                         setFixatingCallbackPreset(
                                                            preset.id as any
                                                         )
                                                      }
                                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                                                         fixatingCallbackPreset ===
                                                         preset.id
                                                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                                                            : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100'
                                                      }`}
                                                   >
                                                      {preset.label}
                                                   </button>
                                                ))}
                                             </div>
                                             <input
                                                type='text'
                                                value={fixatingCallbackNote}
                                                onChange={(e) =>
                                                   setFixatingCallbackNote(
                                                      e.target.value
                                                   )
                                                }
                                                placeholder='Примечание (например: перезвонить Сергею)...'
                                                className='w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500'
                                             />
                                             <div className='flex items-center justify-end gap-2'>
                                                <button
                                                   type='button'
                                                   onClick={() => {
                                                      setFixatingClientId(null)
                                                      setFixatingAction(null)
                                                   }}
                                                   className='px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100 font-semibold'
                                                >
                                                   Отмена
                                                </button>
                                                <button
                                                   type='button'
                                                   disabled={isFixatingSubmitting}
                                                   onClick={() =>
                                                      handleFixateCallOutcome(
                                                         client,
                                                         'CALLBACK',
                                                         {
                                                            callbackPreset:
                                                               fixatingCallbackPreset,
                                                            callbackNote:
                                                               fixatingCallbackNote,
                                                         }
                                                      )
                                                   }
                                                   className='px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-sm disabled:opacity-50'
                                                >
                                                   Сохранить перенос
                                                </button>
                                             </div>
                                          </div>
                                       )}

                                       {isThisFixating && fixatingAction === 'NO_ANSWER' && (
                                          <div className='mt-3 p-3 bg-slate-100 rounded-xl border border-slate-300 space-y-2 animate-in fade-in duration-150'>
                                             <div className='text-xs font-bold text-slate-900'>
                                                Клиент не ответил на звонок:
                                             </div>
                                             <div className='flex items-center gap-2 flex-wrap'>
                                                <button
                                                   type='button'
                                                   disabled={isFixatingSubmitting}
                                                   onClick={() =>
                                                      handleFixateCallOutcome(
                                                         client,
                                                         'NO_ANSWER',
                                                         { rescheduleMinutes: 20 }
                                                      )
                                                   }
                                                   className='px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm'
                                                >
                                                   ⏰ Напомнить через 20 минут
                                                </button>
                                                <button
                                                   type='button'
                                                   disabled={isFixatingSubmitting}
                                                   onClick={() =>
                                                      handleFixateCallOutcome(
                                                         client,
                                                         'NO_ANSWER'
                                                      )
                                                   }
                                                   className='px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-sm'
                                                >
                                                   Снять перезвон («Не ответили»)
                                                </button>
                                                <button
                                                   type='button'
                                                   onClick={() => {
                                                      setFixatingClientId(null)
                                                      setFixatingAction(null)
                                                   }}
                                                   className='px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-200'
                                                >
                                                   Отмена
                                                </button>
                                             </div>
                                          </div>
                                       )}

                                       {isThisFixating && fixatingAction === 'STOPPED' && (
                                          <div className='mt-3 p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-2 animate-in fade-in duration-150'>
                                             <div className='text-xs font-bold text-rose-900'>
                                                Подтвердите: клиент закрылся или перестал
                                                работать
                                             </div>
                                             <p className='text-[11px] text-rose-700'>
                                                Клиент будет переведен в категорию
                                                «Перестали», а перезвон будет снят.
                                             </p>
                                             <div className='flex items-center justify-end gap-2'>
                                                <button
                                                   type='button'
                                                   onClick={() => {
                                                      setFixatingClientId(null)
                                                      setFixatingAction(null)
                                                   }}
                                                   className='px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100 font-semibold'
                                                >
                                                   Отмена
                                                </button>
                                                <button
                                                   type='button'
                                                   disabled={isFixatingSubmitting}
                                                   onClick={() =>
                                                      handleFixateCallOutcome(
                                                         client,
                                                         'STOPPED'
                                                      )
                                                   }
                                                   className='px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm disabled:opacity-50'
                                                >
                                                   Подтвердить: «Перестали»
                                                </button>
                                             </div>
                                          </div>
                                       )}
                                    </div>
                                 </div>
                              )
                           })
                        )}
                     </div>

                     {/* Подвал */}
                     <div className='p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0'>
                        <span className='text-xs text-slate-500'>
                           Осталось в очереди:{' '}
                           <strong className='text-slate-800'>
                              {activeCallbacks.dueNow.length}
                           </strong>
                        </span>
                        <button
                           type='button'
                           onClick={() => setIsWaitingCallbacksModalOpen(false)}
                           className='px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer transition'
                        >
                           Закрыть
                        </button>
                     </div>
                  </div>
               </div>,
               document.body
            )}
      </div>
   )
}
