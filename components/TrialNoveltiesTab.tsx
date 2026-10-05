'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import {
   Sparkles,
   Plus,
   Search,
   Layers,
   Calendar,
   Image as ImageIcon,
   RotateCcw,
   CheckCircle2,
   Trash2,
   Pencil,
   Eye,
   X,
   Upload,
   FlaskConical,
   ChefHat,
   MessageSquare,
   AlertCircle,
   HelpCircle,
   FileText,
   Clock,
   Check,
   Play,
   Video,
   Film,
   ChevronLeft,
   ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export interface MediaItem {
   url: string
   type: 'image' | 'video'
   name?: string
   size?: number
}

export interface TrialNovelty {
   id: string
   name: string
   description?: string | null
   imageUrl?: string | null
   mediaFiles?: MediaItem[] | null
   category?: string | null
   status: 'IDEA' | 'IN_TRIAL' | 'TESTED' | 'FAILED' | string
   trialWeekId?: string | null
   trialWeek?: {
      id: string
      year: number
      weekNumber: number
      status: string
   } | null
   plannedAt?: string | null
   testedAt?: string | null
   resultStatus?: string | null
   resultComment?: string | null
   createdBy?: string | null
   createdAt: string
   updatedAt: string
}

interface TrialNoveltiesTabProps {
   currentWeek: any
   onStatsChange?: (stats: {
      total: number
      inTrial: number
      ideas: number
   }) => void
   onPlanChanged?: () => void
}

export default function TrialNoveltiesTab({
   currentWeek,
   onStatsChange,
   onPlanChanged,
}: TrialNoveltiesTabProps) {
   const { user, hasPermission } = useAuth()

   const [items, setItems] = useState<TrialNovelty[]>([])
   const [categories, setCategories] = useState<string[]>([])
   const [loading, setLoading] = useState(true)

   // Фильтры
   const [filterTab, setFilterTab] = useState<
      'all' | 'in_trial' | 'idea' | 'tested'
   >('all')
   const [search, setSearch] = useState('')
   const [selectedCategory, setSelectedCategory] = useState('ALL')

   // Модальные окна
   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
   const [editingItem, setEditingItem] = useState<TrialNovelty | null>(null)
   const [completingItem, setCompletingItem] = useState<TrialNovelty | null>(
      null
   )
   const [activeGallery, setActiveGallery] = useState<{
      title: string
      items: MediaItem[]
      index: number
   } | null>(null)

   // Форма добавления/редактирования
   const [formName, setFormName] = useState('')
   const [formCategory, setFormCategory] = useState('')
   const [existingMedia, setExistingMedia] = useState<MediaItem[]>([])
   const [newMediaFiles, setNewMediaFiles] = useState<{
      id: string
      file: File
      preview: string
      type: 'image' | 'video'
   }[]>([])
   const [formAddToPlan, setFormAddToPlan] = useState(false)
   const [isSubmitting, setIsSubmitting] = useState(false)
   const fileInputRef = useRef<HTMLInputElement | null>(null)

   // Форма завершения пробы
   const [completeStatus, setCompleteStatus] = useState<'SUCCESS' | 'FAILED'>(
      'SUCCESS'
   )
   const [completeComment, setCompleteComment] = useState('')
   const [completeReturnToIdeas, setCompleteReturnToIdeas] = useState(false)
   const [isCompleting, setIsCompleting] = useState(false)

   // Горячие клавиши для галереи (Esc, Стрелки влево/вправо)
   useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
         if (!activeGallery) return
         if (e.key === 'Escape') {
            setActiveGallery(null)
         } else if (e.key === 'ArrowRight' && activeGallery.items.length > 1) {
            setActiveGallery((prev) =>
               prev
                  ? {
                       ...prev,
                       index: (prev.index + 1) % prev.items.length,
                    }
                  : null
            )
         } else if (e.key === 'ArrowLeft' && activeGallery.items.length > 1) {
            setActiveGallery((prev) =>
               prev
                  ? {
                       ...prev,
                       index:
                          (prev.index - 1 + prev.items.length) %
                          prev.items.length,
                    }
                  : null
            )
         }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
   }, [activeGallery])

   // Загрузка новинок с бэкенда
   const fetchItems = async () => {
      try {
         setLoading(true)
         const res = await api.get('/api/trial-novelties')
         const loadedItems: TrialNovelty[] = res.data?.items || []
         setItems(loadedItems)
         setCategories(res.data?.categories || [])

         // Уведомляем родителя о статистике
         if (onStatsChange) {
            const inTrial = loadedItems.filter(
               (i) => i.status === 'IN_TRIAL'
            ).length
            const ideas = loadedItems.filter((i) => i.status === 'IDEA').length
            onStatsChange({
               total: loadedItems.length,
               inTrial,
               ideas,
            })
         }
      } catch (err: any) {
         console.error('Failed to load trial novelties:', err)
         toast.error('Не удалось загрузить вторые новинки')
      } finally {
         setLoading(false)
      }
   }

   useEffect(() => {
      fetchItems()
   }, [])

   // Вспомогательная функция для формирования правильного URL фото и видео
   const getFullMediaUrl = (path?: string | null) => {
      if (!path) return ''
      if (path.startsWith('http://') || path.startsWith('https://')) return path
      const backendUrl =
         process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'
      return `${backendUrl.replace(/\/$/, '')}${path}`
   }
   const getFullImageUrl = getFullMediaUrl

   // Открытие модалки создания
   const handleOpenCreate = () => {
      setEditingItem(null)
      setFormName('')
      setFormCategory('')
      setExistingMedia([])
      newMediaFiles.forEach((m) => URL.revokeObjectURL(m.preview))
      setNewMediaFiles([])
      setFormAddToPlan(false)
      setIsCreateModalOpen(true)
   }

   // Открытие модалки редактирования
   const handleOpenEdit = (item: TrialNovelty) => {
      setEditingItem(item)
      setFormName(item.name)
      setFormCategory(item.category || '')
      const media: MediaItem[] =
         Array.isArray(item.mediaFiles) && item.mediaFiles.length > 0
            ? [...item.mediaFiles]
            : item.imageUrl
              ? [{ url: item.imageUrl, type: 'image', name: 'Главное фото' }]
              : []
      setExistingMedia(media)
      newMediaFiles.forEach((m) => URL.revokeObjectURL(m.preview))
      setNewMediaFiles([])
      setFormAddToPlan(item.status === 'IN_TRIAL')
      setIsCreateModalOpen(true)
   }

   // Обработка выбора файлов (неограниченно фото и видео)
   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      const added: {
         id: string
         file: File
         preview: string
         type: 'image' | 'video'
      }[] = []

      Array.from(files).forEach((file) => {
         const isVideo = file.type.startsWith('video/')
         const isImage = file.type.startsWith('image/')
         if (!isImage && !isVideo) {
            toast.error(
               `Файл "${file.name}" не поддерживается (разрешены только фото и видео)`
            )
            return
         }
         const preview = URL.createObjectURL(file)
         added.push({
            id: Math.random().toString(36).substring(2, 9),
            file,
            preview,
            type: isVideo ? 'video' : 'image',
         })
      })

      if (added.length > 0) {
         setNewMediaFiles((prev) => [...prev, ...added])
      }
      if (fileInputRef.current) {
         fileInputRef.current.value = ''
      }
   }

   const handleRemoveExistingMedia = (index: number) => {
      setExistingMedia((prev) => prev.filter((_, i) => i !== index))
   }

   const handleRemoveNewMedia = (id: string) => {
      setNewMediaFiles((prev) => {
         const found = prev.find((m) => m.id === id)
         if (found) URL.revokeObjectURL(found.preview)
         return prev.filter((m) => m.id !== id)
      })
   }

   // Отправка формы (создание или редактирование)
   const handleSubmitForm = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!formName.trim()) {
         toast.error('Введите наименование новинки')
         return
      }

      try {
         setIsSubmitting(true)
         const formData = new FormData()
         formData.append('name', formName.trim())
         formData.append('category', formCategory.trim())

         // Передаем оставшиеся существующие медиафайлы
         formData.append('existingMedia', JSON.stringify(existingMedia))

         // Передаем все новые файлы
         newMediaFiles.forEach((m) => {
            formData.append('media', m.file)
         })

         if (editingItem) {
            await api.put(`/api/trial-novelties/${editingItem.id}`, formData, {
               headers: { 'Content-Type': 'multipart/form-data' },
            })
            toast.success('Новинка успешно обновлена!')
         } else {
            if (formAddToPlan && currentWeek?.id) {
               formData.append('weekId', currentWeek.id)
               formData.append('addToPlan', 'true')
            }
            await api.post('/api/trial-novelties', formData, {
               headers: { 'Content-Type': 'multipart/form-data' },
            })
            toast.success(
               formAddToPlan
                  ? 'Новинка создана и включена в план недели!'
                  : 'Новинка добавлена в банк идей!'
            )
         }

         setIsCreateModalOpen(false)
         fetchItems()
         onPlanChanged?.()
      } catch (err: any) {
         toast.error(
            err.response?.data?.error || 'Ошибка при сохранении новинки'
         )
      } finally {
         setIsSubmitting(false)
      }
   }

   // Включение в план недели ИЛИ возврат обратно в новинки
   const handleTogglePlan = async (item: TrialNovelty, addToPlan: boolean) => {
      try {
         if (addToPlan && !currentWeek?.id) {
            toast.error('Активная производственная неделя не найдена')
            return
         }

         const res = await api.post(
            `/api/trial-novelties/${item.id}/toggle-plan`,
            {
               weekId: currentWeek?.id,
               addToPlan,
            }
         )

         if (addToPlan) {
            toast.success(
               `Новинка «${item.name}» добавлена в план отработки на эту неделю! 🔥`
            )
         } else {
            toast(
               `Новинка «${item.name}» возвращена в банк идей (план не выполнился) ↩️`,
               {
                  icon: '🔄',
               }
            )
         }

         setItems((prev) => prev.map((i) => (i.id === item.id ? res.data : i)))
         onPlanChanged?.()
      } catch (err: any) {
         toast.error(err.response?.data?.error || 'Ошибка переключения плана')
      }
   }

   // Завершение отработки (дегустация / итог)
   const handleCompleteTrial = async () => {
      if (!completingItem) return

      try {
         setIsCompleting(true)
         const res = await api.post(
            `/api/trial-novelties/${completingItem.id}/complete`,
            {
               resultStatus: completeStatus,
               resultComment: completeComment,
               returnToIdeas: completeReturnToIdeas,
            }
         )

         if (completeReturnToIdeas) {
            toast.success(
               `Новинка «${completingItem.name}» возвращена в банк идей с комментариями`
            )
         } else {
            toast.success(
               `Отработка новинки «${completingItem.name}» успешно завершена! ✨`
            )
         }

         setCompletingItem(null)
         setCompleteComment('')
         setCompleteReturnToIdeas(false)
         setItems((prev) =>
            prev.map((i) => (i.id === completingItem.id ? res.data : i))
         )
         onPlanChanged?.()
      } catch (err: any) {
         toast.error(err.response?.data?.error || 'Ошибка завершения отработки')
      } finally {
         setIsCompleting(false)
      }
   }

   // Удаление новинки
   const handleDelete = async (item: TrialNovelty) => {
      if (!confirm(`Удалить новинку «${item.name}» безвозвратно?`)) {
         return
      }

      try {
         await api.delete(`/api/trial-novelties/${item.id}`)
         toast.success('Новинка удалена')
         setItems((prev) => prev.filter((i) => i.id !== item.id))
         onPlanChanged?.()
      } catch (err: any) {
         toast.error(err.response?.data?.error || 'Ошибка удаления новинки')
      }
   }

   // Статистика
   const inTrialCount = items.filter((i) => i.status === 'IN_TRIAL').length
   const ideaCount = items.filter((i) => i.status === 'IDEA').length
   const testedCount = items.filter((i) => i.status === 'TESTED').length

   // Фильтрация элементов
   const filteredItems = useMemo(() => {
      return items.filter((item) => {
         // Таб-фильтр
         if (filterTab === 'in_trial' && item.status !== 'IN_TRIAL')
            return false
         if (filterTab === 'idea' && item.status !== 'IDEA') return false
         if (filterTab === 'tested' && item.status !== 'TESTED') return false

         // Категория
         if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
            return false
         }

         // Поиск
         if (search.trim()) {
            const query = search.toLowerCase()
            const matchName = item.name.toLowerCase().includes(query)
            const matchCat = item.category?.toLowerCase().includes(query)
            if (!matchName && !matchCat) return false
         }

         return true
      })
   }, [items, filterTab, selectedCategory, search])

   return (
      <div className='space-y-6'>
         {/* ═══ ВЕРХНЯЯ ШАПКА РАЗДЕЛА ═══ */}
         <div className='bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-700/50'>
            {/* Фоновые декоративные элементы */}
            <div className='absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none' />
            <div className='absolute bottom-0 right-1/4 -mb-10 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none' />

            <div className='relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6'>
               <div className='space-y-2 max-w-2xl'>
                  <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold tracking-wide uppercase'>
                     <FlaskConical className='w-3.5 h-3.5 text-teal-400' />
                     <span>Лаборатория идей цеха</span>
                  </div>
                  <h2 className='text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3'>
                     <span>Вторые новинки (В отработке)</span>
                     <span className='text-sm font-semibold px-2.5 py-0.5 rounded-lg bg-teal-500/30 text-teal-200 border border-teal-400/30'>
                        {items.length} идей
                     </span>
                  </h2>
                  <p className='text-slate-300 text-xs sm:text-sm leading-relaxed'>
                     Экспериментальные позиции цеха на пробу.
                     Хранятся в отдельной таблице,{' '}
                     <strong className='text-teal-300 font-semibold'>
                        не влияют на прайс-лист 1С
                     </strong>{' '}
                     и не уходят в витрину клиентов. Добавляйте в план недели, а
                     если не успели — возвращайте обратно в идеи одним кликом.
                  </p>
               </div>

               {/* Кнопка создания новой идеи */}
               <div className='flex items-center gap-3 shrink-0'>
                  <button
                     type='button'
                     onClick={handleOpenCreate}
                     className='inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-sm shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'
                  >
                     <Plus className='w-5 h-5 stroke-[2.5]' />
                     <span>Добавить идею новинки</span>
                  </button>
               </div>
            </div>

            {/* Сводные плашки статистики */}
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-700/60'>
               <div
                  onClick={() => setFilterTab('all')}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                     filterTab === 'all'
                        ? 'bg-white/15 border-white/40 shadow-inner'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
               >
                  <div className='text-[11px] font-semibold text-slate-400 uppercase tracking-wider'>
                     Все позиции
                  </div>
                  <div className='text-xl sm:text-2xl font-black text-white mt-0.5'>
                     {items.length}
                  </div>
               </div>

               <div
                  onClick={() => setFilterTab('in_trial')}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                     filterTab === 'in_trial'
                        ? 'bg-amber-500/25 border-amber-400/50 shadow-inner'
                        : 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20'
                  }`}
               >
                  <div className='text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5'>
                     <span className='w-2 h-2 rounded-full bg-amber-400 animate-pulse' />
                     <span>В отработке</span>
                  </div>
                  <div className='text-xl sm:text-2xl font-black text-amber-200 mt-0.5'>
                     {inTrialCount}
                  </div>
               </div>

               <div
                  onClick={() => setFilterTab('idea')}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                     filterTab === 'idea'
                        ? 'bg-indigo-500/25 border-indigo-400/50 shadow-inner'
                        : 'bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20'
                  }`}
               >
                  <div className='text-[11px] font-bold text-indigo-300 uppercase tracking-wider'>
                     Банк идей
                  </div>
                  <div className='text-xl sm:text-2xl font-black text-indigo-200 mt-0.5'>
                     {ideaCount}
                  </div>
               </div>

               <div
                  onClick={() => setFilterTab('tested')}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                     filterTab === 'tested'
                        ? 'bg-emerald-500/25 border-emerald-400/50 shadow-inner'
                        : 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                  }`}
               >
                  <div className='text-[11px] font-bold text-emerald-300 uppercase tracking-wider'>
                     Отработано
                  </div>
                  <div className='text-xl sm:text-2xl font-black text-emerald-200 mt-0.5'>
                     {testedCount}
                  </div>
               </div>
            </div>
         </div>

         {/* ═══ ПАНЕЛЬ ФИЛЬТРОВ И ПОИСКА ═══ */}
         <div className='bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4'>
            {/* Вкладки статусов */}
            <div className='flex flex-wrap items-center gap-1.5'>
               <button
                  type='button'
                  onClick={() => setFilterTab('all')}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
                     filterTab === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
               >
                  <span>Все</span>
                  <span className='px-1.5 py-0.5 rounded-full text-[10px] bg-slate-700 text-slate-200'>
                     {items.length}
                  </span>
               </button>

               <button
                  type='button'
                  onClick={() => setFilterTab('in_trial')}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
                     filterTab === 'in_trial'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20 ring-1 ring-amber-500'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
               >
                  <span>🔥 В отработке</span>
                  {inTrialCount > 0 && (
                     <span className='px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-extrabold'>
                        {inTrialCount}
                     </span>
                  )}
               </button>

               <button
                  type='button'
                  onClick={() => setFilterTab('idea')}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
                     filterTab === 'idea'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100'
                  }`}
               >
                  <span>💡 Банк идей</span>
                  <span className='px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-200 text-indigo-900'>
                     {ideaCount}
                  </span>
               </button>

               <button
                  type='button'
                  onClick={() => setFilterTab('tested')}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
                     filterTab === 'tested'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
               >
                  <span>✅ Отработано</span>
                  <span className='px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-200 text-emerald-900'>
                     {testedCount}
                  </span>
               </button>
            </div>

            {/* Поиск и Категории */}
            <div className='flex flex-wrap sm:flex-nowrap items-center gap-2.5'>
               <div className='relative flex-1 min-w-[200px]'>
                  <Search className='w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2' />
                  <input
                     type='text'
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     placeholder='Поиск новинок по названию...'
                     className='w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition'
                  />
               </div>

               <div className='flex items-center gap-1.5'>
                  <Layers className='w-4 h-4 text-slate-400 hidden sm:block' />
                  <select
                     value={selectedCategory}
                     onChange={(e) => setSelectedCategory(e.target.value)}
                     className='px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer'
                  >
                     <option value='ALL'>Все категории</option>
                     {categories.map((c) => (
                        <option key={c} value={c}>
                           {c}
                        </option>
                     ))}
                  </select>
               </div>
            </div>
         </div>

         {/* ═══ ГАЛЕРЕЯ КАРТОЧЕК ВТОРЫХ НОВИНОК ═══ */}
         {loading ? (
            <div className='p-16 text-center text-slate-400 text-sm bg-white rounded-3xl border border-slate-200'>
               Загрузка галереи новинок...
            </div>
         ) : filteredItems.length === 0 ? (
            <div className='p-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-4'>
               <div className='w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shadow-inner'>
                  <Sparkles className='w-8 h-8' />
               </div>
               <div className='space-y-1 max-w-sm mx-auto'>
                  <h3 className='text-base font-bold text-slate-900'>
                     Новинки не найдены
                  </h3>
                  <p className='text-xs text-slate-500 leading-relaxed'>
                     {search ||
                     selectedCategory !== 'ALL' ||
                     filterTab !== 'all'
                        ? 'Попробуйте сбросить фильтры или изменить поисковый запрос'
                        : 'В банке идей пока нет позиций. Создайте первую новинку с красивым фото и добавьте её на пробу цеха!'}
                  </p>
               </div>
               <button
                  type='button'
                  onClick={handleOpenCreate}
                  className='inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition cursor-pointer'
               >
                  <Plus className='w-4 h-4' />
                  <span>Добавить первую новинку</span>
               </button>
            </div>
         ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'>
               {filteredItems.map((item) => {
                  const allMedia: MediaItem[] =
                     Array.isArray(item.mediaFiles) && item.mediaFiles.length > 0
                        ? item.mediaFiles
                        : item.imageUrl
                          ? [{ url: item.imageUrl, type: 'image', name: 'Фото' }]
                          : []

                  const firstMedia = allMedia[0]
                  const isVideoCover = firstMedia?.type === 'video'
                  const coverUrl = firstMedia
                     ? getFullMediaUrl(firstMedia.url)
                     : null
                  const totalCount = allMedia.length
                  const videoCount = allMedia.filter(
                     (m) => m.type === 'video'
                  ).length
                  const imageCount = allMedia.filter(
                     (m) => m.type === 'image'
                  ).length

                  const isInTrial = item.status === 'IN_TRIAL'
                  const isIdea = item.status === 'IDEA'
                  const isTested = item.status === 'TESTED'

                  return (
                     <div
                        key={item.id}
                        className={`bg-white rounded-3xl border transition-all duration-200 shadow-sm hover:shadow-xl flex flex-col overflow-hidden group ${
                           isInTrial
                              ? 'border-amber-300 ring-2 ring-amber-400/30'
                              : isTested
                                ? 'border-emerald-200'
                                : 'border-slate-200 hover:border-slate-300'
                        }`}
                     >
                        {/* 1. Блок фото / видео / медиа */}
                        <div className='relative aspect-[4/3] bg-slate-100 overflow-hidden select-none'>
                           {coverUrl ? (
                              <div
                                 onClick={() =>
                                    setActiveGallery({
                                       title: item.name,
                                       items: allMedia,
                                       index: 0,
                                    })
                                 }
                                 className='w-full h-full relative cursor-pointer group/media'
                              >
                                 {isVideoCover ? (
                                    <div className='w-full h-full relative bg-slate-950 flex items-center justify-center'>
                                       <video
                                          src={coverUrl}
                                          preload='metadata'
                                          muted
                                          playsInline
                                          className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90'
                                       />
                                       <div className='absolute inset-0 flex items-center justify-center bg-black/30 group-hover/media:bg-black/15 transition'>
                                          <div className='w-12 h-12 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow-xl group-hover/media:scale-110 transition'>
                                             <Play className='w-6 h-6 fill-slate-900 translate-x-0.5' />
                                          </div>
                                       </div>
                                    </div>
                                 ) : (
                                    <img
                                       src={coverUrl}
                                       alt={item.name}
                                       className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'
                                    />
                                 )}

                                 {/* Бейдж счетчика медиа в углу */}
                                 <div className='absolute bottom-3 right-3 flex items-center gap-1.5'>
                                    {totalCount > 1 && (
                                       <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-bold shadow-md'>
                                          {videoCount > 0 && (
                                             <span>🎥 {videoCount}</span>
                                          )}
                                          {videoCount > 0 &&
                                             imageCount > 0 && <span>•</span>}
                                          {imageCount > 0 && (
                                             <span>📷 {imageCount}</span>
                                          )}
                                       </span>
                                    )}

                                    {/* Кнопка быстрого открытия галереи */}
                                    <button
                                       type='button'
                                       onClick={(e) => {
                                          e.stopPropagation()
                                          setActiveGallery({
                                             title: item.name,
                                             items: allMedia,
                                             index: 0,
                                          })
                                       }}
                                       className='p-1.5 rounded-xl bg-slate-950/70 text-white hover:bg-slate-950 transition opacity-0 group-hover:opacity-100 shadow-md backdrop-blur-xs cursor-pointer'
                                       title='Открыть просмотр'
                                    >
                                       {isVideoCover ? (
                                          <Play className='w-4 h-4 fill-white' />
                                       ) : (
                                          <Eye className='w-4 h-4' />
                                       )}
                                    </button>
                                 </div>
                              </div>
                           ) : (
                              <div
                                 onClick={() => {}}
                                 className='w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 p-4 text-center cursor-default'
                              >
                                 <ImageIcon className='w-10 h-10 stroke-[1.5] text-slate-300 mb-1' />
                                 <span className='text-[11px] font-medium text-slate-400'>
                                    Медиа не загружено
                                 </span>
                              </div>
                           )}

                           {/* Бейдж статуса в углу фото */}
                           <div className='absolute top-3 left-3 flex flex-col gap-1 z-10 pointer-events-none'>
                              {isInTrial && (
                                 <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white text-[11px] font-black uppercase tracking-wider shadow-md backdrop-blur-xs ring-1 ring-amber-400'>
                                    <span className='w-1.5 h-1.5 rounded-full bg-white animate-ping' />
                                    <span>
                                       В отработке{' '}
                                       {item.trialWeek
                                          ? `• Нед. №${item.trialWeek.weekNumber}`
                                          : ''}
                                    </span>
                                 </span>
                              )}
                              {isIdea && (
                                 <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900/80 text-white text-[10px] font-bold backdrop-blur-xs shadow-xs'>
                                    <span>💡 В банке идей</span>
                                 </span>
                              )}
                              {isTested && (
                                 <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-xs shadow-xs'>
                                    <CheckCircle2 className='w-3 h-3' />
                                    <span>Отработано</span>
                                 </span>
                              )}
                           </div>

                           {/* Категория (если указана) */}
                           {item.category && (
                              <span className='absolute bottom-3 left-3 px-2 py-0.5 rounded-lg bg-white/90 text-slate-800 text-[10px] font-bold backdrop-blur-xs shadow-2xs'>
                                 {item.category}
                              </span>
                           )}
                        </div>

                        {/* 2. Тело карточки */}
                        <div className='p-4 flex-1 flex flex-col justify-between space-y-3'>
                           <div className='space-y-1.5'>
                              <h4 className='font-extrabold text-slate-900 text-sm leading-snug group-hover:text-teal-700 transition'>
                                 {item.name}
                              </h4>

                              {/* Результаты пробы/дегустации (если есть) */}
                              {item.resultComment && (
                                 <div className='mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-1'>
                                    <div className='font-bold flex items-center gap-1 text-[11px] text-emerald-800'>
                                       <MessageSquare className='w-3 h-3 text-emerald-600' />
                                       <span>Итоги дегустации:</span>
                                    </div>
                                    <p className='text-emerald-900 leading-tight italic'>
                                       {item.resultComment}
                                    </p>
                                 </div>
                              )}
                           </div>

                           {/* Мета-информация о создании */}
                           <div className='pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400'>
                              <span title='Автор'>
                                 Автор: {item.createdBy || 'Технолог'}
                              </span>
                              <span>
                                 {new Date(item.createdAt).toLocaleDateString(
                                    'ru-RU'
                                 )}
                              </span>
                           </div>

                           {/* 3. Кнопки действий */}
                           <div className='pt-1 flex flex-col gap-2'>
                              {/* Если позиция В ИДЕЯХ: Кнопка "В план на эту неделю" */}
                              {isIdea && (
                                 <button
                                    type='button'
                                    onClick={() => handleTogglePlan(item, true)}
                                    className='w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer'
                                    title='Добавить в производственный план недели на отработку'
                                 >
                                    <FlaskConical className='w-3.5 h-3.5' />
                                    <span>В план на эту неделю</span>
                                 </button>
                              )}

                              {/* Если позиция В ОТРАБОТКЕ: Кнопка "Вернуть в новинки" + "Отработано" */}
                              {isInTrial && (
                                 <div className='space-y-1.5'>
                                    <button
                                       type='button'
                                       onClick={() => {
                                          setCompletingItem(item)
                                          setCompleteStatus('SUCCESS')
                                          setCompleteComment('')
                                          setCompleteReturnToIdeas(false)
                                       }}
                                       className='w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer'
                                    >
                                       <CheckCircle2 className='w-3.5 h-3.5' />
                                       <span>Отработано (итог)</span>
                                    </button>

                                    <button
                                       type='button'
                                       onClick={() =>
                                          handleTogglePlan(item, false)
                                       }
                                       className='w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer'
                                       title='План не выполнился — вернуть обратно в банк новинок'
                                    >
                                       <RotateCcw className='w-3.5 h-3.5 text-amber-700' />
                                       <span>План не выполнился (вернуть)</span>
                                    </button>
                                 </div>
                              )}

                              {/* Если уже отработано: кнопка вернуть в идеи для повтора */}
                              {isTested && (
                                 <button
                                    type='button'
                                    onClick={() =>
                                       handleTogglePlan(item, false)
                                    }
                                    className='w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer'
                                    title='Вернуть в банк идей для повторной отработки'
                                 >
                                    <RotateCcw className='w-3.5 h-3.5 text-slate-500' />
                                    <span>Вернуть в банк идей</span>
                                 </button>
                              )}

                              {/* Вспомогательные кнопки: Редактировать и Удалить */}
                              <div className='flex items-center justify-end gap-1 pt-1 border-t border-slate-100'>
                                 <button
                                    type='button'
                                    onClick={() => handleOpenEdit(item)}
                                    className='p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer'
                                    title='Редактировать новинку или фото'
                                 >
                                    <Pencil className='w-3.5 h-3.5' />
                                 </button>
                                 <button
                                    type='button'
                                    onClick={() => handleDelete(item)}
                                    className='p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer'
                                    title='Удалить новинку'
                                 >
                                    <Trash2 className='w-3.5 h-3.5' />
                                 </button>
                              </div>
                           </div>
                        </div>
                     </div>
                  )
               })}
            </div>
         )}

         {/* ═══ МОДАЛКА: СОЗДАНИЕ / РЕДАКТИРОВАНИЕ НОВИНКИ ═══ */}
         {isCreateModalOpen && (
            <div className='fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto'>
               <div className='bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 my-8'>
                  <div className='flex items-center justify-between pb-3 border-b border-slate-100'>
                     <div className='flex items-center gap-2.5'>
                        <div className='w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold'>
                           <Sparkles className='w-5 h-5 text-teal-600' />
                        </div>
                        <div>
                           <h3 className='font-extrabold text-slate-900 text-base'>
                              {editingItem
                                 ? 'Редактирование новинки'
                                 : 'Новая идея новинки'}
                           </h3>
                           <p className='text-xs text-slate-500'>
                              Экспериментальная позиция цеха на пробу
                           </p>
                        </div>
                     </div>
                     <button
                        type='button'
                        onClick={() => setIsCreateModalOpen(false)}
                        className='p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer'
                     >
                        <X className='w-5 h-5' />
                     </button>
                  </div>

                  <form onSubmit={handleSubmitForm} className='space-y-4'>
                     {/* Поле: Название */}
                     <div>
                        <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1'>
                           Наименование позиции{' '}
                           <span className='text-rose-500'>*</span>
                        </label>
                        <input
                           type='text'
                           required
                           value={formName}
                           onChange={(e) => setFormName(e.target.value)}
                           placeholder='Например: Форель слабой соли с розмарином'
                           className='w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition'
                        />
                     </div>

                     {/* Поле: Категория */}
                     <div>
                        <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1'>
                           Категория продукции
                        </label>
                        <input
                           type='text'
                           list='category-suggestions'
                           value={formCategory}
                           onChange={(e) => setFormCategory(e.target.value)}
                           placeholder='Например: Копчение, Посолка, Кулинария, Пресервы...'
                           className='w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition'
                        />
                        <datalist id='category-suggestions'>
                           <option value='Копчение' />
                           <option value='Слабосоленая' />
                           <option value='Вяленая рыба' />
                           <option value='Пресервы' />
                           <option value='Кулинария' />
                           <option value='Полуфабрикаты' />
                           <option value='Икра' />
                        </datalist>
                     </div>

                     {/* Поле: Медиаматериалы (Загрузка неограниченно фото и видео) */}
                     <div>
                        <div className='flex items-center justify-between mb-1.5'>
                           <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider'>
                              Медиаматериалы (фото и видео)
                           </label>
                           <span className='text-[11px] text-slate-400 font-medium'>
                              {existingMedia.length + newMediaFiles.length > 0
                                 ? `Выбрано: ${existingMedia.length + newMediaFiles.length}`
                                 : 'Неограниченно'}
                           </span>
                        </div>

                        {/* Скрытый input с multiple для фото и видео */}
                        <input
                           type='file'
                           ref={fileInputRef}
                           multiple
                           accept='image/*,video/*'
                           onChange={handleFileChange}
                           className='hidden'
                        />

                        <div className='space-y-2.5'>
                           {/* Сетка выбранных медиафайлов */}
                           {(existingMedia.length > 0 ||
                              newMediaFiles.length > 0) && (
                              <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-52 overflow-y-auto p-1.5 bg-slate-50 rounded-2xl border border-slate-200'>
                                 {/* Существующие медиа на сервере */}
                                 {existingMedia.map((media, idx) => {
                                    const url = getFullMediaUrl(media.url)
                                    const isVid = media.type === 'video'
                                    return (
                                       <div
                                          key={`existing-${idx}`}
                                          className='relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-200 group'
                                       >
                                          {isVid ? (
                                             <div className='w-full h-full relative flex items-center justify-center bg-slate-950'>
                                                <video
                                                   src={url}
                                                   className='w-full h-full object-cover opacity-80'
                                                   preload='metadata'
                                                />
                                                <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
                                                   <div className='w-7 h-7 rounded-full bg-teal-600/90 text-white flex items-center justify-center shadow'>
                                                      <Play className='w-3.5 h-3.5 fill-white translate-x-0.5' />
                                                   </div>
                                                </div>
                                                <span className='absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-black text-teal-300 uppercase tracking-wider'>
                                                   ВИДЕО
                                                </span>
                                             </div>
                                          ) : (
                                             <img
                                                src={url}
                                                alt='Превью'
                                                className='w-full h-full object-cover'
                                             />
                                          )}
                                          {idx === 0 && (
                                             <span className='absolute top-1 left-1 px-1.5 py-0.5 rounded bg-teal-600/90 text-white text-[9px] font-bold'>
                                                Обложка
                                             </span>
                                          )}
                                          <button
                                             type='button'
                                             onClick={() =>
                                                handleRemoveExistingMedia(idx)
                                             }
                                             className='absolute top-1 right-1 p-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition shadow opacity-90 group-hover:opacity-100 cursor-pointer'
                                             title='Удалить'
                                          >
                                             <Trash2 className='w-3.5 h-3.5' />
                                          </button>
                                       </div>
                                    )
                                 })}

                                 {/* Новые выбранные файлы */}
                                 {newMediaFiles.map((m) => {
                                    const isVid = m.type === 'video'
                                    return (
                                       <div
                                          key={m.id}
                                          className='relative aspect-square rounded-xl overflow-hidden bg-slate-900 border-2 border-teal-500/50 group'
                                       >
                                          {isVid ? (
                                             <div className='w-full h-full relative flex items-center justify-center bg-slate-950'>
                                                <video
                                                   src={m.preview}
                                                   className='w-full h-full object-cover opacity-80'
                                                   preload='metadata'
                                                />
                                                <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
                                                   <div className='w-7 h-7 rounded-full bg-amber-500/90 text-white flex items-center justify-center shadow'>
                                                      <Play className='w-3.5 h-3.5 fill-white translate-x-0.5' />
                                                   </div>
                                                </div>
                                                <span className='absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-black text-amber-300 uppercase tracking-wider'>
                                                   НОВОЕ ВИДЕО
                                                </span>
                                             </div>
                                          ) : (
                                             <img
                                                src={m.preview}
                                                alt='Превью'
                                                className='w-full h-full object-cover'
                                             />
                                          )}
                                          <span className='absolute top-1 left-1 px-1.5 py-0.5 rounded bg-teal-600/90 text-white text-[9px] font-bold'>
                                             Новое
                                          </span>
                                          <button
                                             type='button'
                                             onClick={() =>
                                                handleRemoveNewMedia(m.id)
                                             }
                                             className='absolute top-1 right-1 p-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition shadow opacity-90 group-hover:opacity-100 cursor-pointer'
                                             title='Удалить'
                                          >
                                             <Trash2 className='w-3.5 h-3.5' />
                                          </button>
                                       </div>
                                    )
                                 })}
                              </div>
                           )}

                           {/* Кнопка добавления файлов */}
                           <div
                              onClick={() => fileInputRef.current?.click()}
                              className='border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-50/50 hover:bg-teal-50/20 group'
                           >
                              <div className='flex items-center justify-center gap-2 text-slate-500 group-hover:text-teal-600 mb-1 transition'>
                                 <Upload className='w-5 h-5' />
                                 <span className='text-xs font-bold text-slate-700 group-hover:text-teal-700'>
                                    {existingMedia.length +
                                       newMediaFiles.length >
                                    0
                                       ? '+ Добавить ещё фото или видео'
                                       : 'Нажмите для выбора фото и видео'}
                                 </span>
                              </div>
                              <span className='text-[11px] text-slate-400 block'>
                                 Поддерживаются любые фото (JPG, PNG, WebP) и
                                 видео (MP4, MOV, WebM). Можно выбрать сразу
                                 несколько файлов!
                              </span>
                           </div>
                        </div>
                     </div>

                     {/* Чекбокс: сразу включить в план недели */}
                     {!editingItem && currentWeek && (
                        <label className='flex items-center gap-2.5 p-3 rounded-xl bg-teal-50 border border-teal-200 cursor-pointer select-none'>
                           <input
                              type='checkbox'
                              checked={formAddToPlan}
                              onChange={(e) =>
                                 setFormAddToPlan(e.target.checked)
                              }
                              className='w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer'
                           />
                           <div className='text-xs'>
                              <span className='font-bold text-teal-950 block'>
                                 Сразу добавить в план отработки на эту неделю
                                 (Неделя №{currentWeek.weekNumber})
                              </span>
                              <span className='text-teal-800 text-[11px] block'>
                                 Позиция сразу станет активной на пробу для
                                 бригады
                              </span>
                           </div>
                        </label>
                     )}

                     {/* Кнопки сохранения */}
                     <div className='flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100'>
                        <button
                           type='button'
                           onClick={() => setIsCreateModalOpen(false)}
                           disabled={isSubmitting}
                           className='px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer'
                        >
                           Отмена
                        </button>
                        <button
                           type='submit'
                           disabled={isSubmitting}
                           className='px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5'
                        >
                           {isSubmitting ? (
                              <span>Сохранение...</span>
                           ) : (
                              <span>
                                 {editingItem
                                    ? 'Сохранить изменения'
                                    : 'Создать новинку'}
                              </span>
                           )}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {/* ═══ МОДАЛКА: ЗАВЕРШЕНИЕ ОТРАБОТКИ (ИТОГИ / ДЕГУСТАЦИЯ) ═══ */}
         {completingItem && (
            <div className='fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4'>
               <div className='bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95'>
                  <div className='flex items-center gap-3'>
                     <div className='w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0'>
                        <CheckCircle2 className='w-6 h-6 text-emerald-600' />
                     </div>
                     <div>
                        <h4 className='font-extrabold text-slate-900 text-base'>
                           Итоги пробы новинки
                        </h4>
                        <p className='text-xs text-slate-500'>
                           «{completingItem.name}»
                        </p>
                     </div>
                  </div>

                  <div className='space-y-3 pt-2'>
                     <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider'>
                        Результат отработки
                     </label>

                     <div className='grid grid-cols-2 gap-2'>
                        <button
                           type='button'
                           onClick={() => {
                              setCompleteStatus('SUCCESS')
                              setCompleteReturnToIdeas(false)
                           }}
                           className={`p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                              completeStatus === 'SUCCESS' &&
                              !completeReturnToIdeas
                                 ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                                 : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                           }`}
                        >
                           <Check className='w-4 h-4' />
                           <span>Успешно отработано</span>
                        </button>

                        <button
                           type='button'
                           onClick={() => {
                              setCompleteStatus('FAILED')
                              setCompleteReturnToIdeas(true)
                           }}
                           className={`p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                              completeReturnToIdeas
                                 ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20'
                                 : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                           }`}
                        >
                           <RotateCcw className='w-4 h-4' />
                           <span>Вернуть на доработку</span>
                        </button>
                     </div>

                     <div>
                        <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1'>
                           Отзыв / Замечания дегустации
                        </label>
                        <textarea
                           rows={3}
                           value={completeComment}
                           onChange={(e) => setCompleteComment(e.target.value)}
                           placeholder='Вкус, консистенция, сочность, одобрено ли руководителем...'
                           className='w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition resize-none'
                        />
                     </div>
                  </div>

                  <div className='flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100'>
                     <button
                        type='button'
                        onClick={() => setCompletingItem(null)}
                        disabled={isCompleting}
                        className='px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer'
                     >
                        Отмена
                     </button>
                     <button
                        type='button'
                        onClick={handleCompleteTrial}
                        disabled={isCompleting}
                        className='px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer'
                     >
                        {isCompleting
                           ? 'Сохранение...'
                           : 'Зафиксировать результат'}
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* ═══ МОДАЛКА: ПРОСМОТР ФОТО И ВИДЕО (ГАЛЕРЕЯ / LIGHTBOX) ═══ */}
         {activeGallery && (
            <div
               onClick={() => setActiveGallery(null)}
               className='fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-3 sm:p-5 cursor-default select-none'
            >
               {/* 1. Верхняя панель управления */}
               <div
                  onClick={(e) => e.stopPropagation()}
                  className='w-full max-w-5xl mx-auto flex items-center justify-between py-2.5 px-4 rounded-2xl bg-slate-900/80 backdrop-blur border border-slate-800 text-white z-10 shadow-xl'
               >
                  <div className='flex items-center gap-3 min-w-0'>
                     <h3 className='font-bold text-sm truncate'>
                        {activeGallery.title}
                     </h3>
                     {activeGallery.items.length > 0 && (
                        <span className='px-2.5 py-0.5 rounded-full bg-slate-800 text-[11px] font-semibold text-slate-300 shrink-0'>
                           {activeGallery.index + 1} из{' '}
                           {activeGallery.items.length}
                        </span>
                     )}
                     {activeGallery.items[activeGallery.index]?.type ===
                     'video' ? (
                        <span className='px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 text-[10px] font-bold uppercase tracking-wider border border-teal-500/30'>
                           🎥 Видео
                        </span>
                     ) : (
                        <span className='px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider border border-blue-500/30'>
                           📷 Фото
                        </span>
                     )}
                  </div>

                  <div className='flex items-center gap-2'>
                     <button
                        type='button'
                        onClick={() => setActiveGallery(null)}
                        className='p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer'
                        title='Закрыть (Esc)'
                     >
                        <X className='w-5 h-5' />
                     </button>
                  </div>
               </div>

               {/* 2. Основная область просмотра с кнопками навигации */}
               <div
                  onClick={(e) => e.stopPropagation()}
                  className='flex-1 flex items-center justify-center relative w-full max-w-5xl mx-auto my-2 min-h-0'
               >
                  {/* Кнопка "Назад" */}
                  {activeGallery.items.length > 1 && (
                     <button
                        type='button'
                        onClick={() =>
                           setActiveGallery((prev) =>
                              prev
                                 ? {
                                      ...prev,
                                      index:
                                         (prev.index -
                                            1 +
                                            prev.items.length) %
                                         prev.items.length,
                                   }
                                 : null
                           )
                        }
                        className='absolute left-2 sm:left-4 z-20 p-3 rounded-full bg-slate-900/80 hover:bg-teal-600 text-white transition border border-slate-700 shadow-2xl backdrop-blur cursor-pointer'
                        title='Предыдущий (Стрелка влево)'
                     >
                        <ChevronLeft className='w-6 h-6' />
                     </button>
                  )}

                  {/* Контейнер медиа */}
                  <div className='w-full h-full flex items-center justify-center p-2'>
                     {(() => {
                        const current =
                           activeGallery.items[activeGallery.index]
                        if (!current) return null
                        const mediaUrl = getFullMediaUrl(current.url)

                        if (current.type === 'video') {
                           return (
                              <video
                                 key={mediaUrl}
                                 src={mediaUrl}
                                 controls
                                 autoPlay
                                 playsInline
                                 className='max-h-[70vh] max-w-full rounded-2xl shadow-2xl bg-black border border-slate-800'
                              />
                           )
                        }

                        return (
                           <img
                              key={mediaUrl}
                              src={mediaUrl}
                              alt={activeGallery.title}
                              className='max-h-[70vh] max-w-full object-contain rounded-2xl shadow-2xl'
                           />
                        )
                     })()}
                  </div>

                  {/* Кнопка "Вперед" */}
                  {activeGallery.items.length > 1 && (
                     <button
                        type='button'
                        onClick={() =>
                           setActiveGallery((prev) =>
                              prev
                                 ? {
                                      ...prev,
                                      index:
                                         (prev.index + 1) %
                                         prev.items.length,
                                   }
                                 : null
                           )
                        }
                        className='absolute right-2 sm:right-4 z-20 p-3 rounded-full bg-slate-900/80 hover:bg-teal-600 text-white transition border border-slate-700 shadow-2xl backdrop-blur cursor-pointer'
                        title='Следующий (Стрелка вправо)'
                     >
                        <ChevronRight className='w-6 h-6' />
                     </button>
                  )}
               </div>

               {/* 3. Нижняя лента миниатюр (если файлов больше 1) */}
               {activeGallery.items.length > 1 && (
                  <div
                     onClick={(e) => e.stopPropagation()}
                     className='w-full max-w-3xl mx-auto flex items-center justify-center gap-2 overflow-x-auto py-2 px-3 rounded-2xl bg-slate-900/80 backdrop-blur border border-slate-800 z-10'
                  >
                     {activeGallery.items.map((item, idx) => {
                        const thumbUrl = getFullMediaUrl(item.url)
                        const isActive = idx === activeGallery.index
                        const isVid = item.type === 'video'

                        return (
                           <button
                              key={idx}
                              type='button'
                              onClick={() =>
                                 setActiveGallery((prev) =>
                                    prev ? { ...prev, index: idx } : null
                                 )
                              }
                              className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                                 isActive
                                    ? 'border-teal-400 ring-2 ring-teal-400/50 scale-105'
                                    : 'border-slate-700 opacity-60 hover:opacity-100'
                              }`}
                           >
                              {isVid ? (
                                 <div className='w-full h-full relative bg-slate-950 flex items-center justify-center'>
                                    <video
                                       src={thumbUrl}
                                       className='w-full h-full object-cover'
                                       preload='metadata'
                                    />
                                    <div className='absolute inset-0 flex items-center justify-center bg-black/40'>
                                       <Play className='w-3.5 h-3.5 fill-white text-white' />
                                    </div>
                                 </div>
                              ) : (
                                 <img
                                    src={thumbUrl}
                                    alt=''
                                    className='w-full h-full object-cover'
                                 />
                              )}
                           </button>
                        )
                     })}
                  </div>
               )}
            </div>
         )}
      </div>
   )
}
