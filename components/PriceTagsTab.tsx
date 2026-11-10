'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
   Tag,
   Printer,
   Download,
   Plus,
   Trash2,
   Copy,
   Check,
   Sparkles,
   Sliders,
   Eye,
   RefreshCw,
   Search,
   Upload,
   X,
   Type,
   Maximize2,
   Move,
   Scale,
   MousePointerClick,
   RotateCcw,
   FileText,
   FileDown,
   Sun,
   Hash,
   FlipHorizontal,
} from 'lucide-react'

export interface PriceTagItem {
   id: string
   title: string
   description: string
   weight: string
   price: string
   currency: string
   processingType: 'XK' | 'GK' | 'SS' | 'VYAL' | 'CUSTOM'
   customProcessingText?: string
   customColorStart?: string
   customColorEnd?: string
   textureMode:
      | 'auto'
      | 'solid_blue'
      | 'xk'
      | 'gk'
      | 'ss'
      | 'vyal'
      | 'solid'
      | 'custom'
   customTextureUrl?: string
   isItalic: boolean
   underlineDescription: boolean
   showLogo: boolean
   productCode?: string // Код товара (PLU для весов, например: 1154, печатается крупно на обороте)
   // Индивидуальные размеры и смещения блоков (как в графическом редакторе)
   titleFontSize: number // 0 for auto (px на холсте 1024x614)
   titleOffsetY?: number // смещение заголовка по вертикали (px, -80..80)
   titleOffsetX?: number // смещение заголовка по горизонтали (px, -150..150)
   priceFontSize: number // 0 for auto (px на холсте 1024x614)
   priceOffsetY?: number // смещение цены по вертикали (px, -100..100)
   priceOffsetX?: number // смещение цены по горизонтали (px, -150..150)
   weightFontSize?: number // размер шрифта веса (px, 16..44, 0 for auto)
   weightOffsetY?: number // смещение веса по вертикали (px, -50..50)
   weightOffsetX?: number // смещение веса по горизонтали (px, -50..50)
   weightBrightness?: number // яркость/контрастность веса (20..100%, по умолчанию 90)
   badgeScale?: number // масштаб шильдика обработки (70..140%, default 100)
   logoScale?: number // масштаб логотипа (50..150%, default 100)
}

export interface ProcessingConfig {
   code: 'XK' | 'GK' | 'SS' | 'VYAL'
   label: string
   badgeText: string
   colorStart: string
   colorEnd: string
   textureUrl: string
   description: string
}

export const PROCESSING_TYPES: Record<
   'XK' | 'GK' | 'SS' | 'VYAL',
   ProcessingConfig
> = {
   XK: {
      code: 'XK',
      label: 'Х/К (Холодное копчение)',
      badgeText: 'Х/К',
      colorStart: '#2b81b0',
      colorEnd: '#a9e1ff',
      textureUrl: '/textures/xk.jpg',
      description: 'Синий градиент и волны дыма',
   },
   GK: {
      code: 'GK',
      label: 'Г/К (Горячее копчение)',
      badgeText: 'Г/К',
      colorStart: '#b63d3d',
      colorEnd: '#e1999a',
      textureUrl: '/textures/gk.jpg',
      description: 'Красный градиент и текстура дыма',
   },
   SS: {
      code: 'SS',
      label: 'С/С (Слабосоленая)',
      badgeText: 'С/С',
      colorStart: '#35786c',
      colorEnd: '#abfcef',
      textureUrl: '/textures/ss.jpg',
      description: 'Бирюзовый градиент и чешуя',
   },
   VYAL: {
      code: 'VYAL',
      label: 'ВЯЛ (Вяленая)',
      badgeText: 'ВЯЛ',
      colorStart: '#877c31',
      colorEnd: '#ece5b7',
      textureUrl: '/textures/vyal.jpg',
      description: 'Золотисто-оливковый градиент',
   },
}

// Функция очистки веса от скобок
export const formatWeightText = (rawWeight?: string | null): string => {
   if (!rawWeight) return ''
   return rawWeight.replace(/^\(+|\)+$/g, '').trim()
}

// Золотые калиброванные параметры ценника TopFish (10x6 см, утвержденный стандарт)
export const TOPFISH_DEFAULTS = {
   titleOffsetY: -15, // верт: -15px
   titleOffsetX: -20, // горизонт: -20px
   priceOffsetY: 10, // верт: +10px
   priceOffsetX: 10, // горизонт: +10px
   weightFontSize: 32, // размер: 32px
   weightOffsetY: 45, // верт: +45px
   weightOffsetX: -15, // горизонт: -15px
   weightBrightness: 80, // яркость: 80% (высокий контраст)
   badgeScale: 110, // шильд: 110%
   logoScale: 100, // лого: 100%
}

// Вспомогательная функция расчёта относительной ширины символа в Onest Bold
export const getOnestCharWidth = (ch: string): number => {
   if (' !.,:;()[]/\\-–—'.includes(ch)) {
      if ('.,:;!|'.includes(ch)) return 0.32
      if ('()[]'.includes(ch)) return 0.38
      if ('-–—'.includes(ch)) return 0.50
      return 0.30
   }
   const upper = ch.toUpperCase()
   if ('I1ІЇJL'.includes(upper)) return 0.42
   if ('ГТЕЗЬЪFR'.includes(upper)) return 0.62
   if ('ЖМФЦШЩЫЮW'.includes(upper)) return 0.92
   return 0.74 // Стандартные широкие буквы кириллицы: А, Б, В, Д, К, Л, Н, О, П, С, У, Х, Ч, Я, цифры
}

export const measureOnestTextWidth = (text: string, fontSize: number): number => {
   let w = 0
   for (let i = 0; i < text.length; i++) {
      w += getOnestCharWidth(text[i]) * fontSize
   }
   return w
}

// Умное динамическое масштабирование названия по сетке (Grid Auto-Scaling):
// Рассчитывает идеальный кегль Onest Bold при СТРОГО 100% ЕСТЕСТВЕННЫХ пропорциях шрифта (без сужения и вытягивания),
// Интерфейс для динамического лейаута названия и цены (оптический вертикальный баланс)
export interface TitleToken {
   text: string
   prefix?: string
   suffix?: string
   isDesc: boolean
}

export interface DynamicTitleLayout {
   fontSize: number
   scaleY: number // строго 1.0 (100% натуральные пропорции шрифта без сужения)
   linesCount: number
   titleHeight: number
   dynamicTitleY: number // Y-координата для Canvas (на базовом холсте 1024x614)
   dynamicTitleTopPercent: number // Процент top для Live Preview и листа печати
   dynamicPriceY: number // Базовая Y-координата цены для Canvas
   dynamicPriceTopPercent: number // Процент top контейнера цены для Live Preview и листа печати
   lines: TitleToken[][]
}

// Умное динамическое масштабирование названия и оптический баланс карточки:
// Рассчитывает идеальный кегль Onest Bold при СТРОГО 100% ЕСТЕСТВЕННЫХ пропорциях шрифта (без искажения и сужения),
// укладывает слова в естественный поток строк (как в эталонных референсах) и гарантирует безопасный зазор до цены.
export const computeDynamicTitleLayout = (
   title: string,
   desc: string
): DynamicTitleLayout => {
   const rawTitle = (title || '').trim().toUpperCase()
   const cleanDesc = (desc || '').trim().toUpperCase()
   // Если название не заполнено, используем плейсхолдер «НАЗВАНИЕ ТОВАРА»
   const cleanTitle = rawTitle || (cleanDesc ? '' : 'НАЗВАНИЕ ТОВАРА')

   const maxW = 926 // 1024 - 34px (левый отступ) - 64px (правый безопасный отступ)
   const maxMultiLineH = 195 // Максимальная высота блока названия при многострочности

   const rawTokens: TitleToken[] = []
   cleanTitle
      .split(/\s+/)
      .filter(Boolean)
      .forEach((w) => rawTokens.push({ text: w, isDesc: false }))

   if (cleanDesc) {
      const descWords = cleanDesc.split(/\s+/).filter(Boolean)
      descWords.forEach((w, idx) => {
         const isFirst = idx === 0
         const isLast = idx === descWords.length - 1
         rawTokens.push({
            prefix: isFirst ? '(' : undefined,
            text: w,
            suffix: isLast ? ')' : undefined,
            isDesc: true,
         })
      })
   }

   // 1. Одиночное слово без описания (СИГ, ЯЗЬ, СУДАК, ТЕРПУГ, СКУМБРИЯ, ПОТРАШЕННАЯ):
   if (!cleanDesc && rawTokens.length === 1) {
      const singleToken = rawTokens[0]
      const wCoeff = measureOnestTextWidth(singleToken.text, 1)
      const fitSize = Math.floor(maxW / Math.max(0.1, wCoeff))
      const fontSize = Math.max(36, Math.min(220, fitSize))
      const titleHeight = fontSize

      const targetZoneH = 215
      const diff = Math.max(0, targetZoneH - titleHeight)

      const dynamicTitleY = Math.round(28 + diff * 0.44)
      const dynamicTitleTopPercent = Number(
         (4.6 + (diff * 0.44 / 614) * 100).toFixed(2)
      )

      const dynamicPriceY = 340
      const dynamicPriceTopPercent = 12.0

      return {
         fontSize,
         scaleY: 1.0,
         linesCount: 1,
         titleHeight,
         dynamicTitleY,
         dynamicTitleTopPercent,
         dynamicPriceY,
         dynamicPriceTopPercent,
         lines: [[singleToken]],
      }
   }

   // 2. Многословное название или название с описанием (КОЛБАСА (ФОРЕЛЬ, ТУНЕЦ, МАСЛЯНАЯ), СИГ (ПОТРОШЕННЫЙ)):
   let fontSize = 36
   let bestLines: TitleToken[][] = [rawTokens]
   let linesCount = 2

   for (let sz = 140; sz >= 36; sz -= 2) {
      const candidateLines: TitleToken[][] = []
      let curLine: TitleToken[] = []
      let curW = 0
      const spaceW = 0.32 * sz
      let hasOverflow = false

      for (const t of rawTokens) {
         const tStr = (t.prefix || '') + t.text + (t.suffix || '')
         const tW = measureOnestTextWidth(tStr, sz)
         if (tW > maxW) {
            hasOverflow = true
            break
         }
         const addedW = curLine.length > 0 ? spaceW + tW : tW

         if (curLine.length > 0 && curW + addedW > maxW) {
            candidateLines.push(curLine)
            curLine = [t]
            curW = tW
         } else {
            curLine.push(t)
            curW += addedW
         }
      }
      if (hasOverflow) continue
      if (curLine.length > 0) candidateLines.push(curLine)

      const totalH = candidateLines.length * sz * 1.08
      if (totalH <= maxMultiLineH) {
         fontSize = sz
         linesCount = candidateLines.length
         bestLines = candidateLines
         break
      }
   }

   const titleHeight = Math.round(linesCount * fontSize * 1.08)
   const targetZoneH = 215
   const diff = Math.max(0, targetZoneH - titleHeight)

   const dynamicTitleY = Math.round(28 + diff * 0.44)
   const dynamicTitleTopPercent = Number(
      (4.6 + (diff * 0.44 / 614) * 100).toFixed(2)
   )

   const dynamicPriceY = Math.round(340 - diff * 0.1)
   const dynamicPriceTopPercent = Number(
      (12.0 - (diff * 0.1 / 614) * 100).toFixed(2)
   )

   return {
      fontSize,
      scaleY: 1.0,
      linesCount,
      titleHeight,
      dynamicTitleY,
      dynamicTitleTopPercent,
      dynamicPriceY,
      dynamicPriceTopPercent,
      lines: bestLines,
   }
}

export const computeDynamicTitleFontSize = (
   title: string,
   desc: string
): number => {
   return computeDynamicTitleLayout(title, desc).fontSize
}

export const computeDynamicTitleScaleY = (
   title: string,
   desc: string
): number => {
   return 1.0
}

// Умное динамическое масштабирование цены по сетке (Grid Auto-Scaling):
export const computeDynamicPriceFontSize = (price: string): number => {
   const cleanPrice = (price || '0').trim()
   const len = cleanPrice.length
   if (len <= 3) return 226 // 250, 500, 324
   if (len <= 4) return 216 // 3333, 1111 (золотой эталон заказчика: ровно 216px!)
   if (len <= 5) return 180 // 12345
   if (len <= 6) return 150
   return 130
}

// Расчёт цвета и толщины шрифта для граммовки веса на основе заданной яркости (20..100%)
export const getWeightColors = (
   brightness: number = 80,
   isEco: boolean = false
): { color: string; borderColor: string; fontWeight: number } => {
   const b = Math.max(20, Math.min(100, brightness))
   if (isEco) {
      // Для белого листа (эконом-печать): чем выше контрастность, тем темнее и четче текст
      const alpha = 0.45 + (b / 100) * 0.55
      const borderAlpha = 0.35 + (b / 100) * 0.45
      return {
         color: `rgba(15, 23, 42, ${alpha.toFixed(2)})`,
         borderColor: `rgba(15, 23, 42, ${borderAlpha.toFixed(2)})`,
         fontWeight: b >= 75 ? 600 : b >= 50 ? 500 : 400,
      }
   }

   // Для темного фона (синий/текстуры):
   // При 100%: #ffffff (чистый яркий белый, максимальная читабельность)
   // При 90%: #f1f5f9 (яркий ледяной белый)
   // При 80%: #e6ebf5 (сверхчеткий контрастный белый)
   // При 70%: #c8cad5 (светло-серебристый)
   // При 30%: #6c7290 (исходный приглушенный)
   const t = (b - 20) / 80 // 0 .. 1
   const r = Math.round(108 + t * (255 - 108))
   const g = Math.round(114 + t * (255 - 114))
   const blue = Math.round(144 + t * (255 - 144))
   const borderAlpha = (0.35 + t * 0.5).toFixed(2)

   return {
      color: `rgb(${r}, ${g}, ${blue})`,
      borderColor: `rgba(${r}, ${g}, ${blue}, ${borderAlpha})`,
      fontWeight: b >= 80 ? 600 : b >= 60 ? 500 : 400,
   }
}

// Конвертер пикселей (на базе холста 1024x614) в cqi для идеального масштабирования превью
export const pxToCqi = (pxValue: number): string => {
   return `${((pxValue / 1024) * 100).toFixed(3)}cqi`
}

const DEFAULT_TAG: PriceTagItem = {
   id: 'current',
   title: 'СИГ',
   description: '',
   weight: '100г',
   price: '3333',
   currency: '₽',
   processingType: 'VYAL',
   textureMode: 'auto',
   isItalic: true,
   underlineDescription: true,
   showLogo: true,
   productCode: '1154', // Код для весов по умолчанию (печатается на обороте)
   titleFontSize: 0, // 0 - умная авто-сетка (220px для Сиг/Язь)
   titleOffsetY: TOPFISH_DEFAULTS.titleOffsetY,
   titleOffsetX: TOPFISH_DEFAULTS.titleOffsetX,
   priceFontSize: 0, // 0 - умная авто-сетка (216px для 3333)
   priceOffsetY: TOPFISH_DEFAULTS.priceOffsetY,
   priceOffsetX: TOPFISH_DEFAULTS.priceOffsetX,
   weightFontSize: TOPFISH_DEFAULTS.weightFontSize,
   weightOffsetY: TOPFISH_DEFAULTS.weightOffsetY,
   weightOffsetX: TOPFISH_DEFAULTS.weightOffsetX,
   weightBrightness: TOPFISH_DEFAULTS.weightBrightness,
   badgeScale: TOPFISH_DEFAULTS.badgeScale,
   logoScale: TOPFISH_DEFAULTS.logoScale,
}

const SAMPLE_PRESETS: { name: string; tag: Omit<PriceTagItem, 'id'> }[] = [
   {
      name: '1. Колбаса (форель, тунец, масляная) • 500₽ • Х/К',
      tag: {
         title: 'КОЛБАСА',
         description: 'ФОРЕЛЬ, ТУНЕЦ, МАСЛЯНАЯ',
         weight: '',
         price: '500',
         currency: '₽',
         processingType: 'XK',
         textureMode: 'auto',
         isItalic: true,
         underlineDescription: true,
         showLogo: true,
         productCode: '2042',
         titleFontSize: 0,
         priceFontSize: 0,
         titleOffsetY: TOPFISH_DEFAULTS.titleOffsetY,
         titleOffsetX: TOPFISH_DEFAULTS.titleOffsetX,
         priceOffsetY: TOPFISH_DEFAULTS.priceOffsetY,
         priceOffsetX: TOPFISH_DEFAULTS.priceOffsetX,
         weightFontSize: TOPFISH_DEFAULTS.weightFontSize,
         weightOffsetY: TOPFISH_DEFAULTS.weightOffsetY,
         weightOffsetX: TOPFISH_DEFAULTS.weightOffsetX,
         weightBrightness: TOPFISH_DEFAULTS.weightBrightness,
         badgeScale: TOPFISH_DEFAULTS.badgeScale,
         logoScale: TOPFISH_DEFAULTS.logoScale,
      },
   },
   {
      name: '2. Терпуг • 3130₽ • Г/К',
      tag: {
         title: 'ТЕРПУГ',
         description: '',
         weight: '',
         price: '3130',
         currency: '₽',
         processingType: 'GK',
         textureMode: 'auto',
         isItalic: true,
         underlineDescription: true,
         showLogo: true,
         productCode: '3130',
         titleFontSize: 0,
         priceFontSize: 0,
         titleOffsetY: TOPFISH_DEFAULTS.titleOffsetY,
         titleOffsetX: TOPFISH_DEFAULTS.titleOffsetX,
         priceOffsetY: TOPFISH_DEFAULTS.priceOffsetY,
         priceOffsetX: TOPFISH_DEFAULTS.priceOffsetX,
         weightFontSize: TOPFISH_DEFAULTS.weightFontSize,
         weightOffsetY: TOPFISH_DEFAULTS.weightOffsetY,
         weightOffsetX: TOPFISH_DEFAULTS.weightOffsetX,
         weightBrightness: TOPFISH_DEFAULTS.weightBrightness,
         badgeScale: TOPFISH_DEFAULTS.badgeScale,
         logoScale: TOPFISH_DEFAULTS.logoScale,
      },
   },
   {
      name: '3. Скумбрия (без головы) • 1111₽ • С/С',
      tag: {
         title: 'СКУМБРИЯ',
         description: 'БЕЗ ГОЛОВЫ',
         weight: '',
         price: '1111',
         currency: '₽',
         processingType: 'SS',
         textureMode: 'auto',
         isItalic: true,
         underlineDescription: true,
         showLogo: true,
         productCode: '1111',
         titleFontSize: 0,
         priceFontSize: 0,
         titleOffsetY: TOPFISH_DEFAULTS.titleOffsetY,
         titleOffsetX: TOPFISH_DEFAULTS.titleOffsetX,
         priceOffsetY: TOPFISH_DEFAULTS.priceOffsetY,
         priceOffsetX: TOPFISH_DEFAULTS.priceOffsetX,
         weightFontSize: TOPFISH_DEFAULTS.weightFontSize,
         weightOffsetY: TOPFISH_DEFAULTS.weightOffsetY,
         weightOffsetX: TOPFISH_DEFAULTS.weightOffsetX,
         weightBrightness: TOPFISH_DEFAULTS.weightBrightness,
         badgeScale: TOPFISH_DEFAULTS.badgeScale,
         logoScale: TOPFISH_DEFAULTS.logoScale,
      },
   },
   {
      name: '4. Сиг / Язь • 3333₽ • 100г • ВЯЛ (Стандарт TopFish)',
      tag: {
         title: 'СИГ',
         description: '',
         weight: '100г',
         price: '3333',
         currency: '₽',
         processingType: 'VYAL',
         textureMode: 'auto',
         isItalic: true,
         underlineDescription: true,
         showLogo: true,
         productCode: '1154',
         titleFontSize: 0,
         priceFontSize: 0,
         titleOffsetY: TOPFISH_DEFAULTS.titleOffsetY,
         titleOffsetX: TOPFISH_DEFAULTS.titleOffsetX,
         priceOffsetY: TOPFISH_DEFAULTS.priceOffsetY,
         priceOffsetX: TOPFISH_DEFAULTS.priceOffsetX,
         weightFontSize: TOPFISH_DEFAULTS.weightFontSize,
         weightOffsetY: TOPFISH_DEFAULTS.weightOffsetY,
         weightOffsetX: TOPFISH_DEFAULTS.weightOffsetX,
         weightBrightness: TOPFISH_DEFAULTS.weightBrightness,
         badgeScale: TOPFISH_DEFAULTS.badgeScale,
         logoScale: TOPFISH_DEFAULTS.logoScale,
      },
   },
]

// Отрисовка оборотной стороны ценника на Canvas (крупный код товара для весов)
export async function drawTagBackToCanvas(
   tag: PriceTagItem,
   targetCanvas: HTMLCanvasElement,
   scale: number = 1
): Promise<void> {
   const baseW = 1024
   const baseH = 614
   targetCanvas.width = baseW * scale
   targetCanvas.height = baseH * scale

   const ctx = targetCanvas.getContext('2d')
   if (!ctx) return

   ctx.save()
   ctx.scale(scale, scale)

   // 1. Белый чистый фон (для экономичной двусторонней печати)
   ctx.fillStyle = '#ffffff'
   ctx.fillRect(0, 0, baseW, baseH)

   // 2. Серая пунктирная рамка для линии реза ценника
   ctx.strokeStyle = '#94a3b8'
   ctx.lineWidth = 2
   ctx.setLineDash([10, 10])
   ctx.strokeRect(6, 6, baseW - 12, baseH - 12)
   ctx.setLineDash([])

   // 3. Верхняя строка: Название товара и вид обработки
   const titleText = (tag.title || '').trim().toUpperCase()
   const descText = (tag.description || '').trim().toUpperCase()
   const procBadge =
      tag.processingType === 'CUSTOM'
         ? tag.customProcessingText || 'ТОП'
         : PROCESSING_TYPES[tag.processingType]?.badgeText || ''

   ctx.font = 'bold 36px "Onest", sans-serif'
   ctx.fillStyle = '#334155'
   ctx.textAlign = 'left'
   ctx.textBaseline = 'top'

   const maxTitleW = baseW - 240
   let fullTitle = titleText + (descText ? ` (${descText})` : '')
   if (ctx.measureText(fullTitle).width > maxTitleW) {
      while (
         fullTitle.length > 5 &&
         ctx.measureText(fullTitle + '...').width > maxTitleW
      ) {
         fullTitle = fullTitle.slice(0, -1).trim()
      }
      fullTitle += '...'
   }
   ctx.fillText(fullTitle, 48, 42)

   if (procBadge) {
      ctx.textAlign = 'right'
      ctx.font = '900 36px "Onest", sans-serif'
      ctx.fillStyle = '#475569'
      ctx.fillText(procBadge, baseW - 48, 42)
   }

   // Тонкая разделительная линия сверху
   ctx.strokeStyle = '#e2e8f0'
   ctx.lineWidth = 2
   ctx.beginPath()
   ctx.moveTo(48, 96)
   ctx.lineTo(baseW - 48, 96)
   ctx.stroke()

   // 4. ЦЕНТР: ОГРОМНЫЙ КОД ТОВАРА ДЛЯ ВЕСОВ
   const code = (tag.productCode || '').trim() || '—'

   // Подпись над кодом
   ctx.font = 'bold 28px "Onest", sans-serif'
   ctx.fillStyle = '#64748b'
   ctx.textAlign = 'center'
   ctx.textBaseline = 'middle'
   ctx.fillText('КОД ДЛЯ ВЕСОВ / PLU', baseW / 2, baseH / 2 - 80)

   // Огромные цифры кода
   const codeFontSize =
      code.length <= 4
         ? 200
         : code.length <= 6
           ? 160
           : code.length <= 8
             ? 120
             : 90
   ctx.font = `900 ${codeFontSize}px "Onest", sans-serif`
   ctx.fillStyle = '#0f172a'
   ctx.fillText(code, baseW / 2, baseH / 2 + 25)

   // 5. Нижняя разделительная линия и инфо
   ctx.strokeStyle = '#e2e8f0'
   ctx.lineWidth = 2
   ctx.beginPath()
   ctx.moveTo(48, baseH - 96)
   ctx.lineTo(baseW - 48, baseH - 96)
   ctx.stroke()

   ctx.font = 'bold 30px "Onest", sans-serif'
   ctx.fillStyle = '#94a3b8'
   ctx.textAlign = 'left'
   ctx.textBaseline = 'bottom'
   ctx.fillText('ТОПФИШ', 48, baseH - 42)

   if (tag.price) {
      const cleanWeight = formatWeightText(tag.weight)
      const priceStr = `${tag.price} ${tag.currency || '₽'}${cleanWeight ? ' / ' + cleanWeight : ''}`
      ctx.textAlign = 'right'
      ctx.fillStyle = '#1e293b'
      ctx.font = 'bold 34px "Onest", sans-serif'
      ctx.fillText(priceStr, baseW - 48, baseH - 42)
   }

   ctx.restore()
}

// Генератор PDF документа со строгой сеткой ценников 10см х 6см на листах А4 (8 шт на страницу)
// без белых межстрочных зазоров, с синими вылетами 1.5 мм слева и справа и точными метками реза
export async function generatePriceTagsPdf(
   tags: PriceTagItem[],
   drawFn: (
      tag: PriceTagItem,
      canvas: HTMLCanvasElement,
      scale?: number,
      sideSafeMarginPx?: number
   ) => Promise<void>,
   drawBackFn?: (
      tag: PriceTagItem,
      canvas: HTMLCanvasElement,
      scale?: number
   ) => Promise<void>,
   sideMode: 'both' | 'front_only' | 'back_only' = 'both'
): Promise<Blob> {
   const cardW = 283.465 // 100mm в pt (72 pt / inch * 100mm / 25.4mm)
   const cardH = 170.079 // 60mm в pt
   const bleedW = 4.252 // 1.5mm внешний синий вылет слева и справа от ценников
   const colX = [14.173, 297.638] // 5mm и 105mm слева
   const topMarginPt = 34.016 // 12mm сверху листа А4
   const row0Bottom = 841.89 - topMarginPt - cardH
   // 4 ряда вплотную друг к другу (0 мм зазора — убираем белую полосу между рядами для реза в 1 движение)
   const rowY = [
      row0Bottom,
      row0Bottom - cardH,
      row0Bottom - cardH * 2,
      row0Bottom - cardH * 3,
   ]

   const tagsPerPage = 8
   const numBatches = Math.max(1, Math.ceil(tags.length / tagsPerPage))

   const needFront = sideMode === 'both' || sideMode === 'front_only'
   const needBack =
      (sideMode === 'both' || sideMode === 'back_only') && !!drawBackFn

   type RenderedImg = {
      bytes: Uint8Array
      widthPx: number
      heightPx: number
      objNum: number
      leftRgb: [number, number, number]
      rightRgb: [number, number, number]
   }

   const sampleEdgeRgb = (
      canvas: HTMLCanvasElement,
      isRight: boolean
   ): [number, number, number] => {
      const fallback: [number, number, number] = [23 / 255, 29 / 255, 65 / 255]
      try {
         const ctx = canvas.getContext('2d')
         if (!ctx) return fallback
         const x = isRight ? canvas.width - 2 : 1
         // Сэмплируем цвет строго из верхней половины края (выше плашки ВЯЛ/Х/К внизу), чтобы полоса всегда была синей
         const ratios = [0.1, 0.22, 0.35, 0.48]
         let r = 0
         let g = 0
         let b = 0
         for (const ratio of ratios) {
            const y = Math.min(
               canvas.height - 1,
               Math.max(0, Math.round(canvas.height * ratio))
            )
            const px = ctx.getImageData(x, y, 1, 1).data
            r += px[0]
            g += px[1]
            b += px[2]
         }
         const n = ratios.length
         return [r / (n * 255), g / (n * 255), b / (n * 255)]
      } catch {
         return fallback
      }
   }

   const frontImages: RenderedImg[] = []
   const backImages: RenderedImg[] = []

   if (needFront) {
      for (const tag of tags) {
         const offCanvas = document.createElement('canvas')
         // 16px (~1.56мм) внутренний безопасный отступ по краям, чтобы нарезатель не задел "ВЯЛ" или граммовку
         await drawFn(tag, offCanvas, 1.5, 16)
         const leftRgb = sampleEdgeRgb(offCanvas, false)
         const rightRgb = sampleEdgeRgb(offCanvas, true)
         const dataUrl = offCanvas.toDataURL('image/jpeg', 0.92)
         const base64 = dataUrl.split(',')[1]
         const binaryStr = atob(base64)
         const bytes = new Uint8Array(binaryStr.length)
         for (let i = 0; i < binaryStr.length; i++)
            bytes[i] = binaryStr.charCodeAt(i)
         frontImages.push({
            bytes,
            widthPx: offCanvas.width,
            heightPx: offCanvas.height,
            objNum: 0,
            leftRgb,
            rightRgb,
         })
      }
   }

   if (needBack && drawBackFn) {
      for (const tag of tags) {
         const offCanvas = document.createElement('canvas')
         await drawBackFn(tag, offCanvas, 1.5)
         const dataUrl = offCanvas.toDataURL('image/jpeg', 0.92)
         const base64 = dataUrl.split(',')[1]
         const binaryStr = atob(base64)
         const bytes = new Uint8Array(binaryStr.length)
         for (let i = 0; i < binaryStr.length; i++)
            bytes[i] = binaryStr.charCodeAt(i)
         backImages.push({
            bytes,
            widthPx: offCanvas.width,
            heightPx: offCanvas.height,
            objNum: 0,
            leftRgb: [1, 1, 1],
            rightRgb: [1, 1, 1],
         })
      }
   }

   type PageSlot = {
      image: RenderedImg
      col: number
      row: number
   }
   type PdfPage = {
      slots: PageSlot[]
      isBack: boolean
   }
   const pdfPages: PdfPage[] = []

   for (let b = 0; b < numBatches; b++) {
      const start = b * tagsPerPage
      const count = Math.min(tagsPerPage, tags.length - start)

      // 1. Лицевая страница
      if (needFront) {
         const pageSlots: PageSlot[] = []
         for (let slot = 0; slot < count; slot++) {
            const tagIdx = start + slot
            const col = slot % 2
            const row = Math.floor(slot / 2)
            if (frontImages[tagIdx]) {
               pageSlots.push({ image: frontImages[tagIdx], col, row })
            }
         }
         pdfPages.push({ slots: pageSlots, isBack: false })
      }

      // 2. Оборотная страница (ГОРИЗОНТАЛЬНО ЗЕРКАЛЬНАЯ по колонкам для идеального двустороннего переворота)
      if (needBack) {
         const pageSlots: PageSlot[] = []
         const numRows = Math.ceil(count / 2)
         for (let r = 0; r < numRows; r++) {
            const leftIdx = start + r * 2 // был слева на лице
            const rightIdx = start + r * 2 + 1 // был справа на лице (если есть)

            // На обороте: правый тег печатается СЛЕВА (col 0)
            if (rightIdx < start + count && backImages[rightIdx]) {
               pageSlots.push({ image: backImages[rightIdx], col: 0, row: r })
            }
            // На обороте: левый тег печатается СПРАВА (col 1)
            if (leftIdx < start + count && backImages[leftIdx]) {
               pageSlots.push({ image: backImages[leftIdx], col: 1, row: r })
            }
         }
         pdfPages.push({ slots: pageSlots, isBack: true })
      }
   }

   const totalPages = pdfPages.length
   let objCounter = 3 + totalPages * 2

   const allImages: RenderedImg[] = []
   frontImages.forEach((img) => {
      img.objNum = objCounter++
      allImages.push(img)
   })
   backImages.forEach((img) => {
      img.objNum = objCounter++
      allImages.push(img)
   })

   const chunks: (Uint8Array | string)[] = []
   const offsets: number[] = []
   let currentOffset = 0

   function addString(str: string) {
      chunks.push(str)
      currentOffset += str.length
   }

   function addBytes(bytes: Uint8Array) {
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
   addString(
      `2 0 obj\n<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${totalPages} >>\nendobj\n`
   )

   // Страницы
   for (let p = 0; p < totalPages; p++) {
      const pageObjNum = 3 + p * 2
      const contentObjNum = 4 + p * 2
      const page = pdfPages[p]
      const pageSlots = page.slots

      let contentStream = 'q\n'
      const pageXObjects: { name: string; objNum: number }[] = []

      // Для лицевой стороны рисуем синий вылет 1.5 мм слева и справа от ценников и сплошную подложку под рядами
      if (!page.isBack && pageSlots.length > 0) {
         const rowsMap = new Map<number, PageSlot[]>()
         for (const slot of pageSlots) {
            const list = rowsMap.get(slot.row) || []
            list.push(slot)
            rowsMap.set(slot.row, list)
         }
         rowsMap.forEach((slotsInRow, rIdx) => {
            slotsInRow.sort((a, b) => a.col - b.col)
            const firstSlot = slotsInRow[0]
            const lastSlot = slotsInRow[slotsInRow.length - 1]
            const y = rowY[rIdx]
            const [lr, lg, lb] = firstSlot.image.leftRgb
            const [rr, rg, rb] = lastSlot.image.rightRgb

            // Левый вылет 1.5 мм синим цветом (слева от левой линии реза и шильдика)
            const leftBleedX = colX[firstSlot.col] - bleedW
            contentStream += `q ${lr.toFixed(3)} ${lg.toFixed(3)} ${lb.toFixed(3)} rg ${leftBleedX.toFixed(3)} ${(y - 0.15).toFixed(3)} ${(bleedW + 1.0).toFixed(3)} ${(cardH + 0.3).toFixed(3)} re f Q\n`

            // Правый вылет 1.5 мм синим цветом (справа от правой линии реза)
            const rightBleedX = colX[lastSlot.col] + cardW - 1.0
            contentStream += `q ${rr.toFixed(3)} ${rg.toFixed(3)} ${rb.toFixed(3)} rg ${rightBleedX.toFixed(3)} ${(y - 0.15).toFixed(3)} ${(bleedW + 1.0).toFixed(3)} ${(cardH + 0.3).toFixed(3)} re f Q\n`

            // Сплошная синяя подложка за рядом, исключающая просвет белой полосы на стыках
            const bgStartX = colX[firstSlot.col]
            const bgEndX = colX[lastSlot.col] + cardW
            contentStream += `q ${lr.toFixed(3)} ${lg.toFixed(3)} ${lb.toFixed(3)} rg ${bgStartX.toFixed(3)} ${(y - 0.15).toFixed(3)} ${(bgEndX - bgStartX).toFixed(3)} ${(cardH + 0.3).toFixed(3)} re f Q\n`
         })
      }

      pageSlots.forEach((slot, sIdx) => {
         const imgName = `ImP${p + 1}_${sIdx + 1}`
         pageXObjects.push({ name: imgName, objNum: slot.image.objNum })
         const x = colX[slot.col].toFixed(3)
         const y = rowY[slot.row].toFixed(3)
         contentStream += `q ${cardW.toFixed(3)} 0 0 ${cardH.toFixed(3)} ${x} ${y} cm /${imgName} Do Q\n`
      })

      // Метки реза (чёрточки): ровно по границам ценников 100х60 мм (в самом верху по краю шильдика и внизу)
      if (pageSlots.length > 0) {
         const tickLen = 14.173 // 5 mm длина чёрточки
         const gapPt = 1.0 // аккуратный зазор от края ценника (~0.35 мм)

         // Группируем крайние ряды для каждой вертикальной линии реза X
         const xBounds = new Map<string, { minRow: number; maxRow: number }>()
         for (const s of pageSlots) {
            const edges = [colX[s.col].toFixed(3), (colX[s.col] + cardW).toFixed(3)]
            for (const xKey of edges) {
               const cur = xBounds.get(xKey)
               if (!cur) {
                  xBounds.set(xKey, { minRow: s.row, maxRow: s.row })
               } else {
                  cur.minRow = Math.min(cur.minRow, s.row)
                  cur.maxRow = Math.max(cur.maxRow, s.row)
               }
            }
         }

         contentStream += 'q 0.75 w 0.100 0.100 0.100 RG\n'
         xBounds.forEach(({ minRow, maxRow }, xStr) => {
            const topY = rowY[minRow] + cardH
            const bottomY = rowY[maxRow]
            // Чёрточка в самом верху ценника (ровно по левому краю шильдика, центру и правому краю перед вылетом)
            contentStream += `${xStr} ${(topY + gapPt).toFixed(3)} m ${xStr} ${(topY + gapPt + tickLen).toFixed(3)} l S\n`
            // Ответная чёрточка снизу под последним рядом этой колонки
            contentStream += `${xStr} ${(bottomY - gapPt).toFixed(3)} m ${xStr} ${(bottomY - gapPt - tickLen).toFixed(3)} l S\n`
         })

         // Горизонтальные чёрточки строго снаружи синих вылетов в белом поле (без белых точек на углах)
         if (!page.isBack) {
            const leftSideTicks = new Set<string>()
            const rightSideTicks = new Set<string>()
            const rowsMap = new Map<number, PageSlot[]>()
            for (const slot of pageSlots) {
               const list = rowsMap.get(slot.row) || []
               list.push(slot)
               rowsMap.set(slot.row, list)
            }
            rowsMap.forEach((slotsInRow, rIdx) => {
               slotsInRow.sort((a, b) => a.col - b.col)
               const leftX = colX[slotsInRow[0].col]
               const rightX = colX[slotsInRow[slotsInRow.length - 1].col] + cardW
               const yBottom = rowY[rIdx]
               const yTop = yBottom + cardH
               leftSideTicks.add(`${leftX.toFixed(3)}|${yTop.toFixed(3)}`)
               leftSideTicks.add(`${leftX.toFixed(3)}|${yBottom.toFixed(3)}`)
               rightSideTicks.add(`${rightX.toFixed(3)}|${yTop.toFixed(3)}`)
               rightSideTicks.add(`${rightX.toFixed(3)}|${yBottom.toFixed(3)}`)
            })

            const hTickLen = 7.5 // ~2.6 mm в белом поле снаружи вылета
            leftSideTicks.forEach((entry) => {
               const [xStr, yStr] = entry.split('|')
               const bleedStart = Number(xStr) - bleedW
               contentStream += `${(bleedStart - gapPt - hTickLen).toFixed(3)} ${yStr} m ${(bleedStart - gapPt).toFixed(3)} ${yStr} l S\n`
            })
            rightSideTicks.forEach((entry) => {
               const [xStr, yStr] = entry.split('|')
               const bleedEnd = Number(xStr) + bleedW
               contentStream += `${(bleedEnd + gapPt).toFixed(3)} ${yStr} m ${(bleedEnd + gapPt + hTickLen).toFixed(3)} ${yStr} l S\n`
            })
         }
         contentStream += 'Q\n'
      }

      contentStream += 'Q\n'

      const xobjDict = pageXObjects
         .map((img) => `/${img.name} ${img.objNum} 0 R`)
         .join(' ')
      offsets[pageObjNum] = currentOffset
      addString(
         `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.276 841.890] /Resources << /XObject << ${xobjDict} >> /ProcSet [/PDF /ImageC] >> /Contents ${contentObjNum} 0 R >>\nendobj\n`
      )

      offsets[contentObjNum] = currentOffset
      addString(
         `${contentObjNum} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`
      )
   }

   // Объекты картинок
   for (const img of allImages) {
      offsets[img.objNum] = currentOffset
      addString(
         `${img.objNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${img.widthPx} /Height ${img.heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`
      )
      addBytes(img.bytes)
      addString('\nendstream\nendobj\n')
   }

   // Xref
   const startXref = currentOffset
   const totalObjs = objCounter
   let xref = `xref\n0 ${totalObjs}\n0000000000 65535 f \n`
   for (let i = 1; i < totalObjs; i++) {
      const off = String(offsets[i] || 0).padStart(10, '0')
      xref += `${off} 00000 n \n`
   }
   addString(xref)

   // Trailer
   addString(
      `trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`
   )

   const blobParts: any[] = chunks.map((chunk) => {
      if (typeof chunk === 'string') {
         const arr = new Uint8Array(chunk.length)
         for (let i = 0; i < chunk.length; i++) {
            arr[i] = chunk.charCodeAt(i) & 0xff
         }
         return arr
      }
      return chunk
   })

   return new Blob(blobParts, { type: 'application/pdf' })
}

// Генератор Word (.doc) документа с точной таблицей 10см х 6см на листах А4 в формате MHTML
// с поддержкой двусторонней печати и встроенными изображениями ценников
export async function generatePriceTagsWord(
   tags: PriceTagItem[],
   drawFn: (
      tag: PriceTagItem,
      canvas: HTMLCanvasElement,
      scale?: number,
      sideSafeMarginPx?: number
   ) => Promise<void>,
   drawBackFn?: (
      tag: PriceTagItem,
      canvas: HTMLCanvasElement,
      scale?: number
   ) => Promise<void>,
   sideMode: 'both' | 'front_only' | 'back_only' = 'both'
): Promise<Blob> {
   const needFront = sideMode === 'both' || sideMode === 'front_only'
   const needBack =
      (sideMode === 'both' || sideMode === 'back_only') && !!drawBackFn

   const frontImagesBase64: string[] = []
   const backImagesBase64: string[] = []

   if (needFront) {
      for (const tag of tags) {
         const offCanvas = document.createElement('canvas')
         await drawFn(tag, offCanvas, 1.5, 16)
         frontImagesBase64.push(offCanvas.toDataURL('image/jpeg', 0.92))
      }
   }

   if (needBack && drawBackFn) {
      for (const tag of tags) {
         const offCanvas = document.createElement('canvas')
         await drawBackFn(tag, offCanvas, 1.5)
         backImagesBase64.push(offCanvas.toDataURL('image/jpeg', 0.92))
      }
   }

   const tagsPerPage = 8
   const numBatches = Math.max(1, Math.ceil(tags.length / tagsPerPage))
   let pagesHtml = ''

   for (let b = 0; b < numBatches; b++) {
      const start = b * tagsPerPage
      const count = Math.min(tagsPerPage, tags.length - start)

      // 1. Лицевая таблица
      if (needFront) {
         let rowsHtml = ''
         for (let r = 0; r < 4; r++) {
            const idx1 = start + r * 2
            const idx2 = start + r * 2 + 1

            const img1 =
               idx1 < start + count && frontImagesBase64[idx1]
                  ? `<img src="cid:tag_front_${idx1}" style="width:100mm; height:60mm; display:block;" width="378" height="227" alt="Ценник 10x6см" />`
                  : ''
            const img2 =
               idx2 < start + count && frontImagesBase64[idx2]
                  ? `<img src="cid:tag_front_${idx2}" style="width:100mm; height:60mm; display:block;" width="378" height="227" alt="Ценник 10x6см" />`
                  : ''

            rowsHtml += `
            <tr style="height:60mm;">
              <td style="width:100mm; height:60mm; padding:0; border:0; text-align:center; vertical-align:middle;">${img1}</td>
              <td style="width:100mm; height:60mm; padding:0; border:0; text-align:center; vertical-align:middle;">${img2}</td>
            </tr>`
         }

         const isLast = !needBack && b === numBatches - 1
         pagesHtml += `
         <div class="Section1" ${!isLast ? 'style="page-break-after:always;"' : ''}>
           <div style="font-size:10pt; color:#666; margin-bottom:2mm; text-align:center;">
             Лист ${b * (needBack ? 2 : 1) + 1} • Лицевая сторона ценников (10×6 см)
           </div>
           <table style="width:200mm; border-collapse:collapse; margin:0 auto; table-layout:fixed;" cellpadding="0" cellspacing="0">
             ${rowsHtml}
           </table>
         </div>`
      }

      // 2. Оборотная таблица (зеркальная по колонкам для двухсторонней печати)
      if (needBack) {
         let rowsHtml = ''
         for (let r = 0; r < 4; r++) {
            const leftIdx = start + r * 2 + 1 // зеркально: справа налево
            const rightIdx = start + r * 2

            const imgLeft =
               leftIdx < start + count && backImagesBase64[leftIdx]
                  ? `<img src="cid:tag_back_${leftIdx}" style="width:100mm; height:60mm; display:block;" width="378" height="227" alt="Код для весов 10x6см" />`
                  : ''
            const imgRight =
               rightIdx < start + count && backImagesBase64[rightIdx]
                  ? `<img src="cid:tag_back_${rightIdx}" style="width:100mm; height:60mm; display:block;" width="378" height="227" alt="Код для весов 10x6см" />`
                  : ''

            rowsHtml += `
            <tr style="height:60mm;">
              <td style="width:100mm; height:60mm; padding:0; border:0; text-align:center; vertical-align:middle;">${imgLeft}</td>
              <td style="width:100mm; height:60mm; padding:0; border:0; text-align:center; vertical-align:middle;">${imgRight}</td>
            </tr>`
         }

         const isLast = b === numBatches - 1
         pagesHtml += `
         <div class="Section1" ${!isLast ? 'style="page-break-after:always;"' : ''}>
           <div style="font-size:10pt; color:#666; margin-bottom:2mm; text-align:center;">
             Лист ${b * 2 + 2} • Оборотная сторона (крупные коды для весов / PLU)
           </div>
           <table style="width:200mm; border-collapse:collapse; margin:0 auto; table-layout:fixed;" cellpadding="0" cellspacing="0">
             ${rowsHtml}
           </table>
         </div>`
      }
   }

   const docHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 210mm 297mm;
          margin: 8mm 5mm 5mm 5mm;
          mso-header-margin: 0mm;
          mso-footer-margin: 0mm;
          mso-paper-source: 0;
        }
        div.Section1 { page: Section1; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #ffffff; }
        table { border-collapse: collapse; }
      </style>
    </head>
    <body>
      ${pagesHtml}
    </body>
    </html>
  `

   // Формируем MHTML (MIME multipart/related), чтобы Word корректно отображал встроенные картинки
   const boundary = '----=_NextPart_TopFish_' + Math.floor(Math.random() * 1e9)
   let mimeParts = ''

   if (needFront) {
      frontImagesBase64.forEach((dataUri, i) => {
         const rawBase64 = dataUri.replace(/^data:image\/jpeg;base64,/, '')
         const wrapped = rawBase64.match(/.{1,76}/g)?.join('\r\n') || rawBase64
         mimeParts += `\r\n--${boundary}\r\n`
         mimeParts += `Content-Type: image/jpeg\r\n`
         mimeParts += `Content-Transfer-Encoding: base64\r\n`
         mimeParts += `Content-Location: tag_front_${i}\r\n`
         mimeParts += `Content-ID: <tag_front_${i}>\r\n\r\n`
         mimeParts += wrapped + '\r\n'
      })
   }

   if (needBack) {
      backImagesBase64.forEach((dataUri, i) => {
         const rawBase64 = dataUri.replace(/^data:image\/jpeg;base64,/, '')
         const wrapped = rawBase64.match(/.{1,76}/g)?.join('\r\n') || rawBase64
         mimeParts += `\r\n--${boundary}\r\n`
         mimeParts += `Content-Type: image/jpeg\r\n`
         mimeParts += `Content-Transfer-Encoding: base64\r\n`
         mimeParts += `Content-Location: tag_back_${i}\r\n`
         mimeParts += `Content-ID: <tag_back_${i}>\r\n\r\n`
         mimeParts += wrapped + '\r\n'
      })
   }

   const mhtml = [
      'MIME-Version: 1.0',
      `Content-Type: multipart/related; type="text/html"; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset="utf-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      docHtml,
      mimeParts,
      `--${boundary}--`,
      '',
   ].join('\r\n')

   return new Blob([mhtml], { type: 'application/msword;charset=utf-8' })
}

interface PriceTagsTabProps {
   catalogItems?: any[]
}

export default function PriceTagsTab({ catalogItems = [] }: PriceTagsTabProps) {
   const [currentTag, setCurrentTag] = useState<PriceTagItem>(DEFAULT_TAG)
   const [printQueue, setPrintQueue] = useState<PriceTagItem[]>([])
   const [isCopied, setIsCopied] = useState(false)
   const [isCatalogOpen, setIsCatalogOpen] = useState(false)
   const [catalogSearch, setCatalogSearch] = useState('')
   const [printLayoutMode, setPrintLayoutMode] = useState<'color' | 'eco'>(
      'color'
   )
   const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front')
   const [printSideMode, setPrintSideMode] = useState<
      'both' | 'front_only' | 'back_only'
   >('both')

   // Эффективный лейаут названия с оптическим вертикальным балансом
   const effectiveTitleLayout = useMemo(() => {
      return computeDynamicTitleLayout(currentTag.title, currentTag.description)
   }, [currentTag.title, currentTag.description])

   // Эффективный размер названия (px на базе 1024x614) - строго естественные пропорции (1:1)
   const effectiveTitleFontSize = useMemo(() => {
      return (
         currentTag.titleFontSize ||
         effectiveTitleLayout.fontSize
      )
   }, [currentTag.titleFontSize, effectiveTitleLayout.fontSize])

   const effectiveTitleTopPercent = useMemo(() => {
      return effectiveTitleLayout.dynamicTitleTopPercent
   }, [effectiveTitleLayout.dynamicTitleTopPercent])

   const effectivePriceTopPercent = useMemo(() => {
      return effectiveTitleLayout.dynamicPriceTopPercent
   }, [effectiveTitleLayout.dynamicPriceTopPercent])

   // Эффективный размер цены (px на базе 1024x614)
   const effectivePriceFontSize = useMemo(() => {
      return (
         currentTag.priceFontSize ||
         computeDynamicPriceFontSize(currentTag.price)
      )
   }, [currentTag.priceFontSize, currentTag.price])

   // Эффективный размер веса (px)
   const effectiveWeightFontSize = useMemo(() => {
      return currentTag.weightFontSize || TOPFISH_DEFAULTS.weightFontSize
   }, [currentTag.weightFontSize])

   // Скрытый Canvas для генерации и скачивания PNG
   const canvasRef = useRef<HTMLCanvasElement | null>(null)
   const previewCardRef = useRef<HTMLDivElement | null>(null)

   // Кешированные изображения для Canvas
   const loadedImagesRef = useRef<{ [url: string]: HTMLImageElement }>({})

   // Получить конфигурацию обработки
   const currentProcConfig = useMemo(() => {
      if (currentTag.processingType !== 'CUSTOM') {
         return PROCESSING_TYPES[currentTag.processingType]
      }
      return {
         code: 'CUSTOM' as any,
         label: 'Свой вид',
         badgeText: currentTag.customProcessingText || 'ТОП',
         colorStart: currentTag.customColorStart || '#2b81b0',
         colorEnd: currentTag.customColorEnd || '#a9e1ff',
         textureUrl: '/textures/xk.jpg',
         description: 'Пользовательский вид обработки',
      }
   }, [currentTag])

   // Вычисляем URL фоновой текстуры
   const activeTextureUrl = useMemo(() => {
      if (currentTag.textureMode === 'custom' && currentTag.customTextureUrl) {
         return currentTag.customTextureUrl
      }
      if (
         currentTag.textureMode === 'solid' ||
         currentTag.textureMode === 'solid_blue'
      ) {
         return ''
      }
      if (currentTag.textureMode === 'auto') {
         return currentProcConfig.textureUrl
      }
      return `/textures/${currentTag.textureMode}.jpg`
   }, [currentTag.textureMode, currentTag.customTextureUrl, currentProcConfig])

   // Проверка: является ли заголовок одним словом (для динамического размера)
   const isCurrentSingleWord = useMemo(() => {
      const cleanDesc = (currentTag.description || '').trim()
      const cleanTitle = (currentTag.title || '').trim()
      return !cleanDesc && !!cleanTitle && cleanTitle.split(/\s+/).length === 1
   }, [currentTag.title, currentTag.description])

   const cleanWeightText = useMemo(() => {
      return formatWeightText(currentTag.weight)
   }, [currentTag.weight])

   // Функция для отрисовки ценника на Canvas
   const drawTagToCanvas = async (
      tag: PriceTagItem,
      targetCanvas: HTMLCanvasElement,
      scale: number = 1,
      sideSafeMarginPx: number = 0
   ): Promise<void> => {
      const ctx = targetCanvas.getContext('2d')
      if (!ctx) return

      // Предзагрузка шрифта Onest перед отрисовкой
      if (typeof document !== 'undefined' && document.fonts) {
         try {
            await Promise.all([
               document.fonts.load('italic 700 80px "Onest"'),
               document.fonts.load('italic 700 240px "Onest"'),
               document.fonts.load('900 156px "Onest"'),
               document.fonts.load('900 250px "Onest"'),
               document.fonts.load('italic 300 24px "Onest"'),
               document.fonts.load('italic 300 36px "Onest"'),
               document.fonts.load('500 24px "Onest"'),
               document.fonts.load('900 82px "Onest"'),
            ])
         } catch (e) {}
      }

      const baseW = 1024
      const baseH = 614
      targetCanvas.width = baseW * scale
      targetCanvas.height = baseH * scale

      ctx.save()
      ctx.scale(scale, scale)

      // 1. Очистка и заливка темного фона по умолчанию (#171d41 - эталонный синий из референса)
      ctx.fillStyle = '#171d41'
      ctx.fillRect(0, 0, baseW, baseH)

      // 2. Отрисовка фоновой текстуры
      const textureUrl =
         tag.textureMode === 'custom' && tag.customTextureUrl
            ? tag.customTextureUrl
            : tag.textureMode === 'solid' || tag.textureMode === 'solid_blue'
              ? ''
              : tag.textureMode === 'auto'
                ? tag.processingType === 'CUSTOM'
                   ? '/textures/xk.jpg'
                   : PROCESSING_TYPES[tag.processingType].textureUrl
                : `/textures/${tag.textureMode}.jpg`

      if (textureUrl) {
         try {
            let img = loadedImagesRef.current[textureUrl]
            if (!img) {
               img = await new Promise<HTMLImageElement>((resolve, reject) => {
                  const i = new Image()
                  i.crossOrigin = 'anonymous'
                  i.onload = () => resolve(i)
                  i.onerror = () => reject()
                  i.src = textureUrl
               })
               loadedImagesRef.current[textureUrl] = img
            }
            ctx.drawImage(img, 0, 0, baseW, baseH)
         } catch (e) {
            ctx.fillStyle = '#171d41'
            ctx.fillRect(0, 0, baseW, baseH)
         }
      }

      // 3. Отрисовка шильдика "Вид обработки" в левом нижнем углу
      const proc =
         tag.processingType === 'CUSTOM'
            ? {
                 badgeText: tag.customProcessingText || 'ТОП',
                 colorStart: tag.customColorStart || '#2b81b0',
                 colorEnd: tag.customColorEnd || '#a9e1ff',
              }
            : PROCESSING_TYPES[tag.processingType]

      const badgeScale = (tag.badgeScale || TOPFISH_DEFAULTS.badgeScale) / 100
      const badgeH = Math.round(148 * badgeScale)
      const badgePaddingX = Math.round(46 * badgeScale)
      ctx.font = `900 ${Math.round(82 * badgeScale)}px "Onest", sans-serif`
      const textMetrics = ctx.measureText(proc.badgeText)
      const badgeW = Math.max(
         Math.round(260 * badgeScale),
         textMetrics.width + badgePaddingX * 2
      )
      const badgeTop = baseH - badgeH
      const radius = Math.round(42 * badgeScale)
      // Шильдик начинается ровно от x=0 (по линии реза); синий вылет 1.5 мм находится слева снаружи в PDF
      const badgeStartX = 0
      const badgeEndX = badgeW

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(badgeStartX, baseH)
      ctx.lineTo(badgeStartX, badgeTop)
      ctx.lineTo(badgeEndX - radius, badgeTop)
      ctx.arcTo(badgeEndX, badgeTop, badgeEndX, badgeTop + radius, radius)
      ctx.lineTo(badgeEndX, baseH)
      ctx.closePath()

      const grad = ctx.createLinearGradient(badgeStartX, 0, badgeEndX, 0)
      grad.addColorStop(0, proc.colorStart)
      grad.addColorStop(1, proc.colorEnd)
      ctx.fillStyle = grad
      ctx.fill()

      ctx.fillStyle = '#151b32'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
         proc.badgeText,
         badgeStartX + badgeW / 2 - 4,
         badgeTop + badgeH / 2 + 2
      )
      ctx.restore()

      // 4. Отрисовка фирменного логотипа ТопФиш в правом нижнем углу
      if (tag.showLogo) {
         try {
            const logoUrl = '/Logo%20price.png'
            let logoImg = loadedImagesRef.current[logoUrl]
            if (!logoImg) {
               logoImg = await new Promise<HTMLImageElement>(
                  (resolve, reject) => {
                     const i = new Image()
                     i.crossOrigin = 'anonymous'
                     i.onload = () => resolve(i)
                     i.onerror = () => reject()
                     i.src = logoUrl
                  }
               )
               loadedImagesRef.current[logoUrl] = logoImg
            }
            const logoScale =
               (tag.logoScale || TOPFISH_DEFAULTS.logoScale) / 100
            const logoW = Math.round(240 * logoScale)
            const logoH = Math.round((logoW * logoImg.height) / logoImg.width)
            ctx.drawImage(
               logoImg,
               baseW - logoW - 36 - sideSafeMarginPx,
               baseH - logoH - 28,
               logoW,
               logoH
            )
         } catch (e) {
            ctx.save()
            ctx.fillStyle = '#ffffff'
            ctx.font = 'bold 22px serif'
            ctx.textAlign = 'right'
            ctx.fillText('ТОПФИШ', baseW - 40 - sideSafeMarginPx, baseH - 45)
            ctx.font = '12px sans-serif'
            ctx.fillText(
               'КОПЧЕНАЯ РЫБА',
               baseW - 40 - sideSafeMarginPx,
               baseH - 28
            )
            ctx.restore()
         }
      }

      // 5. Отрисовка названия и описания (Сверху слева)
      // Требование 2: шрифт strictly Onest, тоньше заголовок (700 вместо 900),
      // если 1 слово - намного крупнее (динамический размер)
      ctx.save()
      const titleText = (tag.title || '').trim().toUpperCase()
      const descText = (tag.description || '').trim().toUpperCase()
      const titleLayout = computeDynamicTitleLayout(titleText, descText)

      let fontSize =
         tag.titleFontSize || titleLayout.fontSize

      const titleOffsetY =
         tag.titleOffsetY !== undefined
            ? tag.titleOffsetY
            : TOPFISH_DEFAULTS.titleOffsetY
      const titleOffsetX =
         tag.titleOffsetX !== undefined
            ? tag.titleOffsetX
            : TOPFISH_DEFAULTS.titleOffsetX
      const fontStyle = tag.isItalic ? 'italic ' : ''
      // Вес 700 (Bold) - более изящный и точный, строго Onest
      ctx.font = `${fontStyle}700 ${fontSize}px "Onest", sans-serif`
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'

      const startX = 48 + titleOffsetX
      let currentY = titleLayout.dynamicTitleY + titleOffsetY
      const lineHeight = fontSize * 1.08

      const lines = titleLayout.lines || []

      lines.forEach((lineTokens) => {
         let x = startX
         lineTokens.forEach((token) => {
            if (token.prefix) {
               ctx.fillText(token.prefix, x, currentY)
               x += ctx.measureText(token.prefix).width
            }
            if (token.text) {
               const w = ctx.measureText(token.text).width
               ctx.fillText(token.text, x, currentY)
               if (token.isDesc && tag.underlineDescription) {
                  ctx.save()
                  ctx.fillStyle = '#ffffff'
                  // Линия подчеркивания строго под базовой линией шрифта (вместо 1.05fontSize, улетавшего вниз)
                  const lineY = currentY + Math.round(fontSize * 0.86)
                  const lineThickness = Math.max(3, Math.round(fontSize * 0.052))
                  ctx.fillRect(x, lineY, w, lineThickness)
                  ctx.restore()
               }
               x += w
            }
            if (token.suffix) {
               ctx.fillText(token.suffix, x, currentY)
               x += ctx.measureText(token.suffix).width
            }
            x += ctx.measureText(' ').width
         })
         currentY += lineHeight
      })
      ctx.restore()

            // 6. Отрисовка ЦЕНЫ и ВЕСА
      // Требование 1: не должно сливаться Рубль (отдельный просчитанный зазор)
      // Требование 3: 100г. не в скобках, тоньше линия и шрифт
      ctx.save()
      const priceVal = (tag.price || '0').trim()
      const curr = (tag.currency || '₽').trim()

      let priceSize = tag.priceFontSize
      if (!priceSize) {
         priceSize = computeDynamicPriceFontSize(priceVal)
      }

      ctx.font = `900 ${priceSize}px "Onest", sans-serif`
      ctx.fillStyle = '#ffffff'
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'

      const numMetrics = ctx.measureText(priceVal)
      const numW = numMetrics.width

      // Гарантированный зазор между цифрами и символом ₽ (предотвращает наложение крестовины 4 и бара ₽)
      const currencyGap = Math.max(16, Math.round(priceSize * 0.12))
      const currMetrics = ctx.measureText(curr)
      const currW = currMetrics.width
      const fullPriceW = numW + currencyGap + currW

      // ВЕС: тонкий шрифт Onest italic 300, серенький, без скобок
      const cleanWeight = formatWeightText(tag.weight)
      const weightFontSize =
         tag.weightFontSize || TOPFISH_DEFAULTS.weightFontSize
      let weightPillW = 0
      if (cleanWeight) {
         ctx.save()
         ctx.font = `italic 300 ${weightFontSize}px "Onest", sans-serif`
         const wMetrics = ctx.measureText(cleanWeight)
         weightPillW = wMetrics.width + Math.round(weightFontSize * 1.05) // горизонтальные отступы
         ctx.restore()
      }

      const totalGroupW = fullPriceW + (cleanWeight ? weightPillW + 18 : 0)
      // Прижатие цены с весом к правому краю (с безопасным отступом при экспорте для резки)
      const rightMargin = (cleanWeight ? 14 : 36) + sideSafeMarginPx
      const baseGroupStartX = Math.max(20, baseW - totalGroupW - rightMargin)
      const priceOffsetX =
         tag.priceOffsetX !== undefined
            ? tag.priceOffsetX
            : TOPFISH_DEFAULTS.priceOffsetX
      const priceOffsetY =
         tag.priceOffsetY !== undefined
            ? tag.priceOffsetY
            : TOPFISH_DEFAULTS.priceOffsetY
      const groupStartX = baseGroupStartX + priceOffsetX
      const basePriceY = titleLayout.dynamicPriceY || 340
      let priceY = basePriceY + priceOffsetY

      // Гарантированная защита от наложения цены на плашку обработки (Х/К, Г/К, С/С, ВЯЛ):
      // Полувысота цифр цены от центра (middle) вниз составляет ~0.38 * priceSize
      const priceHalfH = Math.round(priceSize * 0.38)
      if (groupStartX < badgeEndX + 24) {
         // Если группа цены по горизонтали заходит в зону плашки, удерживаем цену строго выше плашки
         const maxSafePriceY = badgeTop - 14 - priceHalfH
         if (priceY > maxSafePriceY) {
            priceY = maxSafePriceY
         }
      }

      // Отрисовка цифр
      ctx.fillText(priceVal, groupStartX, priceY)

      // Отрисовка символа валюты с четким отступом
      ctx.fillText(curr, groupStartX + numW + currencyGap, priceY)

      // 7. Отрисовка ВЕСА (справа от цены сверху - тонкая серенькая капсула)
      if (cleanWeight) {
         const weightOffsetX =
            tag.weightOffsetX !== undefined
               ? tag.weightOffsetX
               : TOPFISH_DEFAULTS.weightOffsetX
         const weightOffsetY =
            tag.weightOffsetY !== undefined
               ? tag.weightOffsetY
               : TOPFISH_DEFAULTS.weightOffsetY
         const weightBrightness =
            tag.weightBrightness !== undefined
               ? tag.weightBrightness
               : TOPFISH_DEFAULTS.weightBrightness
         const weightX = groupStartX + fullPriceW + 16 + weightOffsetX
         const weightY = priceY - priceSize * 0.28 + weightOffsetY

         const weightStyles = getWeightColors(weightBrightness, false)

         ctx.save()
         ctx.font = `italic ${weightStyles.fontWeight} ${weightFontSize}px "Onest", sans-serif`
         ctx.fillStyle = weightStyles.color
         ctx.textAlign = 'center'
         ctx.textBaseline = 'middle'

         const pillH = Math.round(weightFontSize * 1.45)
         const pillRadius = Math.round(pillH / 2)

         // Тонкая рамка
         ctx.beginPath()
         ctx.strokeStyle = weightStyles.borderColor
         ctx.lineWidth = (tag.weightBrightness ?? 90) >= 80 ? 1.5 : 1
         if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(
               weightX,
               weightY - pillH / 2,
               weightPillW,
               pillH,
               pillRadius
            )
         } else {
            ctx.rect(weightX, weightY - pillH / 2, weightPillW, pillH)
         }
         ctx.stroke()

         // Текст без скобок
         ctx.fillText(cleanWeight, weightX + weightPillW / 2, weightY + 1)
         ctx.restore()
      }

      ctx.restore()
      ctx.restore() // scale pop
   }

   // Перерисовка Canvas при изменении параметров
   useEffect(() => {
      if (canvasRef.current) {
         if (previewSide === 'back') {
            drawTagBackToCanvas(currentTag, canvasRef.current, 1)
         } else {
            drawTagToCanvas(currentTag, canvasRef.current, 1)
         }
      }
   }, [currentTag, currentProcConfig, activeTextureUrl, previewSide])

   // Быстрое скачивание PNG
   const handleDownloadPNG = async (scale: number = 1) => {
      try {
         const offCanvas = document.createElement('canvas')
         if (previewSide === 'back') {
            await drawTagBackToCanvas(currentTag, offCanvas, scale)
         } else {
            await drawTagToCanvas(currentTag, offCanvas, scale)
         }
         const dataUrl = offCanvas.toDataURL('image/png')
         const link = document.createElement('a')
         const safeTitle = (currentTag.title || 'Ценник').replace(
            /[^a-zA-Zа-яА-Я0-9_-]/g,
            '_'
         )
         const safeType = currentTag.processingType
         const sideSuffix = previewSide === 'back' ? '_ОБОРОТ_КОД' : ''
         const resSuffix = scale > 1 ? '_HD' : ''
         link.download = `Ценник_${safeTitle}_${safeType}${sideSuffix}${resSuffix}.png`
         link.href = dataUrl
         link.click()
         toast.success(
            scale > 1
               ? `Ценник (${previewSide === 'back' ? 'оборот с кодом' : 'лицевая'}) скачан в Ultra HD (2048×1228)!`
               : `Ценник (${previewSide === 'back' ? 'оборот с кодом' : 'лицевая'}) скачан (1024×614)!`
         )
      } catch (e) {
         console.error(e)
         toast.error('Ошибка при генерации изображения')
      }
   }

   // Копирование картинки в буфер обмена
   const handleCopyImage = async () => {
      try {
         const offCanvas = document.createElement('canvas')
         if (previewSide === 'back') {
            await drawTagBackToCanvas(currentTag, offCanvas, 1)
         } else {
            await drawTagToCanvas(currentTag, offCanvas, 1)
         }
         offCanvas.toBlob(async (blob) => {
            if (!blob) return
            try {
               await navigator.clipboard.write([
                  new ClipboardItem({ 'image/png': blob }),
               ])
               setIsCopied(true)
               toast.success(
                  previewSide === 'back'
                     ? 'Оборотная сторона с кодом скопирована!'
                     : 'Изображение ценника скопировано!'
               )
               setTimeout(() => setIsCopied(false), 2000)
            } catch (err) {
               toast.error(
                  'Ваш браузер заблокировал копирование картинки. Используйте Скачать PNG.'
               )
            }
         }, 'image/png')
      } catch (e) {
         toast.error('Не удалось скопировать изображение')
      }
   }

   // Экспорт в PDF со строгим физическим размером 10см х 6см (сетка на листах А4)
   const handleExportPDF = async (tagsToExport?: PriceTagItem[]) => {
      const targetTags =
         tagsToExport && tagsToExport.length > 0
            ? tagsToExport
            : printQueue.length > 0
              ? printQueue
              : [currentTag]

      const toastId = toast.loading(
         `Формирование PDF (${targetTags.length} ценн., режим: ${
            printSideMode === 'both'
               ? '2-сторонний'
               : printSideMode === 'back_only'
                 ? 'только коды'
                 : 'только лицо'
         })...`
      )
      try {
         const blob = await generatePriceTagsPdf(
            targetTags,
            drawTagToCanvas,
            drawTagBackToCanvas,
            printSideMode
         )
         const url = URL.createObjectURL(blob)
         const a = document.createElement('a')
         a.href = url
         a.download = `TopFish_Ценники_10x6см_${new Date().toISOString().slice(0, 10)}.pdf`
         document.body.appendChild(a)
         a.click()
         document.body.removeChild(a)
         URL.revokeObjectURL(url)
         toast.dismiss(toastId)
         toast.success(
            printSideMode === 'both'
               ? 'PDF скачан! (2-сторонняя печать: лицо + зеркальный оборот с кодами весов)'
               : printSideMode === 'back_only'
                 ? 'PDF скачан! (Только оборотные коды для весов)'
                 : 'PDF скачан! (Строгий размер: 10×6 см, 8 шт на А4)'
         )
      } catch (err) {
         console.error(err)
         toast.dismiss(toastId)
         toast.error('Не удалось создать PDF документ')
      }
   }

   // Экспорт в документ Word (.doc) со строгим размером 10см х 6см
   const handleExportWord = async (tagsToExport?: PriceTagItem[]) => {
      const targetTags =
         tagsToExport && tagsToExport.length > 0
            ? tagsToExport
            : printQueue.length > 0
              ? printQueue
              : [currentTag]

      const toastId = toast.loading(
         `Формирование Word (${targetTags.length} ценн., режим: ${
            printSideMode === 'both'
               ? '2-сторонний'
               : printSideMode === 'back_only'
                 ? 'только коды'
                 : 'только лицо'
         })...`
      )
      try {
         const blob = await generatePriceTagsWord(
            targetTags,
            drawTagToCanvas,
            drawTagBackToCanvas,
            printSideMode
         )
         const url = URL.createObjectURL(blob)
         const a = document.createElement('a')
         a.href = url
         a.download = `TopFish_Ценники_10x6см_${new Date().toISOString().slice(0, 10)}.doc`
         document.body.appendChild(a)
         a.click()
         document.body.removeChild(a)
         URL.revokeObjectURL(url)
         toast.dismiss(toastId)
         toast.success(
            printSideMode === 'both'
               ? 'Word скачан! (2-сторонняя печать: лицо + зеркальный оборот с кодами)'
               : printSideMode === 'back_only'
                 ? 'Word скачан! (Только оборотные коды для весов)'
                 : 'Word скачан! (Размер 10×6 см для проверки и печати)'
         )
      } catch (err) {
         console.error(err)
         toast.dismiss(toastId)
         toast.error('Не удалось создать документ Word')
      }
   }

   // Добавление текущего ценника в очередь печати
   const handleAddToQueue = () => {
      const newItem: PriceTagItem = {
         ...currentTag,
         id: `tag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      }
      setPrintQueue((prev) => [...prev, newItem])
      toast.success(
         `Ценник «${currentTag.title}» добавлен в очередь на печать!`
      )
   }

   // Удаление ценника из очереди
   const handleRemoveFromQueue = (id: string) => {
      setPrintQueue((prev) => prev.filter((t) => t.id !== id))
   }

   // Загрузка ценника из очереди в редактор
   const handleLoadFromQueue = (tag: PriceTagItem) => {
      setCurrentTag({ ...tag })
      toast.success(`Ценник «${tag.title}» загружен в редактор`)
   }

   // Печать текущего ценника
   const handlePrintSingle = () => {
      window.print()
   }

   // Загрузка своего фона
   const handleUploadCustomTexture = (
      e: React.ChangeEvent<HTMLInputElement>
   ) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (!file.type.startsWith('image/')) {
         toast.error('Пожалуйста, выберите файл изображения')
         return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
         const dataUrl = event.target?.result as string
         setCurrentTag((prev) => ({
            ...prev,
            textureMode: 'custom',
            customTextureUrl: dataUrl,
         }))
         toast.success('Пользовательский фон успешно загружен!')
      }
      reader.readAsDataURL(file)
   }

   // Умный парсер названия товара
   const parseProductText = (rawName: string) => {
      let text = rawName.trim()
      let procType: 'XK' | 'GK' | 'SS' | 'VYAL' = 'XK'

      const lower = text.toLowerCase()
      if (
         lower.includes('г/к') ||
         lower.includes('г.к.') ||
         lower.includes('горяч')
      ) {
         procType = 'GK'
      } else if (
         lower.includes('с/с') ||
         lower.includes('слабосол') ||
         lower.includes('солен')
      ) {
         procType = 'SS'
      } else if (lower.includes('вял') || lower.includes('вялен')) {
         procType = 'VYAL'
      } else {
         procType = 'XK'
      }

      text = text
         .replace(
            /(?:^|\s)(?:х\/к|х\.к\.|г\/к|г\.к\.|с\/с|с\.с\.|вял\.?|вяленая|вяленый)(?:$|\s)/gi,
            ' '
         )
         .trim()

      let title = text
      let description = ''

      const parenMatch = text.match(/\((.*?)\)/)
      if (parenMatch) {
         description = parenMatch[1].trim()
         title = text.replace(/\(.*?\)/, '').trim()
      } else {
         const subMatch = text.match(
            /(?:б\/г|с\/г|без головы|кусок|пласт|филе|нарезка|ломтики|тушка)/i
         )
         if (subMatch && subMatch.index && subMatch.index > 0) {
            title = text.substring(0, subMatch.index).trim()
            description = text.substring(subMatch.index).trim()
         }
      }

      return {
         title: title.toUpperCase(),
         description: description.toUpperCase(),
         procType,
      }
   }

   const handleSelectCatalogItem = (item: any) => {
      const parsed = parseProductText(item.productName || '')
      const code =
         item.productCode ||
         item.code ||
         item.plu ||
         item.sku ||
         item.article ||
         (item.id ? String(item.id) : '')
      setCurrentTag((prev) => ({
         ...prev,
         title: parsed.title,
         description: parsed.description,
         price: item.price ? String(Math.round(item.price)) : prev.price,
         processingType: parsed.procType,
         textureMode: 'auto',
         productCode: code || prev.productCode || '',
      }))
      setIsCatalogOpen(false)
      toast.success(`Выбран товар: ${parsed.title}`)
   }

   const filteredCatalogItems = useMemo(() => {
      if (!catalogItems) return []
      if (!catalogSearch.trim()) return catalogItems.slice(0, 50)
      const q = catalogSearch.toLowerCase()
      return catalogItems.filter(
         (i) => i.productName && i.productName.toLowerCase().includes(q)
      )
   }, [catalogItems, catalogSearch])

   return (
      <div className='space-y-6'>
         {/* Скрытый Canvas для генерации PNG */}
         <canvas ref={canvasRef} className='hidden' />

         {/* Основной экранный интерфейс (скрывается при физической печати) */}
         <div className='space-y-6 print:hidden print-screen-content'>
            {/* Верхний заголовок и панель быстрых действий */}
            <div className='bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
               <div className='flex items-center gap-4'>
                  <div className='w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/20 shrink-0'>
                     <Tag className='w-6 h-6' />
                  </div>
                  <div>
                     <div className='flex items-center gap-2'>
                        <h2 className='text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans'>
                           Генератор ценников
                        </h2>
                        <span className='px-2.5 py-0.5 rounded-full text-xs font-black bg-teal-100 text-teal-800'>
                           10 см ширина × 6 см высота
                        </span>
                     </div>
                     <p className='text-xs sm:text-sm text-slate-500 mt-0.5'>
                        Фирменные ценники ТопФиш (строгий размер 10 × 6 см,
                        шрифт Onest, HD-экспорт и печать на А4)
                     </p>
                  </div>
               </div>

               {/* Кнопки экспорта и печати */}
               <div className='flex flex-wrap items-center gap-2.5'>
                  {catalogItems.length > 0 && (
                     <button
                        type='button'
                        onClick={() => setIsCatalogOpen(true)}
                        className='px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer'
                     >
                        <Search className='w-4 h-4 text-slate-500' />
                        <span>Выбрать из прайса ({catalogItems.length})</span>
                     </button>
                  )}

                  <button
                     type='button'
                     onClick={handleAddToQueue}
                     className='px-3.5 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer'
                  >
                     <Plus className='w-4 h-4 text-teal-600' />
                     <span>В очередь на печать</span>
                     {printQueue.length > 0 && (
                        <span className='px-1.5 py-0.5 rounded-full bg-teal-600 text-white text-[10px]'>
                           {printQueue.length}
                        </span>
                     )}
                  </button>

                  <div className='flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs shadow-2xs'>
                     <FlipHorizontal className='w-4 h-4 text-teal-700 shrink-0' />
                     <span className='font-bold text-slate-700 hidden sm:inline'>
                        Печать:
                     </span>
                     <select
                        value={printSideMode}
                        onChange={(e) =>
                           setPrintSideMode(e.target.value as any)
                        }
                        className='bg-white font-bold text-slate-800 text-xs px-2.5 py-1 rounded-lg border border-slate-300 focus:outline-teal-500 cursor-pointer'
                        title='Режим печати (лицевая сторона и/или оборотная с крупными кодами для весов)'
                     >
                        <option value='both'>Лицо + Оборот (коды весов)</option>
                        <option value='front_only'>
                           Только лицо (1-сторонняя)
                        </option>
                        <option value='back_only'>
                           Только коды весов (оборот)
                        </option>
                     </select>
                  </div>

                  <button
                     type='button'
                     onClick={() => handleDownloadPNG(1)}
                     className='px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-xs cursor-pointer'
                  >
                     <Download className='w-4 h-4 text-teal-400' />
                     <span>Скачать PNG</span>
                  </button>

                  <button
                     type='button'
                     onClick={() => handleExportPDF()}
                     className='px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-xs cursor-pointer'
                     title='Скачать PDF файл со строгим размером ценников 10x6 см на листе А4'
                  >
                     <FileText className='w-4 h-4' />
                     <span>PDF (10×6 см)</span>
                  </button>

                  <button
                     type='button'
                     onClick={() => handleExportWord()}
                     className='px-3.5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-xs cursor-pointer'
                     title='Скачать документ Word (.doc) со строгим размером ценников 10x6 см'
                  >
                     <FileDown className='w-4 h-4' />
                     <span>Word (.doc)</span>
                  </button>

                  <button
                     type='button'
                     onClick={handlePrintSingle}
                     className='px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-md shadow-teal-600/20 cursor-pointer'
                  >
                     <Printer className='w-4 h-4' />
                     <span>Печать</span>
                  </button>
               </div>
            </div>

            {/* Готовые пресеты образцов из референсов */}
            <div className='bg-slate-50/80 rounded-2xl p-4 border border-slate-200/60'>
               <div className='flex items-center gap-2 mb-2.5'>
                  <Sparkles className='w-4 h-4 text-amber-500' />
                  <span className='text-xs font-bold text-slate-700 uppercase tracking-wider'>
                     Образцы ценников (соответствие вашим референсам):
                  </span>
               </div>
               <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5'>
                  {SAMPLE_PRESETS.map((preset, idx) => (
                     <button
                        key={idx}
                        type='button'
                        onClick={() => {
                           setCurrentTag({ ...preset.tag, id: 'current' })
                           toast.success(`Загружен пресет: ${preset.name}`)
                        }}
                        className='px-3 py-2 rounded-xl bg-white hover:bg-slate-100/80 border border-slate-200 text-left transition shadow-2xs hover:border-teal-400 group cursor-pointer'
                     >
                        <div className='flex items-center justify-between text-xs font-bold text-slate-800 group-hover:text-teal-700'>
                           <span className='truncate'>
                              {preset.tag.title}{' '}
                              {preset.tag.description
                                 ? `(${preset.tag.description})`
                                 : ''}
                           </span>
                           <span className='shrink-0 text-slate-400 group-hover:text-teal-600 ml-1'>
                              {preset.tag.price}₽
                           </span>
                        </div>
                        <div className='flex items-center gap-1.5 mt-1 text-[11px] text-slate-500'>
                           <span
                              className='w-2 h-2 rounded-full'
                              style={{
                                 backgroundColor:
                                    preset.tag.processingType === 'CUSTOM'
                                       ? '#2b81b0'
                                       : PROCESSING_TYPES[
                                            preset.tag.processingType
                                         ].colorStart,
                              }}
                           />
                           <span>Вид: {preset.tag.processingType}</span>
                           {preset.tag.weight && (
                              <span className='text-slate-400'>
                                 • {formatWeightText(preset.tag.weight)}
                              </span>
                           )}
                        </div>
                     </button>
                  ))}
               </div>
            </div>

            {/* Основная сетка: Редактор параметров слева + Интерактивный Live Preview справа */}
            <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
               {/* ЛЕВАЯ КОЛОНКА: Панель параметров (5 колонок) */}
               <div className='lg:col-span-5 space-y-5'>
                  <div className='bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5'>
                     <div className='flex items-center justify-between border-b border-slate-100 pb-3'>
                        <h3 className='font-extrabold text-slate-900 text-base flex items-center gap-2'>
                           <Sliders className='w-4 h-4 text-teal-600' />
                           <span>Параметры ценника</span>
                        </h3>
                        <button
                           type='button'
                           onClick={() => setCurrentTag(DEFAULT_TAG)}
                           className='text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer'
                        >
                           <RefreshCw className='w-3.5 h-3.5' />
                           <span>Сбросить</span>
                        </button>
                     </div>

                     {/* НАЗВАНИЕ ТОВАРА */}
                     <div>
                        <div className='flex items-center justify-between mb-1.5'>
                           <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider'>
                              НАЗВАНИЕ (ОСНОВНОЕ):
                           </label>
                           {isCurrentSingleWord && (
                              <span className='text-[11px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md'>
                                 ⚡ 1 слово: авто-укрупнение (как в референсе)
                              </span>
                           )}
                        </div>
                        <input
                           type='text'
                           value={currentTag.title}
                           onChange={(e) =>
                              setCurrentTag((prev) => ({
                                 ...prev,
                                 title: e.target.value.toUpperCase(),
                              }))
                           }
                           placeholder='СИГ, СКУМБРИЯ, ТЕРПУГ, КОЛБАСА'
                           className='w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition'
                           style={{ fontFamily: '"Onest", sans-serif' }}
                        />
                     </div>

                     {/* ОПИСАНИЕ (В СКОБКАХ) */}
                     <div>
                        <div className='flex items-center justify-between mb-1.5'>
                           <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider'>
                              ОПИСАНИЕ (БУДЕТ В СКОБКАХ):
                           </label>
                           <label className='flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer'>
                              <input
                                 type='checkbox'
                                 checked={currentTag.underlineDescription}
                                 onChange={(e) =>
                                    setCurrentTag((prev) => ({
                                       ...prev,
                                       underlineDescription: e.target.checked,
                                    }))
                                 }
                                 className='rounded text-teal-600 focus:ring-teal-500'
                              />
                              <span>Подчеркивать текст</span>
                           </label>
                        </div>
                        <input
                           type='text'
                           value={currentTag.description}
                           onChange={(e) =>
                              setCurrentTag((prev) => ({
                                 ...prev,
                                 description: e.target.value.toUpperCase(),
                              }))
                           }
                           placeholder='БЕЗ ГОЛОВЫ / ФОРЕЛЬ, ТУНЕЦ, МАСЛЯНАЯ'
                           className='w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition'
                           style={{ fontFamily: '"Onest", sans-serif' }}
                        />
                        <span className='text-[11px] text-slate-400 mt-1 block'>
                           Автоматически заключается в скобки, подчеркиваются
                           только слова внутри
                        </span>
                     </div>

                     {/* ВИД ОБРАБОТКИ (Х/К, Г/К, С/С, ВЯЛ) */}
                     <div>
                        <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2'>
                           ВИД ОБРАБОТКИ:
                        </label>
                        <div className='grid grid-cols-2 gap-2.5'>
                           {(['XK', 'GK', 'SS', 'VYAL'] as const).map(
                              (code) => {
                                 const item = PROCESSING_TYPES[code]
                                 const isSelected =
                                    currentTag.processingType === code
                                 return (
                                    <button
                                       key={code}
                                       type='button'
                                       onClick={() =>
                                          setCurrentTag((prev) => ({
                                             ...prev,
                                             processingType: code,
                                          }))
                                       }
                                       className={`p-3 rounded-2xl border text-left transition relative overflow-hidden group cursor-pointer ${
                                          isSelected
                                             ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                                             : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                                       }`}
                                    >
                                       <div className='flex items-center justify-between'>
                                          <span
                                             className='font-black text-sm'
                                             style={{
                                                fontFamily:
                                                   '"Onest", sans-serif',
                                             }}
                                          >
                                             {item.badgeText}
                                          </span>
                                          {isSelected && (
                                             <Check className='w-4 h-4 text-teal-400' />
                                          )}
                                       </div>

                                       <div
                                          className='h-2 rounded-full mt-2 w-full'
                                          style={{
                                             background: `linear-gradient(to right, ${item.colorStart}, ${item.colorEnd})`,
                                          }}
                                       />
                                       <span
                                          className={`text-[10px] mt-1.5 block ${
                                             isSelected
                                                ? 'text-slate-300'
                                                : 'text-slate-500'
                                          }`}
                                       >
                                          {item.label.split(' ')[1]}
                                       </span>
                                    </button>
                                 )
                              }
                           )}
                        </div>

                        <div className='mt-2 text-right'>
                           <button
                              type='button'
                              onClick={() =>
                                 setCurrentTag((prev) => ({
                                    ...prev,
                                    processingType:
                                       prev.processingType === 'CUSTOM'
                                          ? 'XK'
                                          : 'CUSTOM',
                                    customProcessingText:
                                       prev.customProcessingText || 'СВЕЖ',
                                 }))
                              }
                              className='text-[11px] font-bold text-teal-700 hover:text-teal-800 underline cursor-pointer'
                           >
                              {currentTag.processingType === 'CUSTOM'
                                 ? '← Стандартные виды'
                                 : '+ Свой вид обработки'}
                           </button>
                        </div>

                        {currentTag.processingType === 'CUSTOM' && (
                           <div className='mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5'>
                              <div>
                                 <label className='block text-[11px] font-bold text-slate-600 mb-1'>
                                    Текст шильдика:
                                 </label>
                                 <input
                                    type='text'
                                    value={
                                       currentTag.customProcessingText || ''
                                    }
                                    onChange={(e) =>
                                       setCurrentTag((prev) => ({
                                          ...prev,
                                          customProcessingText:
                                             e.target.value.toUpperCase(),
                                       }))
                                    }
                                    placeholder='СВЕЖ / АКЦИЯ / ФИЛЕ'
                                    className='w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold'
                                 />
                              </div>
                              <div className='grid grid-cols-2 gap-2'>
                                 <div>
                                    <label className='block text-[10px] text-slate-500 mb-0.5'>
                                       Цвет начала:
                                    </label>
                                    <input
                                       type='color'
                                       value={
                                          currentTag.customColorStart ||
                                          '#2b81b0'
                                       }
                                       onChange={(e) =>
                                          setCurrentTag((prev) => ({
                                             ...prev,
                                             customColorStart: e.target.value,
                                          }))
                                       }
                                       className='w-full h-8 rounded border border-slate-300 cursor-pointer'
                                    />
                                 </div>
                                 <div>
                                    <label className='block text-[10px] text-slate-500 mb-0.5'>
                                       Цвет конца:
                                    </label>
                                    <input
                                       type='color'
                                       value={
                                          currentTag.customColorEnd || '#a9e1ff'
                                       }
                                       onChange={(e) =>
                                          setCurrentTag((prev) => ({
                                             ...prev,
                                             customColorEnd: e.target.value,
                                          }))
                                       }
                                       className='w-full h-8 rounded border border-slate-300 cursor-pointer'
                                    />
                                 </div>
                              </div>
                           </div>
                        )}
                     </div>

                     {/* ЦЕНА ЗА ВЕС И ВЕС */}
                     <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
                        <div>
                           <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5'>
                              ЦЕНА:
                           </label>
                           <div className='relative'>
                              <input
                                 type='text'
                                 value={currentTag.price}
                                 onChange={(e) =>
                                    setCurrentTag((prev) => ({
                                       ...prev,
                                       price: e.target.value,
                                    }))
                                 }
                                 placeholder='3333'
                                 className='w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-black text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition'
                                 style={{ fontFamily: '"Onest", sans-serif' }}
                              />
                              <span
                                 className='absolute right-3 top-2.5 text-base font-black text-slate-400'
                                 style={{ fontFamily: '"Onest", sans-serif' }}
                              >
                                 {currentTag.currency}
                              </span>
                           </div>
                        </div>

                        <div>
                           <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5'>
                              ВЕС:
                           </label>
                           <input
                              type='text'
                              value={currentTag.weight}
                              onChange={(e) =>
                                 setCurrentTag((prev) => ({
                                    ...prev,
                                    weight: e.target.value,
                                 }))
                              }
                              placeholder='100г., 150г, 1кг'
                              className='w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition'
                              style={{ fontFamily: '"Onest", sans-serif' }}
                           />
                           <span className='text-[10px] text-slate-400 mt-1 block'>
                              Отображается справа от цены в тонкой овальной
                              рамке (без скобок)
                           </span>
                        </div>
                     </div>

                     {/* Быстрые кнопки веса */}
                     <div>
                        <div className='flex flex-wrap items-center gap-1.5'>
                           <span className='text-[11px] text-slate-400 mr-1'>
                              Быстрый вес:
                           </span>
                           {[
                              '100г',
                              '150г',
                              '200г',
                              '250г',
                              '500г',
                              '1 кг',
                              '1 шт',
                           ].map((w) => (
                              <button
                                 key={w}
                                 type='button'
                                 onClick={() =>
                                    setCurrentTag((prev) => ({
                                       ...prev,
                                       weight: w,
                                    }))
                                 }
                                 className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                                    formatWeightText(currentTag.weight) ===
                                    formatWeightText(w)
                                       ? 'bg-teal-600 text-white'
                                       : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                 }`}
                              >
                                 {w}
                              </button>
                           ))}
                           {currentTag.weight && (
                              <button
                                 type='button'
                                 onClick={() =>
                                    setCurrentTag((prev) => ({
                                       ...prev,
                                       weight: '',
                                    }))
                                 }
                                 className='px-2 py-0.5 rounded-md text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer'
                              >
                                 Без веса
                              </button>
                           )}
                        </div>
                     </div>

                     {/* КОД ТОВАРА ДЛЯ ВЕСОВ (ОБОРОТ ЦЕННИКА) */}
                     <div className='pt-2 border-t border-slate-100'>
                        <div className='flex items-center justify-between mb-1.5'>
                           <label className='text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5'>
                              <Hash className='w-3.5 h-3.5 text-teal-600' />
                              <span>Код для весов (PLU):</span>
                           </label>
                           <span className='text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200'>
                              Оборот ценника
                           </span>
                        </div>
                        <div className='relative'>
                           <input
                              type='text'
                              value={currentTag.productCode || ''}
                              onChange={(e) =>
                                 setCurrentTag((prev) => ({
                                    ...prev,
                                    productCode: e.target.value,
                                 }))
                              }
                              placeholder='Например: 1154'
                              className='w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-black text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition'
                              style={{ fontFamily: '"Onest", sans-serif' }}
                           />
                        </div>
                        <span className='text-[10px] text-slate-400 mt-1 block'>
                           Печатается крупными цифрами на оборотной стороне
                           ценника (для ввода на весах при взвешивании)
                        </span>
                     </div>

                     {/* НАСТРОЙКИ ФОНА И ТЕКСТУРЫ */}
                     <div className='pt-2 border-t border-slate-100'>
                        <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2'>
                           ФОН КАРТОЧКИ:
                        </label>
                        <div className='grid grid-cols-3 gap-2'>
                           <button
                              type='button'
                              onClick={() =>
                                 setCurrentTag((prev) => ({
                                    ...prev,
                                    textureMode: 'solid_blue',
                                 }))
                              }
                              className={`p-2 rounded-xl border text-center transition cursor-pointer text-xs font-bold ${
                                 currentTag.textureMode === 'solid_blue'
                                    ? 'border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-500/20'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                              }`}
                           >
                              🔷 Просто синий
                           </button>
                           <button
                              type='button'
                              onClick={() =>
                                 setCurrentTag((prev) => ({
                                    ...prev,
                                    textureMode: 'auto',
                                 }))
                              }
                              className={`p-2 rounded-xl border text-center transition cursor-pointer text-xs font-bold ${
                                 currentTag.textureMode === 'auto'
                                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                              }`}
                           >
                              ⚡ Авто-текстура
                           </button>
                           <button
                              type='button'
                              onClick={() =>
                                 setCurrentTag((prev) => ({
                                    ...prev,
                                    textureMode: 'xk',
                                 }))
                              }
                              className={`p-2 rounded-xl border text-center transition cursor-pointer text-xs font-bold ${
                                 currentTag.textureMode === 'xk'
                                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                              }`}
                           >
                              ХК (волны)
                           </button>
                           <button
                              type='button'
                              onClick={() =>
                                 setCurrentTag((prev) => ({
                                    ...prev,
                                    textureMode: 'gk',
                                 }))
                              }
                              className={`p-2 rounded-xl border text-center transition cursor-pointer text-xs font-bold ${
                                 currentTag.textureMode === 'gk'
                                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                              }`}
                           >
                              ГК (дым)
                           </button>
                           <button
                              type='button'
                              onClick={() =>
                                 setCurrentTag((prev) => ({
                                    ...prev,
                                    textureMode: 'ss',
                                 }))
                              }
                              className={`p-2 rounded-xl border text-center transition cursor-pointer text-xs font-bold ${
                                 currentTag.textureMode === 'ss'
                                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                              }`}
                           >
                              СС (чешуя)
                           </button>
                           <button
                              type='button'
                              onClick={() =>
                                 setCurrentTag((prev) => ({
                                    ...prev,
                                    textureMode: 'vyal',
                                 }))
                              }
                              className={`p-2 rounded-xl border text-center transition cursor-pointer text-xs font-bold ${
                                 currentTag.textureMode === 'vyal'
                                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                              }`}
                           >
                              ВЯЛ (минерал)
                           </button>
                           <label className='col-span-3 p-2 rounded-xl border border-dashed border-slate-300 hover:border-teal-500 bg-white hover:bg-teal-50 text-center transition cursor-pointer text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5'>
                              <Upload className='w-3.5 h-3.5 text-teal-600' />
                              <span>Загрузить свой фон с компьютера</span>
                              <input
                                 type='file'
                                 accept='image/*'
                                 onChange={handleUploadCustomTexture}
                                 className='hidden'
                              />
                           </label>
                        </div>
                     </div>

                     {/* ДОПОЛНИТЕЛЬНЫЕ ПЕРЕКЛЮЧАТЕЛИ */}
                     <div className='pt-2 border-t border-slate-100 space-y-2'>
                        <label className='flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer'>
                           <span>Курсив для названия (как на образцах)</span>
                           <input
                              type='checkbox'
                              checked={currentTag.isItalic}
                              onChange={(e) =>
                                 setCurrentTag((prev) => ({
                                    ...prev,
                                    isItalic: e.target.checked,
                                 }))
                              }
                              className='rounded text-teal-600 focus:ring-teal-500 w-4 h-4'
                           />
                        </label>

                        <label className='flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer'>
                           <span>Отображать логотип «ТопФиш»</span>
                           <input
                              type='checkbox'
                              checked={currentTag.showLogo}
                              onChange={(e) =>
                                 setCurrentTag((prev) => ({
                                    ...prev,
                                    showLogo: e.target.checked,
                                 }))
                              }
                              className='rounded text-teal-600 focus:ring-teal-500 w-4 h-4'
                           />
                        </label>
                     </div>
                  </div>
               </div>

               {/* ПРАВАЯ КОЛОНКА: Интерактивный Live Preview ценника (7 колонок) */}
               <div className='lg:col-span-7 space-y-5'>
                  <div className='bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4'>
                     <div className='flex items-center justify-between border-b border-slate-100 pb-3'>
                        <div className='flex items-center gap-2'>
                           <Eye className='w-4 h-4 text-teal-600' />
                           <h3 className='font-extrabold text-slate-900 text-base'>
                              Живой предпросмотр (Шрифт ONEST)
                           </h3>
                        </div>
                        <div className='flex items-center gap-2'>
                           <div className='inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200'>
                              <button
                                 type='button'
                                 onClick={() => setPreviewSide('front')}
                                 className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                                    previewSide === 'front'
                                       ? 'bg-white text-slate-900 shadow-2xs'
                                       : 'text-slate-600 hover:text-slate-900'
                                 }`}
                              >
                                 Лицевая
                              </button>
                              <button
                                 type='button'
                                 onClick={() => setPreviewSide('back')}
                                 className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer ${
                                    previewSide === 'back'
                                       ? 'bg-teal-600 text-white shadow-2xs'
                                       : 'text-slate-600 hover:text-slate-900'
                                 }`}
                              >
                                 <Hash className='w-3.5 h-3.5' />
                                 <span>Оборот (код весов)</span>
                              </button>
                           </div>
                           <span className='text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200'>
                              10 см × 6 см
                           </span>
                        </div>
                     </div>

                     {/* САМА КАРТОЧКА ЦЕННИКА (Шрифт Onest, 100% точное соответствие с Canvas и печатью, 10см х 6см) */}
                     <div className='w-full overflow-hidden rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-300/80 bg-slate-900'>
                        {previewSide === 'front' ? (
                           <div
                              ref={previewCardRef}
                              className='relative w-full aspect-[10/6] select-none overflow-hidden'
                              style={{
                                 containerType: 'inline-size',
                                 backgroundColor: '#171d41',
                                 backgroundImage: activeTextureUrl
                                    ? `url(${activeTextureUrl})`
                                    : 'none',
                                 backgroundSize: 'cover',
                                 backgroundPosition: 'center',
                              }}
                           >
                              {/* 1. Верхний текст: Название и Описание */}
                              <div
                                 className='absolute left-[4.8%] max-w-[90%] text-white select-none'
                                 style={{
                                    top: `${effectiveTitleTopPercent}%`,
                                    fontFamily: '"Onest", sans-serif',
                                    fontStyle: currentTag.isItalic
                                       ? 'italic'
                                       : 'normal',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    lineHeight: 1.08,
                                    fontSize: pxToCqi(effectiveTitleFontSize),
                                    transform: `translate(${pxToCqi(currentTag.titleOffsetX !== undefined ? currentTag.titleOffsetX : TOPFISH_DEFAULTS.titleOffsetX)}, ${pxToCqi(currentTag.titleOffsetY !== undefined ? currentTag.titleOffsetY : TOPFISH_DEFAULTS.titleOffsetY)})`,
                                    padding: '0.4% 0.8%',
                                    maxWidth: '90.4%',
                                    wordBreak: 'normal',
                                    overflowWrap: 'normal',
                                 }}
                              >
                                 <div className='tracking-tight'>
                                    {effectiveTitleLayout.lines.map((lineTokens, lineIdx) => (
                                       <div key={`lp-l-${lineIdx}`} className='whitespace-nowrap'>
                                          {lineTokens.map((token, tIdx) => (
                                             <span key={`lp-t-${tIdx}`}>
                                                {tIdx > 0 ? ' ' : ''}
                                                {token.prefix || ''}
                                                <span
                                                   style={{
                                                      textDecoration:
                                                         token.isDesc && currentTag.underlineDescription
                                                            ? 'underline'
                                                            : 'none',
                                                      textUnderlineOffset: '0.08em',
                                                      textDecorationThickness: '0.05em',
                                                   }}
                                                >
                                                   {token.text}
                                                </span>
                                                {token.suffix || ''}
                                             </span>
                                          ))}
                                       </div>
                                    ))}
                                 </div>
                              </div>

                              {/* 2. ЦЕНА И ВЕС СПРАВА */}
                              <div
                                 className='absolute inset-x-0 bottom-0 top-[12%] flex items-center justify-end pointer-events-none'
                                 style={{
                                    paddingRight: cleanWeightText
                                       ? '1.4%'
                                       : '3.5%',
                                 }}
                              >
                                 <div
                                    className='flex items-start justify-end pointer-events-auto'
                                    style={{
                                       transform: `translate(${pxToCqi(currentTag.priceOffsetX !== undefined ? currentTag.priceOffsetX : TOPFISH_DEFAULTS.priceOffsetX)}, ${pxToCqi(currentTag.priceOffsetY !== undefined ? currentTag.priceOffsetY : TOPFISH_DEFAULTS.priceOffsetY)})`,
                                    }}
                                 >
                                    {/* Блок цены */}
                                    <div
                                       className='flex items-baseline text-white font-black px-2 py-0.5 select-none'
                                       style={{
                                          fontFamily: '"Onest", sans-serif',
                                          fontSize: pxToCqi(
                                             effectivePriceFontSize
                                          ),
                                          lineHeight: 1,
                                       }}
                                    >
                                       <span>{currentTag.price || '0'}</span>
                                       <span
                                          style={{
                                             marginLeft: '0.14em',
                                          }}
                                       >
                                          {currentTag.currency || '₽'}
                                       </span>
                                    </div>

                                    {/* ВЕС СПРАВА ОТ ЦЕНЫ СВЕРХУ - КАПСУЛА */}
                                    {cleanWeightText &&
                                       (() => {
                                          const weightStyles = getWeightColors(
                                             currentTag.weightBrightness !==
                                                undefined
                                                ? currentTag.weightBrightness
                                                : TOPFISH_DEFAULTS.weightBrightness,
                                             false
                                          )
                                          return (
                                             <div
                                                className='ml-1.5 sm:ml-2.5 -mt-0.5 sm:-mt-1 rounded-full italic tracking-wide flex items-center justify-center shrink-0 select-none'
                                                style={{
                                                   fontSize: pxToCqi(
                                                      effectiveWeightFontSize
                                                   ),
                                                   lineHeight: 1.1,
                                                   fontFamily:
                                                      '"Onest", sans-serif',
                                                   fontWeight:
                                                      weightStyles.fontWeight,
                                                   color: weightStyles.color,
                                                   border: `1px solid ${weightStyles.borderColor}`,
                                                   padding: `${pxToCqi(Math.round(effectiveWeightFontSize * 0.18))} ${pxToCqi(Math.round(effectiveWeightFontSize * 0.52))}`,
                                                   transform: `translate(${pxToCqi(currentTag.weightOffsetX !== undefined ? currentTag.weightOffsetX : TOPFISH_DEFAULTS.weightOffsetX)}, ${pxToCqi(currentTag.weightOffsetY !== undefined ? currentTag.weightOffsetY : TOPFISH_DEFAULTS.weightOffsetY)})`,
                                                }}
                                             >
                                                {cleanWeightText}
                                             </div>
                                          )
                                       })()}
                                 </div>
                              </div>

                              {/* 3. ШИЛЬДИК ОБРАБОТКИ В ЛЕВОМ НИЖНЕМ УГЛУ */}
                              <div
                                 className='absolute left-0 bottom-0 flex items-center justify-center font-black origin-bottom-left select-none'
                                 style={{
                                    height: '24%',
                                    minWidth: '26%',
                                    paddingLeft: '3.5%',
                                    paddingRight: '3.5%',
                                    borderTopRightRadius: '32px',
                                    background: `linear-gradient(to right, ${currentProcConfig.colorStart}, ${currentProcConfig.colorEnd})`,
                                    color: '#151b32',
                                    fontSize: pxToCqi(
                                       Math.round(
                                          82 *
                                             ((currentTag.badgeScale ||
                                                TOPFISH_DEFAULTS.badgeScale) /
                                                100)
                                       )
                                    ),
                                    fontFamily: '"Onest", sans-serif',
                                    lineHeight: 1,
                                    transform: `scale(${(currentTag.badgeScale || TOPFISH_DEFAULTS.badgeScale) / 100})`,
                                    transformOrigin: 'bottom left',
                                 }}
                              >
                                 {currentProcConfig.badgeText}
                              </div>

                              {/* 4. ЛОГОТИП ТОПФИШ В ПРАВОМ НИЖНЕМ УГЛУ */}
                              {currentTag.showLogo && (
                                 <div
                                    className='absolute right-[3.6%] bottom-[4.8%] w-[23%] max-w-[240px] origin-bottom-right'
                                    style={{
                                       transform: `scale(${(currentTag.logoScale || TOPFISH_DEFAULTS.logoScale) / 100})`,
                                       transformOrigin: 'bottom right',
                                    }}
                                 >
                                    <img
                                       src='/Logo%20price.png'
                                       alt='ТопФиш Копченая рыба'
                                       className='w-full h-auto object-contain drop-shadow-sm pointer-events-none'
                                    />
                                 </div>
                              )}
                           </div>
                        ) : (
                           <div
                              ref={previewCardRef}
                              className='relative w-full aspect-[10/6] select-none overflow-hidden bg-white border-4 border-dashed border-slate-300 p-[3.5%] flex flex-col justify-between'
                              style={{
                                 containerType: 'inline-size',
                                 fontFamily: '"Onest", sans-serif',
                              }}
                           >
                              {/* Верхняя полоса: Название + вид обработки */}
                              <div className='flex items-center justify-between border-b-2 border-slate-200 pb-[2%]'>
                                 <div
                                    className='font-bold text-slate-800 uppercase tracking-tight truncate max-w-[75%]'
                                    style={{ fontSize: '3.6cqi' }}
                                 >
                                    <span>
                                       {currentTag.title || 'НАЗВАНИЕ ТОВАРА'}
                                    </span>
                                    {currentTag.description && (
                                       <span className='text-slate-500 font-semibold ml-1.5'>
                                          ({currentTag.description})
                                       </span>
                                    )}
                                 </div>
                                 <div
                                    className='font-black text-slate-700 uppercase tracking-wider shrink-0'
                                    style={{ fontSize: '3.6cqi' }}
                                 >
                                    {currentProcConfig.badgeText}
                                 </div>
                              </div>

                              {/* Центр: Крупный код для весов */}
                              <div className='flex flex-col items-center justify-center py-[1%] text-center'>
                                 <span
                                    className='font-bold uppercase tracking-widest text-slate-400 mb-[0.5%]'
                                    style={{ fontSize: '2.8cqi' }}
                                 >
                                    КОД ДЛЯ ВЕСОВ / PLU
                                 </span>
                                 <span
                                    className='font-black text-slate-900 tracking-wider leading-none select-all'
                                    style={{
                                       fontSize:
                                          (currentTag.productCode || '')
                                             .length <= 4
                                             ? '19cqi'
                                             : (currentTag.productCode || '')
                                                    .length <= 6
                                               ? '15cqi'
                                               : '11cqi',
                                    }}
                                 >
                                    {currentTag.productCode || '—'}
                                 </span>
                              </div>

                              {/* Нижняя полоса: бренд и цена */}
                              <div className='flex items-center justify-between border-t-2 border-slate-200 pt-[2%]'>
                                 <span
                                    className='font-extrabold text-slate-400 tracking-wider uppercase'
                                    style={{ fontSize: '3cqi' }}
                                 >
                                    ТОПФИШ
                                 </span>
                                 <div
                                    className='font-bold text-slate-800 flex items-center gap-1.5'
                                    style={{ fontSize: '3.4cqi' }}
                                 >
                                    <span>
                                       {currentTag.price}{' '}
                                       {currentTag.currency || '₽'}
                                    </span>
                                    {cleanWeightText && (
                                       <span className='text-slate-500 font-semibold'>
                                          / {cleanWeightText}
                                       </span>
                                    )}
                                 </div>
                              </div>
                           </div>
                        )}
                     </div>

                     {/* Кнопки действий под карточкой предпросмотра */}
                     <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2'>
                        <button
                           type='button'
                           onClick={() => handleDownloadPNG(1)}
                           className='px-2.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs'
                        >
                           <Download className='w-3.5 h-3.5 text-teal-400' />
                           <span>PNG (1x)</span>
                        </button>

                        <button
                           type='button'
                           onClick={() => handleDownloadPNG(2)}
                           className='px-2.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs'
                           title='Экспорт в разрешении 2048x1228 для печати'
                        >
                           <Sparkles className='w-3.5 h-3.5' />
                           <span>Ultra HD</span>
                        </button>

                        <button
                           type='button'
                           onClick={handleCopyImage}
                           className='px-2.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer'
                        >
                           {isCopied ? (
                              <>
                                 <Check className='w-3.5 h-3.5 text-emerald-600' />
                                 <span>Готово!</span>
                              </>
                           ) : (
                              <>
                                 <Copy className='w-3.5 h-3.5 text-slate-600' />
                                 <span>В буфер</span>
                              </>
                           )}
                        </button>

                        <button
                           type='button'
                           onClick={handleAddToQueue}
                           className='px-2.5 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer'
                        >
                           <Plus className='w-3.5 h-3.5 text-teal-600' />
                           <span>В очередь</span>
                        </button>

                        <button
                           type='button'
                           onClick={() => handleExportPDF([currentTag])}
                           className='px-2.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer'
                           title='Скачать данный ценник в PDF со строгим размером 10x6 см'
                        >
                           <FileText className='w-3.5 h-3.5 text-rose-600' />
                           <span>PDF 10×6</span>
                        </button>

                        <button
                           type='button'
                           onClick={() => handleExportWord([currentTag])}
                           className='px-2.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer'
                           title='Скачать данный ценник в документ Word (.doc) со строгим размером 10x6 см'
                        >
                           <FileDown className='w-3.5 h-3.5 text-blue-600' />
                           <span>Word .doc</span>
                        </button>
                     </div>
                  </div>
               </div>
            </div>

            {/* ОЧЕРЕДЬ НА ПЕЧАТЬ (ПАКЕТНАЯ ПЕЧАТЬ НА А4) */}
            <div className='bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4'>
               <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4'>
                  <div>
                     <div className='flex items-center gap-2'>
                        <Printer className='w-5 h-5 text-teal-600' />
                        <h3 className='font-extrabold text-slate-900 text-lg'>
                           Очередь ценников на печать (Лист А4)
                        </h3>
                        <span className='px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700'>
                           {printQueue.length} шт.
                        </span>
                     </div>
                     <p className='text-xs text-slate-500 mt-0.5'>
                        Сформируйте список ценников и распечатайте их сеткой на
                        листах А4
                     </p>
                  </div>

                  <div className='flex flex-wrap items-center gap-2'>
                     {printQueue.length > 0 && (
                        <>
                           <button
                              type='button'
                              onClick={() => handleExportPDF(printQueue)}
                              className='px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer'
                              title='Скачать все ценники из очереди в виде готового PDF файла (10x6 см, 8 шт на лист А4)'
                           >
                              <FileText className='w-4 h-4' />
                              <span>Скачать PDF ({printQueue.length})</span>
                           </button>

                           <button
                              type='button'
                              onClick={() => handleExportWord(printQueue)}
                              className='px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer'
                              title='Скачать все ценники из очереди в документ Word (.doc) со строгим размером 10x6 см'
                           >
                              <FileDown className='w-4 h-4' />
                              <span>Скачать Word ({printQueue.length})</span>
                           </button>

                           <button
                              type='button'
                              onClick={() => setPrintQueue([])}
                              className='px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer'
                           >
                              <Trash2 className='w-3.5 h-3.5' />
                              <span>Очистить</span>
                           </button>

                           <button
                              type='button'
                              onClick={() => window.print()}
                              className='px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-md shadow-teal-600/20 cursor-pointer'
                           >
                              <Printer className='w-4 h-4' />
                              <span>Распечатать все ({printQueue.length})</span>
                           </button>
                        </>
                     )}
                  </div>
               </div>

               {/* Настройки печати сетки */}
               {printQueue.length > 0 && (
                  <div className='flex flex-wrap items-center justify-between gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700'>
                     <div className='flex items-center gap-2.5'>
                        <span className='text-slate-400'>Формат ценника:</span>
                        <span className='px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-extrabold text-xs shadow-2xs'>
                           10 см ширина × 6 см высота
                        </span>
                        <span className='text-slate-400 text-[11px] font-normal'>
                           (строгий стандарт, 8 шт на лист А4)
                        </span>
                     </div>

                     <div className='flex items-center gap-4'>
                        <div className='flex items-center gap-2 mr-2'>
                           <span className='text-slate-400'>Печать:</span>
                           <select
                              value={printSideMode}
                              onChange={(e) =>
                                 setPrintSideMode(e.target.value as any)
                              }
                              className='bg-white font-bold text-slate-800 text-xs px-2 py-1 rounded-lg border border-slate-300 focus:outline-teal-500 cursor-pointer'
                           >
                              <option value='both'>
                                 Лицо + Оборот (коды весов)
                              </option>
                              <option value='front_only'>Только лицо</option>
                              <option value='back_only'>
                                 Только коды весов (оборот)
                              </option>
                           </select>
                        </div>

                        <span className='text-slate-400'>
                           Режим расхода краски:
                        </span>
                        <label className='flex items-center gap-1.5 cursor-pointer'>
                           <input
                              type='radio'
                              name='printLayoutMode'
                              checked={printLayoutMode === 'color'}
                              onChange={() => setPrintLayoutMode('color')}
                              className='text-teal-600 focus:ring-teal-500'
                           />
                           <span>Полноцветный (синий фон/текстура)</span>
                        </label>
                        <label className='flex items-center gap-1.5 cursor-pointer'>
                           <input
                              type='radio'
                              name='printLayoutMode'
                              checked={printLayoutMode === 'eco'}
                              onChange={() => setPrintLayoutMode('eco')}
                              className='text-teal-600 focus:ring-teal-500'
                           />
                           <span>Эконом (белый фон)</span>
                        </label>
                     </div>
                  </div>
               )}

               {/* Список ценников в очереди */}
               {printQueue.length === 0 ? (
                  <div className='py-12 text-center text-slate-400'>
                     <Printer className='w-10 h-10 mx-auto mb-2 text-slate-300' />
                     <p className='text-sm font-bold text-slate-600'>
                        Очередь печати пуста
                     </p>
                     <p className='text-xs text-slate-400 mt-1 max-w-md mx-auto'>
                        Нажмите кнопку «В очередь» в редакторе выше, чтобы
                        отправить ценник в очередь и распечатать несколько
                        ценников на листе А4.
                     </p>
                  </div>
               ) : (
                  <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5'>
                     {printQueue.map((tag) => {
                        const proc =
                           tag.processingType === 'CUSTOM'
                              ? {
                                   badgeText: tag.customProcessingText || 'ТОП',
                                   colorStart:
                                      tag.customColorStart || '#2b81b0',
                                   colorEnd: tag.customColorEnd || '#a9e1ff',
                                }
                              : PROCESSING_TYPES[tag.processingType]

                        const tagTexture =
                           tag.textureMode === 'custom' && tag.customTextureUrl
                              ? tag.customTextureUrl
                              : tag.textureMode === 'solid' ||
                                  tag.textureMode === 'solid_blue'
                                ? ''
                                : tag.textureMode === 'auto'
                                  ? tag.processingType === 'CUSTOM'
                                     ? '/textures/xk.jpg'
                                     : PROCESSING_TYPES[tag.processingType]
                                          .textureUrl
                                  : `/textures/${tag.textureMode}.jpg`

                        const cleanItemWeight = formatWeightText(tag.weight)
                        const itemLayout = computeDynamicTitleLayout(
                           tag.title,
                           tag.description
                        )
                        const itemTitleFontSize =
                           tag.titleFontSize || itemLayout.fontSize
                        const itemTitleTopPercent =
                           itemLayout.dynamicTitleTopPercent
                        const itemPriceTopPercent =
                           itemLayout.dynamicPriceTopPercent
                        const itemPriceFontSize =
                           tag.priceFontSize ||
                           computeDynamicPriceFontSize(tag.price)
                        const itemWeightFontSize =
                           tag.weightFontSize || TOPFISH_DEFAULTS.weightFontSize
                        const itemTitleOffsetX =
                           tag.titleOffsetX !== undefined
                              ? tag.titleOffsetX
                              : TOPFISH_DEFAULTS.titleOffsetX
                        const itemTitleOffsetY =
                           tag.titleOffsetY !== undefined
                              ? tag.titleOffsetY
                              : TOPFISH_DEFAULTS.titleOffsetY
                        const itemPriceOffsetX =
                           tag.priceOffsetX !== undefined
                              ? tag.priceOffsetX
                              : TOPFISH_DEFAULTS.priceOffsetX
                        const itemPriceOffsetY =
                           tag.priceOffsetY !== undefined
                              ? tag.priceOffsetY
                              : TOPFISH_DEFAULTS.priceOffsetY
                        const itemWeightOffsetX =
                           tag.weightOffsetX !== undefined
                              ? tag.weightOffsetX
                              : TOPFISH_DEFAULTS.weightOffsetX
                        const itemWeightOffsetY =
                           tag.weightOffsetY !== undefined
                              ? tag.weightOffsetY
                              : TOPFISH_DEFAULTS.weightOffsetY
                        const itemWeightBrightness =
                           tag.weightBrightness !== undefined
                              ? tag.weightBrightness
                              : TOPFISH_DEFAULTS.weightBrightness
                        const itemBadgeScale =
                           tag.badgeScale || TOPFISH_DEFAULTS.badgeScale
                        const itemLogoScale =
                           tag.logoScale || TOPFISH_DEFAULTS.logoScale

                        return (
                           <div
                              key={tag.id}
                              className='p-3 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs transition flex flex-col justify-between group'
                           >
                              <div
                                 className='relative w-full aspect-[10/6] rounded-xl overflow-hidden mb-2.5 select-none'
                                 style={{
                                    containerType: 'inline-size',
                                    backgroundColor: '#171d41',
                                    backgroundImage: tagTexture
                                       ? `url(${tagTexture})`
                                       : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                 }}
                              >
                                 {/* 1. Верхний текст: Название и Описание */}
                                 <div
                                    className='absolute left-[4.8%] max-w-[90%] text-white'
                                    style={{
                                       top: itemTitleTopPercent + '%',
                                       fontFamily: '"Onest", sans-serif',
                                       fontStyle: tag.isItalic
                                          ? 'italic'
                                          : 'normal',
                                       fontWeight: 700,
                                       textTransform: 'uppercase',
                                       lineHeight: 1.08,
                                       fontSize: pxToCqi(itemTitleFontSize),
                                       transform: `translate(${pxToCqi(itemTitleOffsetX)}, ${pxToCqi(itemTitleOffsetY)})`,
                                       padding: '0.4% 0.8%',
                                       maxWidth: '90.4%',
                                       wordBreak: 'normal',
                                       overflowWrap: 'normal',
                                    }}
                                 >
                                    <div className='tracking-tight'>
                                       {itemLayout.lines.map((lineTokens, lineIdx) => (
                                          <div key={`q-l-${lineIdx}`} className='whitespace-nowrap'>
                                             {lineTokens.map((token, tIdx) => (
                                                <span key={`q-t-${tIdx}`}>
                                                   {tIdx > 0 ? ' ' : ''}
                                                   {token.prefix || ''}
                                                   <span
                                                      style={{
                                                         textDecoration:
                                                            token.isDesc && tag.underlineDescription
                                                               ? 'underline'
                                                               : 'none',
                                                         textUnderlineOffset: '0.08em',
                                                         textDecorationThickness: '0.05em',
                                                      }}
                                                   >
                                                      {token.text}
                                                   </span>
                                                   {token.suffix || ''}
                                                </span>
                                             ))}
                                          </div>
                                       ))}
                                    </div>
                                 </div>

                                 {/* 2. ЦЕНА И ВЕС СПРАВА */}
                                 <div
                                    className='absolute inset-x-0 bottom-0 top-[12%] flex items-center justify-end pointer-events-none'
                                    style={{
                                       paddingRight: cleanItemWeight
                                          ? '1.4%'
                                          : '3.5%',
                                    }}
                                 >
                                    <div
                                       className='flex items-start justify-end'
                                       style={{
                                          transform: `translate(${pxToCqi(itemPriceOffsetX)}, ${pxToCqi(itemPriceOffsetY)})`,
                                       }}
                                    >
                                       <div
                                          className='flex items-baseline text-white font-black'
                                          style={{
                                             fontFamily: '"Onest", sans-serif',
                                             fontSize: pxToCqi(itemPriceFontSize),
                                             lineHeight: 1,
                                          }}
                                       >
                                          <span>{tag.price}</span>
                                          <span style={{ marginLeft: '0.14em' }}>
                                             {tag.currency || '₽'}
                                          </span>
                                       </div>

                                       {/* ВЕС */}
                                       {cleanItemWeight &&
                                          (() => {
                                             const weightStyles = getWeightColors(
                                                itemWeightBrightness,
                                                false
                                             )
                                             return (
                                                <div
                                                   className='ml-1.5 sm:ml-2 -mt-0.5 sm:-mt-1 rounded-full italic tracking-wide flex items-center justify-center shrink-0'
                                                   style={{
                                                      fontSize: pxToCqi(itemWeightFontSize),
                                                      lineHeight: 1.1,
                                                      fontFamily: '"Onest", sans-serif',
                                                      fontWeight: weightStyles.fontWeight,
                                                      color: weightStyles.color,
                                                      border: `1px solid ${weightStyles.borderColor}`,
                                                      padding: `${pxToCqi(Math.round(itemWeightFontSize * 0.18))} ${pxToCqi(Math.round(itemWeightFontSize * 0.52))}`,
                                                      transform: `translate(${pxToCqi(itemWeightOffsetX)}, ${pxToCqi(itemWeightOffsetY)})`,
                                                   }}
                                                >
                                                   {cleanItemWeight}
                                                </div>
                                             )
                                          })()}
                                    </div>
                                 </div>

                                 {/* 3. ШИЛЬДИК ОБРАБОТКИ В ЛЕВОМ НИЖНЕМ УГЛУ */}
                                 <div
                                    className='absolute left-0 bottom-0 flex items-center justify-center font-black origin-bottom-left'
                                    style={{
                                       height: '24%',
                                       minWidth: '26%',
                                       paddingLeft: '3.5%',
                                       paddingRight: '3.5%',
                                       borderTopRightRadius: '32px',
                                       background: `linear-gradient(to right, ${proc.colorStart}, ${proc.colorEnd})`,
                                       color: '#151b32',
                                       fontSize: pxToCqi(
                                          Math.round(
                                             82 * (itemBadgeScale / 100)
                                          )
                                       ),
                                       fontFamily: '"Onest", sans-serif',
                                       lineHeight: 1,
                                       transform: `scale(${itemBadgeScale / 100})`,
                                       transformOrigin: 'bottom left',
                                    }}
                                 >
                                    {proc.badgeText}
                                 </div>

                                 {/* 4. ЛОГОТИП ТОПФИШ В ПРАВОМ НИЖНЕМ УГЛУ */}
                                 {tag.showLogo && (
                                    <div
                                       className='absolute right-[3.6%] bottom-[4.8%] w-[23%] max-w-[240px] pointer-events-none origin-bottom-right'
                                       style={{
                                          transform: `scale(${itemLogoScale / 100})`,
                                          transformOrigin: 'bottom right',
                                       }}
                                    >
                                       <img
                                          src='/Logo%20price.png'
                                          alt='ТопФиш'
                                          className='w-full h-auto object-contain drop-shadow-sm'
                                       />
                                    </div>
                                 )}
                              </div>

                              <div className='flex items-center justify-between pt-1 border-t border-slate-100 text-xs'>
                                 <div className='flex items-center gap-1.5 min-w-0 mr-2'>
                                    <button
                                       type='button'
                                       onClick={() => handleLoadFromQueue(tag)}
                                       className='font-bold text-teal-700 hover:text-teal-900 text-left truncate cursor-pointer'
                                    >
                                       {tag.title}
                                    </button>
                                    {tag.productCode && (
                                       <span className='inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] font-bold rounded shrink-0'>
                                          <Hash className='w-2.5 h-2.5 text-teal-600' />
                                          {tag.productCode}
                                       </span>
                                    )}
                                 </div>
                                 <button
                                    type='button'
                                    onClick={() =>
                                       handleRemoveFromQueue(tag.id)
                                    }
                                    className='text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer'
                                    title='Удалить из очереди'
                                 >
                                    <Trash2 className='w-3.5 h-3.5' />
                                 </button>
                              </div>
                           </div>
                        )
                     })}
                  </div>
               )}
            </div>

            {/* МОДАЛЬНОЕ ОКНО ВЫБОРА ТОВАРА ИЗ ПЛАНА / КАТАЛОГА */}
            {isCatalogOpen && (
               <div className='fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4'>
                  <div className='bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150'>
                     <div className='p-5 border-b border-slate-100 flex items-center justify-between'>
                        <div className='flex items-center gap-3'>
                           <div className='w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold'>
                              <Search className='w-5 h-5' />
                           </div>
                           <div>
                              <h3 className='font-extrabold text-slate-900 text-base'>
                                 Выбор товара из производственного плана
                              </h3>
                              <p className='text-xs text-slate-500'>
                                 Кликните по товару, чтобы автоматически
                                 подставить его название, цену и вид обработки
                              </p>
                           </div>
                        </div>
                        <button
                           type='button'
                           onClick={() => setIsCatalogOpen(false)}
                           className='w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer'
                        >
                           <X className='w-4 h-4' />
                        </button>
                     </div>

                     <div className='p-4 border-b border-slate-100 bg-slate-50/50'>
                        <div className='relative'>
                           <Search className='w-4 h-4 absolute left-3 top-3 text-slate-400' />
                           <input
                              type='text'
                              value={catalogSearch}
                              onChange={(e) => setCatalogSearch(e.target.value)}
                              placeholder='Поиск по названию рыбы (сиг, скумбрия, терпуг, колбаса...)'
                              className='w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500'
                              autoFocus
                           />
                        </div>
                     </div>

                     <div className='p-4 overflow-y-auto space-y-2 flex-1 max-h-[50vh]'>
                        {filteredCatalogItems.length === 0 ? (
                           <div className='py-8 text-center text-slate-400 text-sm'>
                              Товары не найдены
                           </div>
                        ) : (
                           filteredCatalogItems.map((item, idx) => {
                              const parsed = parseProductText(
                                 item.productName || ''
                              )
                              return (
                                 <button
                                    key={item.id || idx}
                                    type='button'
                                    onClick={() =>
                                       handleSelectCatalogItem(item)
                                    }
                                    className='w-full p-3 rounded-2xl border border-slate-200/80 hover:border-teal-400 hover:bg-teal-50/50 text-left transition flex items-center justify-between group cursor-pointer'
                                 >
                                    <div>
                                       <div
                                          className='font-bold text-slate-900 text-sm group-hover:text-teal-800'
                                          style={{
                                             fontFamily: '"Onest", sans-serif',
                                          }}
                                       >
                                          {parsed.title}{' '}
                                          {parsed.description
                                             ? `(${parsed.description})`
                                             : ''}
                                       </div>
                                       <div className='flex items-center gap-2 mt-0.5 text-xs text-slate-500'>
                                          <span className='font-semibold text-teal-700'>
                                             Вид: {parsed.procType}
                                          </span>
                                          {item.category && (
                                             <span>• {item.category}</span>
                                          )}
                                       </div>
                                    </div>

                                    <div className='text-right shrink-0'>
                                       <span
                                          className='font-extrabold text-slate-900 text-sm group-hover:text-teal-700'
                                          style={{
                                             fontFamily: '"Onest", sans-serif',
                                          }}
                                       >
                                          {item.price
                                             ? `${Math.round(item.price)} ₽`
                                             : '—'}
                                       </span>
                                    </div>
                                 </button>
                              )
                           })
                        )}
                     </div>

                     <div className='p-4 border-t border-slate-100 bg-slate-50 flex justify-end'>
                        <button
                           type='button'
                           onClick={() => setIsCatalogOpen(false)}
                           className='px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition cursor-pointer'
                        >
                           Закрыть
                        </button>
                     </div>
                  </div>
               </div>
            )}
         </div>

         {/* ПЕЧАТНАЯ ВЕРСТКА ДЛЯ СЕТКИ НА А4 (Отображается только в окне печати @media print, строгий формат 10см x 6см) */}
         <div className='hidden print:block print:w-full'>
            <style
               dangerouslySetInnerHTML={{
                  __html: `
          @media print {
            body {
              background: #fff !important;
              color: #000 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            @page {
              size: A4 portrait;
              margin: 8mm 5mm 5mm 5mm;
            }
            header, nav, aside, footer, .print-screen-content, .print-hidden, .no-print, [role="navigation"] {
              display: none !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-price-tags-sheet {
              display: block !important;
              width: 200mm !important;
              margin: 0 auto !important;
            }
            .print-page-wrapper {
              width: 200mm !important;
              height: 275mm !important;
              page-break-after: always !important;
              break-after: page !important;
              margin: 0 auto !important;
            }
            .print-tags-grid {
              display: grid !important;
              grid-template-columns: 100mm 100mm !important;
              grid-auto-rows: 60mm !important;
              gap: 0mm 0mm !important;
              justify-content: center !important;
              width: 200mm !important;
            }
            .print-tag-card {
              width: 100mm !important;
              min-width: 100mm !important;
              max-width: 100mm !important;
              height: 60mm !important;
              min-height: 60mm !important;
              max-height: 60mm !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              overflow: hidden !important;
              position: relative !important;
            }
            .print-tag-card-back {
              width: 100mm !important;
              min-width: 100mm !important;
              max-width: 100mm !important;
              height: 60mm !important;
              min-height: 60mm !important;
              max-height: 60mm !important;
              background-color: #ffffff !important;
              border: 1px dashed #94a3b8 !important;
              box-sizing: border-box !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              position: relative !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              padding: 4mm 6mm !important;
            }
          }
        `,
               }}
            />

            <div className='print-price-tags-sheet'>
               {(() => {
                  const targetTags =
                     printQueue.length > 0 ? printQueue : [currentTag]
                  const tagsPerPage = 8
                  const numBatches = Math.max(
                     1,
                     Math.ceil(targetTags.length / tagsPerPage)
                  )
                  const needFront =
                     printSideMode === 'both' || printSideMode === 'front_only'
                  const needBack =
                     printSideMode === 'both' || printSideMode === 'back_only'

                  const pages: React.ReactNode[] = []

                  for (let b = 0; b < numBatches; b++) {
                     const start = b * tagsPerPage
                     const count = Math.min(
                        tagsPerPage,
                        targetTags.length - start
                     )
                     const batchTags = targetTags.slice(start, start + count)

                     // 1. Лицевая сторона (до 8 карточек на листе А4)
                     if (needFront) {
                        pages.push(
                           <div
                              key={'front_page_' + b}
                              className='print-page-wrapper'
                           >
                              <div className='print-tags-grid grid grid-cols-2 gap-2 justify-center'>
                                 {batchTags.map((tag, tagIdx) => {
                                    const proc =
                                       tag.processingType === 'CUSTOM'
                                          ? {
                                               badgeText:
                                                  tag.customProcessingText ||
                                                  'ТОП',
                                               colorStart:
                                                  tag.customColorStart ||
                                                  '#2b81b0',
                                               colorEnd:
                                                  tag.customColorEnd ||
                                                  '#a9e1ff',
                                            }
                                          : PROCESSING_TYPES[tag.processingType]

                                    const tagTexture =
                                       printLayoutMode === 'eco'
                                          ? ''
                                          : tag.textureMode === 'custom' &&
                                              tag.customTextureUrl
                                            ? tag.customTextureUrl
                                            : tag.textureMode === 'solid' ||
                                                tag.textureMode === 'solid_blue'
                                              ? ''
                                              : tag.textureMode === 'auto'
                                                ? tag.processingType ===
                                                  'CUSTOM'
                                                   ? '/textures/xk.jpg'
                                                   : PROCESSING_TYPES[
                                                        tag.processingType
                                                     ].textureUrl
                                                : '/textures/' +
                                                  tag.textureMode +
                                                  '.jpg'

                                    const isEco = printLayoutMode === 'eco'
                                    const cleanItemWeight = formatWeightText(
                                       tag.weight
                                    )
                                    const printScale = 0.369 // 100mm / 1024px ≈ 0.369px per base px на листе печати А4
                                    const itemLayout = computeDynamicTitleLayout(
                                       tag.title,
                                       tag.description
                                    )
                                    const printTitleFontSize = Math.round(
                                       (tag.titleFontSize ||
                                          itemLayout.fontSize) * printScale
                                    )
                                    const printTitleTopPercent =
                                       itemLayout.dynamicTitleTopPercent
                                    const printPriceTopPercent =
                                       itemLayout.dynamicPriceTopPercent
                                    const printPriceFontSize = Math.round(
                                       (tag.priceFontSize ||
                                          computeDynamicPriceFontSize(
                                             tag.price
                                          )) * printScale
                                    )
                                    const printWeightFontSize = Math.round(
                                       (tag.weightFontSize ||
                                          TOPFISH_DEFAULTS.weightFontSize) *
                                          printScale
                                    )
                                    const printTitleOffsetY = Math.round(
                                       (tag.titleOffsetY !== undefined
                                          ? tag.titleOffsetY
                                          : TOPFISH_DEFAULTS.titleOffsetY) *
                                          printScale
                                    )
                                    const printTitleOffsetX = Math.round(
                                       (tag.titleOffsetX !== undefined
                                          ? tag.titleOffsetX
                                          : TOPFISH_DEFAULTS.titleOffsetX) *
                                          printScale
                                    )
                                    const printPriceOffsetY = Math.round(
                                       (tag.priceOffsetY !== undefined
                                          ? tag.priceOffsetY
                                          : TOPFISH_DEFAULTS.priceOffsetY) *
                                          printScale
                                    )
                                    const printPriceOffsetX = Math.round(
                                       (tag.priceOffsetX !== undefined
                                          ? tag.priceOffsetX
                                          : TOPFISH_DEFAULTS.priceOffsetX) *
                                          printScale
                                    )
                                    const printWeightOffsetY = Math.round(
                                       (tag.weightOffsetY !== undefined
                                          ? tag.weightOffsetY
                                          : TOPFISH_DEFAULTS.weightOffsetY) *
                                          printScale
                                    )
                                    const printWeightOffsetX = Math.round(
                                       (tag.weightOffsetX !== undefined
                                          ? tag.weightOffsetX
                                          : TOPFISH_DEFAULTS.weightOffsetX) *
                                          printScale
                                    )
                                    const printWeightBrightness =
                                       tag.weightBrightness !== undefined
                                          ? tag.weightBrightness
                                          : TOPFISH_DEFAULTS.weightBrightness
                                    const printBadgeScale =
                                       (tag.badgeScale ||
                                          TOPFISH_DEFAULTS.badgeScale) / 100
                                    const printLogoScale =
                                       (tag.logoScale ||
                                          TOPFISH_DEFAULTS.logoScale) / 100

                                    return (
                                       <div
                                          key={tag.id || tagIdx}
                                          className={
                                             isEco
                                                ? 'print-tag-card relative border border-dashed border-slate-400 overflow-hidden'
                                                : 'print-tag-card relative overflow-hidden'
                                          }
                                          style={{
                                             width: '100mm',
                                             height: '60mm',
                                             backgroundColor: isEco
                                                ? '#ffffff'
                                                : '#171d41',
                                             backgroundImage: tagTexture
                                                ? 'url(' + tagTexture + ')'
                                                : 'none',
                                             backgroundSize: 'cover',
                                             backgroundPosition: 'center',
                                             color: isEco
                                                ? '#000000'
                                                : '#ffffff',
                                          }}
                                       >
                                          {/* Название и описание */}
                                          <div
                                             className='absolute left-[4.8%] max-w-[90%]'
                                             style={{
                                                top: printTitleTopPercent + '%',
                                                color: isEco ? '#000000' : '#ffffff',
                                                fontFamily: '"Onest", sans-serif',
                                                fontStyle: tag.isItalic ? 'italic' : 'normal',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                lineHeight: 1.08,
                                                fontSize: printTitleFontSize + 'px',
                                                transform: 'translate(' + printTitleOffsetX + 'px, ' + printTitleOffsetY + 'px)',
                                                maxWidth: '90.4%',
                                                wordBreak: 'normal',
                                                overflowWrap: 'normal',
                                             }}
                                          >
                                             <div className='tracking-tight'>
                                                {itemLayout.lines.map((lineTokens, lineIdx) => (
                                                   <div key={`pr-l-${lineIdx}`} style={{ whiteSpace: 'nowrap' }}>
                                                      {lineTokens.map((token, tIdx) => (
                                                         <span key={`pr-t-${tIdx}`}>
                                                            {tIdx > 0 ? ' ' : ''}
                                                            {token.prefix || ''}
                                                            <span
                                                               style={{
                                                                  textDecoration:
                                                                     token.isDesc && tag.underlineDescription
                                                                        ? 'underline'
                                                                        : 'none',
                                                                  textUnderlineOffset: '0.08em',
                                                                  textDecorationThickness: '0.05em',
                                                               }}
                                                            >
                                                               {token.text}
                                                            </span>
                                                            {token.suffix || ''}
                                                         </span>
                                                      ))}
                                                   </div>
                                                ))}
                                             </div>
                                          </div>

                                          {/* Цена и вес у правого края */}
                                          <div
                                             className='absolute inset-x-0 bottom-0 top-[12%] flex items-center justify-end'
                                             style={{
                                                paddingRight: cleanItemWeight ? '3%' : '5%',
                                             }}
                                          >
                                             <div
                                                className='flex items-start justify-end'
                                                style={{
                                                   transform: 'translate(' + printPriceOffsetX + 'px, ' + printPriceOffsetY + 'px)',
                                                }}
                                             >
                                                <div
                                                   className='flex items-baseline font-black tracking-tight'
                                                   style={{
                                                      fontSize: printPriceFontSize + 'px',
                                                      color: isEco ? '#000000' : '#ffffff',
                                                      fontFamily: '"Onest", sans-serif',
                                                      lineHeight: 1,
                                                   }}
                                                >
                                                   <span>{tag.price}</span>
                                                   <span style={{ marginLeft: '0.14em' }}>
                                                      {tag.currency || '₽'}
                                                   </span>
                                                </div>

                                                {/* Вес */}
                                                {cleanItemWeight &&
                                                   (() => {
                                                      const weightStyles = getWeightColors(
                                                         printWeightBrightness,
                                                         isEco
                                                      )
                                                      return (
                                                         <div
                                                            className='ml-1.5 -mt-0.5 rounded-full italic tracking-wide flex items-center justify-center shrink-0'
                                                            style={{
                                                               fontSize: printWeightFontSize + 'px',
                                                               lineHeight: 1.1,
                                                               fontFamily: '"Onest", sans-serif',
                                                               fontWeight: weightStyles.fontWeight,
                                                               color: weightStyles.color,
                                                               border: '1px solid ' + weightStyles.borderColor,
                                                               padding:
                                                                  Math.round(printWeightFontSize * 0.18) +
                                                                  'px ' +
                                                                  Math.round(printWeightFontSize * 0.52) +
                                                                  'px',
                                                               transform:
                                                                  'translate(' +
                                                                  printWeightOffsetX +
                                                                  'px, ' +
                                                                  printWeightOffsetY +
                                                                  'px)',
                                                            }}
                                                         >
                                                            {cleanItemWeight}
                                                         </div>
                                                      )
                                                   })()}
                                             </div>
                                          </div>

                                          {/* Шильдик вида обработки */}
                                          <div
                                             className='absolute left-[1.5%] bottom-0 flex items-center justify-center font-black'
                                             style={{
                                                height: '24%',
                                                minWidth: '26%',
                                                paddingLeft: '3.5%',
                                                paddingRight: '3.5%',
                                                borderTopRightRadius: '20px',
                                                background:
                                                   'linear-gradient(to right, ' +
                                                   proc.colorStart +
                                                   ', ' +
                                                   proc.colorEnd +
                                                   ')',
                                                color: '#151b32',
                                                fontSize:
                                                   Math.round(
                                                      24 * printBadgeScale
                                                   ) + 'px',
                                                fontFamily:
                                                   '"Onest", sans-serif',
                                                lineHeight: 1,
                                                transform:
                                                   'scale(' +
                                                   printBadgeScale +
                                                   ')',
                                                transformOrigin: 'bottom left',
                                             }}
                                          >
                                             {proc.badgeText}
                                          </div>

                                          {/* Логотип ТопФиш */}
                                          {tag.showLogo && (
                                             <div
                                                className='absolute right-[5.3%] bottom-[4.8%] w-[22%] max-w-[95px]'
                                                style={{
                                                   transform:
                                                      'scale(' +
                                                      printLogoScale +
                                                      ')',
                                                   transformOrigin:
                                                      'bottom right',
                                                }}
                                             >
                                                <img
                                                   src='/Logo%20price.png'
                                                   alt='ТопФиш'
                                                   className='w-full h-auto object-contain'
                                                   style={{
                                                      filter: isEco
                                                         ? 'invert(1)'
                                                         : 'none',
                                                   }}
                                                />
                                             </div>
                                          )}
                                       </div>
                                    )
                                 })}
                              </div>
                           </div>
                        )
                     }

                     // 2. Оборотная сторона (зеркальная по колонкам для идеального двустороннего совмещения при резке)
                     if (needBack) {
                        const numRows = Math.ceil(batchTags.length / 2)
                        const backSlots: {
                           tag: PriceTagItem | null
                           key: string
                        }[] = []
                        for (let r = 0; r < numRows; r++) {
                           const leftTag = batchTags[r * 2 + 1] || null // был справа на лице -> слева на обороте
                           const rightTag = batchTags[r * 2] || null // был слева на лице -> справа на обороте
                           backSlots.push({
                              tag: leftTag,
                              key: 'back_' + b + '_r' + r + '_c0',
                           })
                           backSlots.push({
                              tag: rightTag,
                              key: 'back_' + b + '_r' + r + '_c1',
                           })
                        }

                        pages.push(
                           <div
                              key={'back_page_' + b}
                              className='print-page-wrapper'
                           >
                              <div className='print-tags-grid grid grid-cols-2 gap-2 justify-center'>
                                 {backSlots.map((slot) => {
                                    if (!slot.tag) {
                                       return (
                                          <div
                                             key={slot.key}
                                             className='print-tag-card-back opacity-0'
                                             style={{
                                                width: '100mm',
                                                height: '60mm',
                                             }}
                                          />
                                       )
                                    }
                                    const bTag = slot.tag
                                    const procBadge =
                                       bTag.processingType === 'CUSTOM'
                                          ? bTag.customProcessingText || 'ТОП'
                                          : PROCESSING_TYPES[
                                               bTag.processingType
                                            ]?.badgeText || ''
                                    const code =
                                       (bTag.productCode || '').trim() || '—'
                                    const cleanWeight = formatWeightText(
                                       bTag.weight
                                    )

                                    return (
                                       <div
                                          key={slot.key}
                                          className='print-tag-card-back'
                                          style={{
                                             width: '100mm',
                                             height: '60mm',
                                             fontFamily: '"Onest", sans-serif',
                                          }}
                                       >
                                          {/* Верхняя строка: Название + вид обработки */}
                                          <div
                                             className='flex items-center justify-between border-b border-slate-300 pb-1'
                                             style={{ lineHeight: 1.1 }}
                                          >
                                             <div className='font-bold text-slate-800 uppercase text-[12px] truncate max-w-[75%]'>
                                                <span>{bTag.title}</span>
                                                {bTag.description && (
                                                   <span className='text-slate-500 font-semibold ml-1'>
                                                      ({bTag.description})
                                                   </span>
                                                )}
                                             </div>
                                             <div className='font-black text-slate-700 text-[12px] uppercase shrink-0'>
                                                {procBadge}
                                             </div>
                                          </div>

                                          {/* Центр: Огромный код для весов */}
                                          <div className='flex flex-col items-center justify-center my-auto text-center'>
                                             <div className='text-[9px] font-bold text-slate-500 uppercase tracking-widest'>
                                                КОД ДЛЯ ВЕСОВ / PLU
                                             </div>
                                             <div
                                                className='font-black text-slate-900 tracking-wider leading-none'
                                                style={{
                                                   fontSize:
                                                      code.length <= 4
                                                         ? '48px'
                                                         : code.length <= 6
                                                           ? '38px'
                                                           : '28px',
                                                }}
                                             >
                                                {code}
                                             </div>
                                          </div>

                                          {/* Нижняя строка: ТопФиш + цена */}
                                          <div
                                             className='flex items-center justify-between border-t border-slate-300 pt-1 text-[11px]'
                                             style={{ lineHeight: 1.1 }}
                                          >
                                             <div className='font-extrabold text-slate-400 tracking-wider uppercase'>
                                                ТОПФИШ
                                             </div>
                                             <div className='font-bold text-slate-800'>
                                                <span>
                                                   {bTag.price}{' '}
                                                   {bTag.currency || '₽'}
                                                </span>
                                                {cleanWeight && (
                                                   <span className='text-slate-500 font-medium ml-1'>
                                                      / {cleanWeight}
                                                   </span>
                                                )}
                                             </div>
                                          </div>
                                       </div>
                                    )
                                 })}
                              </div>
                           </div>
                        )
                     }
                  }

                  return pages
               })()}
            </div>
         </div>
      </div>
   )
}
