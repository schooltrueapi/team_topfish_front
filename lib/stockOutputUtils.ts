import { PlanItem } from '@/components/Checklist'

export interface ReplenishStep {
   from: number
   to: number
   diff: number
   at: string
   fileName?: string
}

export interface StockOutputInfo {
   isReplenished: boolean
   addedKg: number
   totalAddedKg: number
   fromKg: number
   toKg: number
   currentStockKg: number
   initialStockKg: number
   replenishedAt: string
   formattedDate: string
   shortDate: string
   formattedRelative: string
   fileName?: string
   replenishCount: number
   allIncreases: ReplenishStep[]
}

export interface UploadReportData {
   fileName?: string
   uploadedAt?: string
   stats?: any
   changes?: {
      backInStock?: Array<{
         name: string
         category?: string
         oldStock?: number
         newStock?: number
      }>
      stockChanges?: Array<{
         name: string
         category?: string
         oldStock?: number
         newStock?: number
         diff?: number
      }>
      [key: string]: any
   }
   allUploads?: any[]
   [key: string]: any
}

/**
 * Форматирует относительное время по-русски ("Сегодня", "Вчера", "2 дня назад")
 */
function formatRelativeDays(dateStr: string): { relative: string; short: string; full: string } {
   try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) {
         return { relative: 'Недавно', short: '—', full: '—' }
      }

      const now = new Date()
      // Сравниваем по календарным дням в местном времени
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
      const diffDays = Math.round((startOfToday - startOfTarget) / (24 * 60 * 60 * 1000))

      let relative = ''
      if (diffDays <= 0) {
         relative = 'Сегодня'
      } else if (diffDays === 1) {
         relative = 'Вчера'
      } else if (diffDays < 5) {
         relative = `${diffDays} дня назад`
      } else if (diffDays < 21) {
         relative = `${diffDays} дней назад`
      } else {
         const weeks = Math.floor(diffDays / 7)
         relative = `${weeks} нед. назад`
      }

      const monthNames = [
         'янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.',
         'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.',
      ]
      const short = `${d.getDate()} ${monthNames[d.getMonth()]}`

      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')
      const full = `${short}, ${hours}:${minutes}`

      return { relative, short, full }
   } catch {
      return { relative: 'Недавно', short: '—', full: '—' }
   }
}

/**
 * Анализирует хронологию остатков позиции (stockHistory),
 * отчет последней загрузки (uploadReport) и остаток прошлой недели (prevStockKg),
 * выявляя пополнение остатка (свежий выпуск продукции из цеха).
 */
export function getStockOutputInfo(
   item: PlanItem,
   uploadReport?: UploadReportData | null
): StockOutputInfo | null {
   const normName = (item.productName || '').trim().toLowerCase()

   // 1. Проверяем изменения из отчета загрузки (uploadReport)
   let reportMatch: ReplenishStep | null = null

   if (uploadReport?.changes) {
      const back = Array.isArray(uploadReport.changes.backInStock)
         ? uploadReport.changes.backInStock.find(
              (b) => (b.name || '').trim().toLowerCase() === normName
           )
         : null

      if (back && (back.newStock ?? 0) > (back.oldStock ?? 0) + 0.05) {
         const from = back.oldStock ?? 0
         const to = back.newStock ?? 0
         reportMatch = {
            from,
            to,
            diff: Math.round((to - from) * 100) / 100,
            at: uploadReport.uploadedAt || new Date().toISOString(),
            fileName: uploadReport.fileName,
         }
      } else {
         const change = Array.isArray(uploadReport.changes.stockChanges)
            ? uploadReport.changes.stockChanges.find(
                 (s) =>
                    (s.name || '').trim().toLowerCase() === normName &&
                    (s.diff ?? 0) > 0.05
              )
            : null

         if (change) {
            const from = change.oldStock ?? 0
            const to = change.newStock ?? from + (change.diff ?? 0)
            reportMatch = {
               from,
               to,
               diff: Math.round((change.diff ?? (to - from)) * 100) / 100,
               at: uploadReport.uploadedAt || new Date().toISOString(),
               fileName: uploadReport.fileName,
            }
         }
      }
   }

   // 2. Хронология остатков внутри недели (stockHistory)
   const rawHistory = Array.isArray(item.stockHistory) ? item.stockHistory : []
   const sorted = [...rawHistory].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
   )

   const chain: Array<{ stockKg: number; at: string; fileName?: string }> = []

   if (typeof item.prevStockKg === 'number' && item.prevStockKg !== null) {
      chain.push({
         stockKg: item.prevStockKg,
         at: sorted[0]?.at || item.updatedAt || item.createdAt || new Date().toISOString(),
         fileName: 'Прошлая неделя',
      })
   }

   for (const p of sorted) {
      chain.push({
         stockKg: p.stockKg ?? 0,
         at: p.at,
         fileName: p.fileName,
      })
   }

   const increases: ReplenishStep[] = []
   let totalAdded = 0

   if (chain.length >= 2) {
      for (let i = 1; i < chain.length; i++) {
         const prevStock = chain[i - 1].stockKg ?? 0
         const currStock = chain[i].stockKg ?? 0
         const diff = Math.round((currStock - prevStock) * 100) / 100

         if (diff >= 0.05) {
            increases.push({
               from: prevStock,
               to: currStock,
               diff,
               at: chain[i].at,
               fileName: chain[i].fileName,
            })
            totalAdded += diff
         }
      }
   }

   // Если по цепочке ничего не нашлось, но в uploadReport зафиксирован плюс остатка
   if (increases.length === 0 && reportMatch) {
      increases.push(reportMatch)
      totalAdded = reportMatch.diff
   }

   if (increases.length === 0) {
      return null
   }

   // Последнее (самое свежее) пополнение
   const last = increases[increases.length - 1]
   const dateInfo = formatRelativeDays(last.at)

   const initialStock =
      chain.length > 0
         ? chain[0].stockKg
         : reportMatch
         ? reportMatch.from
         : 0
   const currentStock = item.stockKg ?? last.to

   return {
      isReplenished: true,
      addedKg: last.diff,
      totalAddedKg: Math.round(totalAdded * 100) / 100,
      fromKg: last.from,
      toKg: last.to,
      currentStockKg: currentStock,
      initialStockKg: initialStock,
      replenishedAt: last.at,
      formattedDate: dateInfo.full,
      shortDate: dateInfo.short,
      formattedRelative: dateInfo.relative,
      fileName: last.fileName,
      replenishCount: increases.length,
      allIncreases: increases,
   }
}
