'use client'

import React, { useState } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import {
   X,
   UploadCloud,
   FileSpreadsheet,
   Sparkles,
   CheckCircle2,
   Zap,
} from 'lucide-react'

interface UploadModalProps {
   isOpen: boolean
   onClose: () => void
   weekId: string
   autoSyncPrice?: boolean
   onAutoSyncChange?: (enabled: boolean) => void
   onSuccess: (updatedItems: any[], uploadResult?: any) => void
}

interface AnomalyWarning {
   type: string
   title: string
   message: string
   stats?: any
}

interface PendingConfirmation {
   requiresConfirmation: boolean
   warnings: AnomalyWarning[]
   fileName?: string
   parsedCount?: number
   stats?: any
}

export default function UploadModal({
   isOpen,
   onClose,
   weekId,
   autoSyncPrice = true,
   onAutoSyncChange,
   onSuccess,
}: UploadModalProps) {
   const [file, setFile] = useState<File | null>(null)
   const [isUploading, setIsUploading] = useState(false)
   const [clearExisting, setClearExisting] = useState(false)
   const [isAutoSync, setIsAutoSync] = useState<boolean>(autoSyncPrice)
   const [pendingConfirmation, setPendingConfirmation] =
      useState<PendingConfirmation | null>(null)

   // Синхронизируем с внешним пропом, если он меняется
   React.useEffect(() => {
      setIsAutoSync(autoSyncPrice)
   }, [autoSyncPrice])

   if (!isOpen) return null

   const handleClose = () => {
      setPendingConfirmation(null)
      onClose()
   }

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0]
      if (selected) {
         const ext = selected.name.split('.').pop()?.toLowerCase()
         if (ext === 'xlsx' || ext === 'xls') {
            setFile(selected)
            setPendingConfirmation(null)
         } else {
            toast.error('Поддерживаются только файлы Excel (.xlsx, .xls)')
         }
      }
   }

   const handleUpload = async (force = false) => {
      if (!file) {
         toast.error('Выберите файл для загрузки')
         return
      }

      try {
         setIsUploading(true)
         const formData = new FormData()
         formData.append('file', file)
         formData.append('fileName', file.name)
         formData.append('weekId', weekId)
         formData.append('clearExisting', String(clearExisting))
         formData.append('autoSyncPrice', String(isAutoSync))
         if (force) {
            formData.append('forceUpload', 'true')
         }

         const res = await api.post('/api/plan/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
         })

         // Если сработала «защита от дурака» — показываем экран предупреждения
         if (res.data.requiresConfirmation && res.data.warnings) {
            setPendingConfirmation(res.data)
            return
         }

         setPendingConfirmation(null)

         if (res.data.syncResult && res.data.dostavkaSyncResult) {
            toast.success(
               'Прайс-лист загружен и автоматически синхронизирован с Прайсом и Доставкой!'
            )
         } else if (res.data.syncResult) {
            toast.success('Прайс-лист загружен и синхронизирован с Прайсом!')
         } else if (res.data.dostavkaSyncResult) {
            toast.success('Прайс-лист загружен и синхронизирован с Доставкой!')
         } else if (res.data.syncError || res.data.dostavkaSyncError) {
            toast.error(
               `Файл загружен, но ошибка синхронизации: ${res.data.syncError || res.data.dostavkaSyncError}`
            )
         } else {
            toast.success(res.data.message || 'Прайс-лист успешно загружен!')
         }

         onSuccess(res.data.items || [], {
            ...res.data,
            fileName: file.name || res.data.fileName,
            uploadedAt: res.data.uploadedAt || new Date().toISOString(),
         })
         onClose()
      } catch (err: any) {
         toast.error(err.response?.data?.error || 'Ошибка загрузки файла')
      } finally {
         setIsUploading(false)
      }
   }

   return (
      <div className='fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4'>
         <div className='bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200'>
            {pendingConfirmation ? (
               /* Экран подтверждения аномалий («Защита от дурака») */
               <div>
                  <div className='p-5 border-b border-amber-200 flex items-center justify-between bg-amber-50/80'>
                     <div className='flex items-center gap-2.5'>
                        <div className='w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0'>
                           <span className='text-xl'>⚠️</span>
                        </div>
                        <div>
                           <h3 className='font-bold text-amber-950 text-base sm:text-lg leading-tight'>
                              Внимание! Обнаружены аномалии в файле 1С
                           </h3>
                           <p className='text-xs text-amber-800/80 mt-0.5 font-medium truncate max-w-xs sm:max-w-sm'>
                              Файл: {file?.name}
                           </p>
                        </div>
                     </div>
                     <button
                        onClick={handleClose}
                        className='p-1.5 text-slate-400 hover:text-slate-700 hover:bg-amber-200/50 rounded-lg transition'
                     >
                        <X className='w-5 h-5' />
                     </button>
                  </div>

                  <div className='p-6 space-y-4'>
                     <div className='space-y-2.5'>
                        {pendingConfirmation.warnings.map((warn, idx) => (
                           <div
                              key={idx}
                              className='p-3.5 rounded-xl border border-amber-300/80 bg-amber-50/60 text-xs space-y-1'
                           >
                              <p className='font-bold text-amber-900 flex items-center gap-1.5'>
                                 <span className='w-1.5 h-1.5 rounded-full bg-amber-600 inline-block shrink-0'></span>
                                 {warn.title}
                              </p>
                              <p className='text-amber-800 leading-relaxed text-[11px] pl-3'>
                                 {warn.message}
                              </p>
                           </div>
                        ))}
                     </div>

                     <div className='bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 space-y-1.5'>
                        <p className='font-bold text-rose-800 flex items-center gap-1.5'>
                           <span>🚨</span> Что произойдет, если продолжить:
                        </p>
                        <ul className='text-rose-700 text-[11px] space-y-1 list-disc list-inside leading-relaxed'>
                           <li>
                              Все позиции без остатка перейдут в статус{' '}
                              <b>«Под заказ»</b>.
                           </li>
                           <li>
                              Если включена авто-синхронизация, эти остатки{' '}
                              <b>
                                 сразу обновятся на витрине сайта "Прайс" и в
                                 Доставке
                              </b>
                              .
                           </li>
                           <li>
                              Если товаров меньше, чем было — недостающие
                              позиции перейдут в корзину.
                           </li>
                        </ul>
                     </div>

                     <div className='bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 flex items-center gap-2'>
                        <span className='text-teal-600 font-bold shrink-0'>
                           ℹ️ Страховка:
                        </span>
                        <span>
                           Перед применением будет создан автоматический бэкап
                           недели. Вы сможете отменить эту загрузку в течение 48
                           часов.
                        </span>
                     </div>

                     <div className='flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100'>
                        <button
                           type='button'
                           onClick={() => setPendingConfirmation(null)}
                           disabled={isUploading}
                           className='px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition border border-slate-200'
                        >
                           Отменить загрузку
                        </button>
                        <button
                           type='button'
                           disabled={isUploading}
                           onClick={() => handleUpload(true)}
                           className='px-5 py-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md shadow-amber-600/20 disabled:opacity-40 transition flex items-center gap-1.5'
                        >
                           {isUploading ? (
                              <span>Применение...</span>
                           ) : (
                              <>
                                 <span>Всё равно применить (я уверен)</span>
                              </>
                           )}
                        </button>
                     </div>
                  </div>
               </div>
            ) : (
               /* Стандартный экран выбора файла */
               <>
                  <div className='p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50'>
                     <div className='flex items-center gap-2.5'>
                        <div className='w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold'>
                           <UploadCloud className='w-5 h-5' />
                        </div>
                        <div>
                           <h3 className='font-bold text-slate-900 text-lg'>
                              Загрузка прайса 1С на неделю
                           </h3>
                           <p className='text-xs text-slate-500'>
                              Автоматически определит остатки, цены и новинки
                           </p>
                        </div>
                     </div>
                     <button
                        onClick={handleClose}
                        className='p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition'
                     >
                        <X className='w-5 h-5' />
                     </button>
                  </div>

                  <div className='p-6 space-y-5'>
                     <div className='border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-8 text-center bg-slate-50/60 hover:bg-teal-50/30 transition cursor-pointer relative'>
                        <input
                           type='file'
                           accept='.xlsx,.xls'
                           onChange={handleFileChange}
                           className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
                        />
                        <div className='w-12 h-12 rounded-2xl bg-teal-100 text-teal-600 mx-auto flex items-center justify-center mb-3'>
                           <FileSpreadsheet className='w-6 h-6' />
                        </div>
                        <p className='text-sm font-bold text-slate-800'>
                           {file
                              ? file.name
                              : 'Нажмите или перетащите сюда файл прайса 1С'}
                        </p>
                        <p className='text-xs text-slate-400 mt-1'>
                           Формат .xlsx или .xls (размер до 50 МБ)
                        </p>
                     </div>

                     <div className='bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 space-y-1'>
                        <p className='font-bold flex items-center gap-1.5'>
                           <Sparkles className='w-4 h-4 text-blue-600' />
                           Что сделает система:
                        </p>
                        <p className='text-blue-800 text-[11px] leading-relaxed'>
                           • Распознает колонки «Свободный остаток», «Оптовая
                           цена» и категории.
                           <br />
                           • Автоматически выявит и подсветит новинки (которых
                           не было в прошлых прайсах).
                           <br />• Выделит дефицитные позиции (0 кг, статус «Под
                           заказ»).
                        </p>
                     </div>

                     <div className='pt-1'>
                        <label className='flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 select-none hover:text-slate-900 transition'>
                           <input
                              type='checkbox'
                              checked={clearExisting}
                              onChange={(e) =>
                                 setClearExisting(e.target.checked)
                              }
                              className='w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300'
                           />
                           <span className='font-medium'>
                              Перезаписать чеклист (заново пересчитать новинки
                              относительно предыдущих файлов)
                           </span>
                        </label>
                     </div>

                     <div className='flex items-center justify-end gap-2 pt-2'>
                        <button
                           type='button'
                           onClick={onClose}
                           className='px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition'
                        >
                           Отмена
                        </button>
                        <button
                           type='button'
                           disabled={!file || isUploading}
                           onClick={() => handleUpload(false)}
                           className='px-5 py-2.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-md shadow-teal-600/20 disabled:opacity-40 transition flex items-center gap-1.5'
                        >
                           {isUploading ? (
                              <span>Обработка прайса...</span>
                           ) : (
                              <>
                                 <CheckCircle2 className='w-4 h-4' />
                                 <span>Загрузить и обновить чеклист</span>
                              </>
                           )}
                        </button>
                     </div>
                  </div>
               </>
            )}
         </div>
      </div>
   )
}
