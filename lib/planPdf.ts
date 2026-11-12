export interface PlanPdfItem {
   id: string
   productName: string
   category?: string | null
   stockKg?: number | null
   plannedKg?: number | null
   estimatedBatchKg?: number | null
   isNew?: boolean
   isTrialNovelty?: boolean
   isHit?: boolean
   abcCategory?: 'A' | 'B' | 'C' | null
}

export interface GenerateProductionPlanPdfOptions {
   weekNumber: number
   year?: number
   startDate?: string
   endDate?: string
   weekStatus?: string
   isArchive?: boolean
   items: PlanPdfItem[]
}

const A4_WIDTH_PT = 595.276
const A4_HEIGHT_PT = 841.89
const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297

// 300 DPI для максимально четкой печати мелкого табличного текста на офисном принтере
const CANVAS_W = 2480
const PX_PER_MM = CANVAS_W / A4_WIDTH_MM
const CANVAS_H = Math.round(A4_HEIGHT_MM * PX_PER_MM) // 3507 px

const MARGIN_X_MM = 8
const MARGIN_TOP_MM = 8
const MARGIN_BOTTOM_MM = 8
const CONTENT_W_MM = A4_WIDTH_MM - MARGIN_X_MM * 2 // 194 mm
const FOOTER_H_MM = 5
const MAX_CONTENT_BOTTOM_MM = A4_HEIGHT_MM - MARGIN_BOTTOM_MM - FOOTER_H_MM // 284 mm

const FONT_FAMILY = '"Segoe UI", Arial, Helvetica, sans-serif'

const COL_WIDTHS_MM = {
   no: 9,
   check: 8.5,
   name: 121.5,
   stock: 17,
   plan: 18,
   fact: 20,
} // Сумма = 194.0 mm

const mm = (val: number) => val * PX_PER_MM
const ptToPx = (pt: number) => (pt * CANVAS_W) / A4_WIDTH_PT

function formatShortDate(dateStr?: string): string {
   if (!dateStr) return ''
   try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return ''
      return d.toLocaleDateString('ru-RU', {
         day: '2-digit',
         month: '2-digit',
      })
   } catch {
      return ''
   }
}

function formatWeight(val?: number | null): string {
   if (val === null || val === undefined || Number.isNaN(Number(val))) return '—'
   const rounded = Math.round(Number(val) * 100) / 100
   return `${rounded}`
}

function getStatusLabel(weekStatus?: string, isArchive?: boolean): string {
   if (isArchive || weekStatus === 'CLOSED') return 'Архив'
   if (weekStatus === 'IN_PROGRESS') return 'В работе'
   if (weekStatus === 'PLANNING') return 'Планирование'
   return 'План'
}

function wrapText(
   ctx: CanvasRenderingContext2D,
   text: string,
   maxWidthPx: number
): string[] {
   const normalized = (text || '').replace(/\s+/g, ' ').trim()
   if (!normalized) return ['—']

   if (ctx.measureText(normalized).width <= maxWidthPx) {
      return [normalized]
   }

   const words = normalized.split(' ')
   const lines: string[] = []
   let currentLine = ''

   for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word
      if (ctx.measureText(candidate).width <= maxWidthPx) {
         currentLine = candidate
         continue
      }

      if (currentLine) {
         lines.push(currentLine)
         currentLine = ''
      }

      // Если одно слово длиннее ширины колонки — режем посимвольно
      if (ctx.measureText(word).width > maxWidthPx) {
         let chunk = ''
         for (const ch of word) {
            if (ctx.measureText(chunk + ch).width <= maxWidthPx) {
               chunk += ch
            } else {
               if (chunk) lines.push(chunk)
               chunk = ch
            }
         }
         currentLine = chunk
      } else {
         currentLine = word
      }
   }

   if (currentLine) {
      lines.push(currentLine)
   }

   return lines.length > 0 ? lines : ['—']
}

type LayoutRow =
   | {
        kind: 'category'
        title: string
        count: number
        heightMm: number
     }
   | {
        kind: 'item'
        indexNum: number
        item: PlanPdfItem
        nameLines: string[]
        tagText: string
        heightMm: number
     }
   | {
        kind: 'total'
        totalCount: number
        totalStockKg: number
        totalPlannedKg: number
        hasExplicitPlannedKg: boolean
        heightMm: number
     }

function buildPdfFromJpegs(pagesBytes: { bytes: Uint8Array; widthPx: number; heightPx: number }[]): Blob {
   const totalPages = pagesBytes.length
   const chunks: (Uint8Array | string)[] = []
   const offsets: number[] = []
   let currentOffset = 0

   const addString = (str: string) => {
      chunks.push(str)
      currentOffset += str.length
   }

   const addBytes = (bytes: Uint8Array) => {
      chunks.push(bytes)
      currentOffset += bytes.length
   }

   addString('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n')

   // Obj 1: Catalog
   offsets[1] = currentOffset
   addString('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')

   // Obj 2: Pages
   const kids: string[] = []
   for (let i = 0; i < totalPages; i++) {
      kids.push(`${3 + i * 2} 0 R`)
   }
   offsets[2] = currentOffset
   addString(`2 0 obj\n<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${totalPages} >>\nendobj\n`)

   const firstImgObjNum = 3 + totalPages * 2

   for (let p = 0; p < totalPages; p++) {
      const pageObjNum = 3 + p * 2
      const contentObjNum = 4 + p * 2
      const imgObjNum = firstImgObjNum + p
      const imgName = `Im${p + 1}`

      const contentStream = `q ${A4_WIDTH_PT.toFixed(3)} 0 0 ${A4_HEIGHT_PT.toFixed(3)} 0 0 cm /${imgName} Do Q\n`

      offsets[pageObjNum] = currentOffset
      addString(
         `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH_PT.toFixed(3)} ${A4_HEIGHT_PT.toFixed(3)}] /Resources << /XObject << /${imgName} ${imgObjNum} 0 R >> /ProcSet [/PDF /ImageC] >> /Contents ${contentObjNum} 0 R >>\nendobj\n`
      )

      offsets[contentObjNum] = currentOffset
      addString(
         `${contentObjNum} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`
      )
   }

   for (let p = 0; p < totalPages; p++) {
      const imgObjNum = firstImgObjNum + p
      const img = pagesBytes[p]
      offsets[imgObjNum] = currentOffset
      addString(
         `${imgObjNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${img.widthPx} /Height ${img.heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`
      )
      addBytes(img.bytes)
      addString('\nendstream\nendobj\n')
   }

   const startXref = currentOffset
   const totalObjs = firstImgObjNum + totalPages
   let xref = `xref\n0 ${totalObjs}\n0000000000 65535 f \n`
   for (let i = 1; i < totalObjs; i++) {
      const off = String(offsets[i] || 0).padStart(10, '0')
      xref += `${off} 00000 n \n`
   }
   addString(xref)
   addString(`trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`)

   const blobParts: BlobPart[] = chunks.map((chunk) => {
      if (typeof chunk === 'string') {
         const arr = new Uint8Array(chunk.length)
         for (let i = 0; i < chunk.length; i++) {
            arr[i] = chunk.charCodeAt(i) & 0xff
         }
         return arr
      }
      return chunk as Uint8Array<ArrayBuffer>
   })

   return new Blob(blobParts, { type: 'application/pdf' })
}

export async function generateProductionPlanPdf(
   options: GenerateProductionPlanPdfOptions
): Promise<Blob> {
   const { weekNumber, year, startDate, endDate, weekStatus, isArchive, items } = options

   // Группировка по категориям и сортировка по алфавиту внутри категории
   const groupedMap = new Map<string, PlanPdfItem[]>()
   for (const item of items) {
      const cat = (item.category || '').trim() || 'Без категории'
      const list = groupedMap.get(cat) || []
      list.push(item)
      groupedMap.set(cat, list)
   }

   const sortedCategories = Array.from(groupedMap.keys()).sort((a, b) => {
      if (a === 'Без категории') return 1
      if (b === 'Без категории') return -1
      return a.localeCompare(b, 'ru')
   })

   const showCategoryHeaders =
      sortedCategories.length > 1 ||
      (sortedCategories.length === 1 && sortedCategories[0] !== 'Без категории')

   // Временный canvas для измерения текста и рендера страниц
   const canvas = document.createElement('canvas')
   canvas.width = CANVAS_W
   canvas.height = CANVAS_H
   const ctx = canvas.getContext('2d')
   if (!ctx) {
      throw new Error('Не удалось инициализировать 2D-контекст для создания PDF')
   }

   const nameTextMaxW = mm(COL_WIDTHS_MM.name - 4) // 2 мм внутренние отступы слева и справа
   const itemFontPx = ptToPx(8.8)

   let totalStockKg = 0
   let totalPlannedKg = 0
   let hasExplicitPlannedKg = false

   const allRows: LayoutRow[] = []
   let rowCounter = 1

   for (const cat of sortedCategories) {
      const catItems = [...(groupedMap.get(cat) || [])].sort((a, b) =>
         a.productName.localeCompare(b.productName, 'ru')
      )

      if (showCategoryHeaders) {
         allRows.push({
            kind: 'category',
            title: cat,
            count: catItems.length,
            heightMm: 5.8,
         })
      }

      for (const item of catItems) {
         if (item.stockKg !== null && item.stockKg !== undefined && !Number.isNaN(Number(item.stockKg))) {
            totalStockKg += Number(item.stockKg)
         }
         if (item.plannedKg !== null && item.plannedKg !== undefined && Number(item.plannedKg) > 0) {
            totalPlannedKg += Number(item.plannedKg)
            hasExplicitPlannedKg = true
         }

         const tags: string[] = []
         if (item.isTrialNovelty) tags.push('[ОТРАБ.]')
         else if (item.isNew) tags.push('[НОВИНКА]')
         if (item.isHit) tags.push('[ХИТ]')
         const tagText = tags.join(' ')

         const displayTitle = tagText ? `${item.productName} ${tagText}` : item.productName

         ctx.font = `600 ${itemFontPx}px ${FONT_FAMILY}`
         const lines = wrapText(ctx, displayTitle, nameTextMaxW)
         const lineCount = Math.max(1, lines.length)
         const rowHeightMm = lineCount === 1 ? 6.2 : 3.4 + lineCount * 3.2

         allRows.push({
            kind: 'item',
            indexNum: rowCounter++,
            item,
            nameLines: lines,
            tagText,
            heightMm: rowHeightMm,
         })
      }
   }

   totalStockKg = Math.round(totalStockKg * 100) / 100
   totalPlannedKg = Math.round(totalPlannedKg * 100) / 100

   allRows.push({
      kind: 'total',
      totalCount: items.length,
      totalStockKg,
      totalPlannedKg,
      hasExplicitPlannedKg,
      heightMm: 6.8,
   })

   // Разбивка на страницы А4
   const FIRST_PAGE_HEADER_H_MM = 14
   const NEXT_PAGE_HEADER_H_MM = 7
   const TABLE_HEADER_H_MM = 6.2

   const pages: LayoutRow[][] = []
   let currentPageRows: LayoutRow[] = []
   let currentY = MARGIN_TOP_MM + FIRST_PAGE_HEADER_H_MM + TABLE_HEADER_H_MM

   const startNewPage = () => {
      pages.push(currentPageRows)
      currentPageRows = []
      currentY = MARGIN_TOP_MM + NEXT_PAGE_HEADER_H_MM + TABLE_HEADER_H_MM
   }

   for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i]
      const nextRow = allRows[i + 1]

      // Не оставляем заголовок категории одиноким в самом низу страницы
      const minNeededHeight =
         row.kind === 'category' && nextRow
            ? row.heightMm + nextRow.heightMm
            : row.heightMm

      if (currentPageRows.length > 0 && currentY + minNeededHeight > MAX_CONTENT_BOTTOM_MM) {
         startNewPage()
      }

      currentPageRows.push(row)
      currentY += row.heightMm
   }

   if (currentPageRows.length > 0) {
      pages.push(currentPageRows)
   }

   const totalPages = Math.max(1, pages.length)
   const nowStr = new Date().toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
   })
   const startStr = formatShortDate(startDate)
   const endStr = formatShortDate(endDate)
   const periodText = startStr && endStr ? `${startStr} — ${endStr}` : ''
   const statusLabel = getStatusLabel(weekStatus, isArchive)

   const renderedPages: { bytes: Uint8Array; widthPx: number; heightPx: number }[] = []

   const colX = {
      no: MARGIN_X_MM,
      check: MARGIN_X_MM + COL_WIDTHS_MM.no,
      name: MARGIN_X_MM + COL_WIDTHS_MM.no + COL_WIDTHS_MM.check,
      stock: MARGIN_X_MM + COL_WIDTHS_MM.no + COL_WIDTHS_MM.check + COL_WIDTHS_MM.name,
      plan:
         MARGIN_X_MM +
         COL_WIDTHS_MM.no +
         COL_WIDTHS_MM.check +
         COL_WIDTHS_MM.name +
         COL_WIDTHS_MM.stock,
      fact:
         MARGIN_X_MM +
         COL_WIDTHS_MM.no +
         COL_WIDTHS_MM.check +
         COL_WIDTHS_MM.name +
         COL_WIDTHS_MM.stock +
         COL_WIDTHS_MM.plan,
      rightEdge: MARGIN_X_MM + CONTENT_W_MM,
   }

   const drawVerticalGridLines = (yTopMm: number, yBottomMm: number, strokeColor: string, lineWidthPt: number) => {
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = ptToPx(lineWidthPt)
      const xs = [colX.no, colX.check, colX.name, colX.stock, colX.plan, colX.fact, colX.rightEdge]
      for (const x of xs) {
         ctx.beginPath()
         ctx.moveTo(mm(x), mm(yTopMm))
         ctx.lineTo(mm(x), mm(yBottomMm))
         ctx.stroke()
      }
   }

   for (let pIdx = 0; pIdx < totalPages; pIdx++) {
      const pageRows = pages[pIdx] || []
      const isFirstPage = pIdx === 0

      // Белый фон листа А4
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      let yMm = MARGIN_TOP_MM

      // Шапка документа
      if (isFirstPage) {
         ctx.fillStyle = '#0f172a'
         ctx.font = `800 ${ptToPx(13)}px ${FONT_FAMILY}`
         ctx.textBaseline = 'top'
         ctx.textAlign = 'left'
         const yearText = year ? ` (${year})` : ''
         ctx.fillText(`ПЛАН ПРОИЗВОДСТВА • Неделя №${weekNumber}${yearText}`, mm(MARGIN_X_MM), mm(yMm))

         // Подзаголовок слева
         ctx.fillStyle = '#475569'
         ctx.font = `500 ${ptToPx(8)}px ${FONT_FAMILY}`
         const metaParts = [
            periodText ? `Период: ${periodText}` : '',
            `Статус: ${statusLabel}`,
            `Сформировано: ${nowStr}`,
         ].filter(Boolean)
         ctx.fillText(metaParts.join('  •  '), mm(MARGIN_X_MM), mm(yMm + 5.6))

         // Правый блок цифр
         ctx.textAlign = 'right'
         ctx.fillStyle = '#0f172a'
         ctx.font = `800 ${ptToPx(9.5)}px ${FONT_FAMILY}`
         ctx.fillText(`Позиций в плане: ${items.length}`, mm(colX.rightEdge), mm(yMm + 0.3))

         ctx.fillStyle = '#334155'
         ctx.font = `600 ${ptToPx(8)}px ${FONT_FAMILY}`
         const summaryParts = [
            hasExplicitPlannedKg ? `План: ${totalPlannedKg} кг` : '',
            `Ост. 1С: ${totalStockKg} кг`,
         ].filter(Boolean)
         ctx.fillText(summaryParts.join('  |  '), mm(colX.rightEdge), mm(yMm + 5.4))

         // Разделительная линия шапки
         ctx.strokeStyle = '#0f172a'
         ctx.lineWidth = ptToPx(1.1)
         ctx.beginPath()
         ctx.moveTo(mm(MARGIN_X_MM), mm(yMm + 11.2))
         ctx.lineTo(mm(colX.rightEdge), mm(yMm + 11.2))
         ctx.stroke()

         yMm += FIRST_PAGE_HEADER_H_MM
      } else {
         ctx.fillStyle = '#334155'
         ctx.font = `700 ${ptToPx(8.5)}px ${FONT_FAMILY}`
         ctx.textBaseline = 'top'
         ctx.textAlign = 'left'
         const yearText = year ? ` (${year})` : ''
         ctx.fillText(
            `План производства • Неделя №${weekNumber}${yearText}`,
            mm(MARGIN_X_MM),
            mm(yMm + 0.5)
         )

         ctx.textAlign = 'right'
         ctx.fillStyle = '#64748b'
         ctx.font = `500 ${ptToPx(8)}px ${FONT_FAMILY}`
         ctx.fillText(`Продолжение списка`, mm(colX.rightEdge), mm(yMm + 0.6))

         yMm += NEXT_PAGE_HEADER_H_MM
      }

      // Заголовок таблицы
      const thTop = yMm
      const thBottom = yMm + TABLE_HEADER_H_MM
      ctx.fillStyle = '#e2e8f0'
      ctx.fillRect(mm(MARGIN_X_MM), mm(thTop), mm(CONTENT_W_MM), mm(TABLE_HEADER_H_MM))

      ctx.strokeStyle = '#334155'
      ctx.lineWidth = ptToPx(0.8)
      ctx.strokeRect(mm(MARGIN_X_MM), mm(thTop), mm(CONTENT_W_MM), mm(TABLE_HEADER_H_MM))
      drawVerticalGridLines(thTop, thBottom, '#64748b', 0.5)

      ctx.fillStyle = '#0f172a'
      ctx.font = `800 ${ptToPx(7.8)}px ${FONT_FAMILY}`
      ctx.textBaseline = 'middle'
      const thMidY = mm(thTop + TABLE_HEADER_H_MM / 2 + 0.15)

      ctx.textAlign = 'center'
      ctx.fillText('№', mm(colX.no + COL_WIDTHS_MM.no / 2), thMidY)
      const hdrBoxSizeMm = 3.0
      const hdrBoxX = colX.check + (COL_WIDTHS_MM.check - hdrBoxSizeMm) / 2
      const hdrBoxY = thTop + (TABLE_HEADER_H_MM - hdrBoxSizeMm) / 2
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = ptToPx(0.85)
      ctx.strokeRect(mm(hdrBoxX), mm(hdrBoxY), mm(hdrBoxSizeMm), mm(hdrBoxSizeMm))

      ctx.textAlign = 'left'
      ctx.fillText('НАИМЕНОВАНИЕ ПРОДУКЦИИ', mm(colX.name + 2), thMidY)

      ctx.textAlign = 'right'
      ctx.fillText('ОСТ. 1С', mm(colX.plan - 1.8), thMidY)
      ctx.fillText('ПЛАН, КГ', mm(colX.fact - 1.8), thMidY)

      ctx.textAlign = 'center'
      ctx.fillText('ФАКТ / ОТМ.', mm(colX.fact + COL_WIDTHS_MM.fact / 2), thMidY)

      yMm = thBottom

      // Строки таблицы
      for (const row of pageRows) {
         const rowTop = yMm
         const rowBottom = yMm + row.heightMm

         if (row.kind === 'category') {
            ctx.fillStyle = '#f1f5f9'
            ctx.fillRect(mm(MARGIN_X_MM), mm(rowTop), mm(CONTENT_W_MM), mm(row.heightMm))

            ctx.strokeStyle = '#64748b'
            ctx.lineWidth = ptToPx(0.6)
            ctx.beginPath()
            ctx.moveTo(mm(MARGIN_X_MM), mm(rowBottom))
            ctx.lineTo(mm(colX.rightEdge), mm(rowBottom))
            ctx.stroke()

            // Внешние границы
            ctx.beginPath()
            ctx.moveTo(mm(MARGIN_X_MM), mm(rowTop))
            ctx.lineTo(mm(MARGIN_X_MM), mm(rowBottom))
            ctx.moveTo(mm(colX.rightEdge), mm(rowTop))
            ctx.lineTo(mm(colX.rightEdge), mm(rowBottom))
            ctx.stroke()

            ctx.fillStyle = '#1e293b'
            ctx.font = `800 ${ptToPx(8.2)}px ${FONT_FAMILY}`
            ctx.textBaseline = 'middle'
            ctx.textAlign = 'left'
            ctx.fillText(
               `${row.title.toUpperCase()} (${row.count})`,
               mm(MARGIN_X_MM + 2),
               mm(rowTop + row.heightMm / 2 + 0.1)
            )
         } else if (row.kind === 'item') {
            // Легкая зебра для четкости взгляда в цеху
            if (row.indexNum % 2 === 0) {
               ctx.fillStyle = '#f8fafc'
               ctx.fillRect(mm(MARGIN_X_MM), mm(rowTop), mm(CONTENT_W_MM), mm(row.heightMm))
            }

            // Нижняя линия строки
            ctx.strokeStyle = '#94a3b8'
            ctx.lineWidth = ptToPx(0.45)
            ctx.beginPath()
            ctx.moveTo(mm(MARGIN_X_MM), mm(rowBottom))
            ctx.lineTo(mm(colX.rightEdge), mm(rowBottom))
            ctx.stroke()

            // Вертикальные разделители колонок
            drawVerticalGridLines(rowTop, rowBottom, '#cbd5e1', 0.45)

            // Внешние боковые линии потемнее
            ctx.strokeStyle = '#334155'
            ctx.lineWidth = ptToPx(0.7)
            ctx.beginPath()
            ctx.moveTo(mm(MARGIN_X_MM), mm(rowTop))
            ctx.lineTo(mm(MARGIN_X_MM), mm(rowBottom))
            ctx.moveTo(mm(colX.rightEdge), mm(rowTop))
            ctx.lineTo(mm(colX.rightEdge), mm(rowBottom))
            ctx.stroke()

            const rowMidY = mm(rowTop + row.heightMm / 2 + 0.1)

            // 1. Номер по порядку
            ctx.fillStyle = '#475569'
            ctx.font = `700 ${ptToPx(8.3)}px ${FONT_FAMILY}`
            ctx.textBaseline = 'middle'
            ctx.textAlign = 'center'
            ctx.fillText(String(row.indexNum), mm(colX.no + COL_WIDTHS_MM.no / 2), rowMidY)

            // 2. Пустой чекбокс под ручку
            const boxSizeMm = 3.4
            const boxX = colX.check + (COL_WIDTHS_MM.check - boxSizeMm) / 2
            const boxY = rowTop + (row.heightMm - boxSizeMm) / 2
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(mm(boxX), mm(boxY), mm(boxSizeMm), mm(boxSizeMm))
            ctx.strokeStyle = '#1e293b'
            ctx.lineWidth = ptToPx(0.85)
            ctx.strokeRect(mm(boxX), mm(boxY), mm(boxSizeMm), mm(boxSizeMm))

            // 3. Наименование позиции (1 или несколько строк)
            ctx.fillStyle = '#0f172a'
            ctx.font = `600 ${itemFontPx}px ${FONT_FAMILY}`
            ctx.textAlign = 'left'
            if (row.nameLines.length === 1) {
               ctx.textBaseline = 'middle'
               ctx.fillText(row.nameLines[0], mm(colX.name + 2), rowMidY)
            } else {
               ctx.textBaseline = 'top'
               const lineStepMm = 3.2
               const totalTextH = row.nameLines.length * lineStepMm
               const startTextY = rowTop + Math.max(1.2, (row.heightMm - totalTextH) / 2)
               for (let l = 0; l < row.nameLines.length; l++) {
                  ctx.fillText(
                     row.nameLines[l],
                     mm(colX.name + 2),
                     mm(startTextY + l * lineStepMm)
                  )
               }
            }

            // 4. Остаток 1С
            ctx.textBaseline = 'middle'
            ctx.textAlign = 'right'
            const hasStock =
               row.item.stockKg !== null &&
               row.item.stockKg !== undefined &&
               !Number.isNaN(Number(row.item.stockKg))
            if (hasStock) {
               const stockVal = Number(row.item.stockKg)
               ctx.fillStyle = stockVal <= 0 ? '#64748b' : '#1e293b'
               ctx.font = `${stockVal <= 0 ? '600' : '700'} ${ptToPx(8.3)}px ${FONT_FAMILY}`
               ctx.fillText(`${formatWeight(stockVal)} кг`, mm(colX.plan - 1.8), rowMidY)
            } else {
               ctx.fillStyle = '#94a3b8'
               ctx.font = `500 ${ptToPx(8.3)}px ${FONT_FAMILY}`
               ctx.fillText('—', mm(colX.plan - 1.8), rowMidY)
            }

            // 5. План (кг)
            const hasExplicitPlan =
               row.item.plannedKg !== null &&
               row.item.plannedKg !== undefined &&
               Number(row.item.plannedKg) > 0
            const hasEstimated =
               !hasExplicitPlan &&
               row.item.estimatedBatchKg !== null &&
               row.item.estimatedBatchKg !== undefined &&
               Number(row.item.estimatedBatchKg) > 0

            if (hasExplicitPlan) {
               ctx.fillStyle = '#0f172a'
               ctx.font = `800 ${ptToPx(8.8)}px ${FONT_FAMILY}`
               ctx.fillText(`${formatWeight(row.item.plannedKg)} кг`, mm(colX.fact - 1.8), rowMidY)
            } else if (hasEstimated) {
               ctx.fillStyle = '#64748b'
               ctx.font = `600 ${ptToPx(8.1)}px ${FONT_FAMILY}`
               ctx.fillText(
                  `~${formatWeight(row.item.estimatedBatchKg)} кг`,
                  mm(colX.fact - 1.8),
                  rowMidY
               )
            } else {
               ctx.fillStyle = '#94a3b8'
               ctx.font = `500 ${ptToPx(8.3)}px ${FONT_FAMILY}`
               ctx.fillText('—', mm(colX.fact - 1.8), rowMidY)
            }
         } else if (row.kind === 'total') {
            ctx.fillStyle = '#e2e8f0'
            ctx.fillRect(mm(MARGIN_X_MM), mm(rowTop), mm(CONTENT_W_MM), mm(row.heightMm))

            ctx.strokeStyle = '#334155'
            ctx.lineWidth = ptToPx(0.8)
            ctx.strokeRect(mm(MARGIN_X_MM), mm(rowTop), mm(CONTENT_W_MM), mm(row.heightMm))
            drawVerticalGridLines(rowTop, rowBottom, '#64748b', 0.5)

            const rowMidY = mm(rowTop + row.heightMm / 2 + 0.1)
            ctx.textBaseline = 'middle'
            ctx.fillStyle = '#0f172a'
            ctx.font = `800 ${ptToPx(8.5)}px ${FONT_FAMILY}`

            ctx.textAlign = 'left'
            ctx.fillText(`ИТОГО В ПЛАНЕ: ${row.totalCount} поз.`, mm(colX.name + 2), rowMidY)

            ctx.textAlign = 'right'
            ctx.fillText(`${row.totalStockKg} кг`, mm(colX.plan - 1.8), rowMidY)
            ctx.fillText(
               row.hasExplicitPlannedKg ? `${row.totalPlannedKg} кг` : '—',
               mm(colX.fact - 1.8),
               rowMidY
            )
         }

         yMm = rowBottom
      }

      // Нижний колонтитул страницы
      const footerY = A4_HEIGHT_MM - MARGIN_BOTTOM_MM - 1.5
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = ptToPx(0.5)
      ctx.beginPath()
      ctx.moveTo(mm(MARGIN_X_MM), mm(footerY - 2.8))
      ctx.lineTo(mm(colX.rightEdge), mm(footerY - 2.8))
      ctx.stroke()

      ctx.fillStyle = '#64748b'
      ctx.font = `500 ${ptToPx(7.5)}px ${FONT_FAMILY}`
      ctx.textBaseline = 'bottom'
      ctx.textAlign = 'left'
      ctx.fillText(
         `ТопФиш Control • Основной план производства (Неделя №${weekNumber})`,
         mm(MARGIN_X_MM),
         mm(footerY)
      )

      ctx.textAlign = 'right'
      ctx.fillText(`Стр. ${pIdx + 1} из ${totalPages}`, mm(colX.rightEdge), mm(footerY))

      const dataUrl = canvas.toDataURL('image/jpeg', 0.93)
      const base64 = dataUrl.split(',')[1]
      const binaryStr = atob(base64)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) {
         bytes[i] = binaryStr.charCodeAt(i)
      }

      renderedPages.push({
         bytes,
         widthPx: CANVAS_W,
         heightPx: CANVAS_H,
      })
   }

   return buildPdfFromJpegs(renderedPages)
}
