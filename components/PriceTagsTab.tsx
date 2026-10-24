'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
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
  Image as ImageIcon,
  CheckCircle2,
  Layers,
  Search,
  Upload,
  X,
  FileSpreadsheet,
} from 'lucide-react';

export interface PriceTagItem {
  id: string;
  title: string;
  description: string;
  weight: string;
  price: string;
  currency: string;
  processingType: 'XK' | 'GK' | 'SS' | 'VYAL' | 'CUSTOM';
  customProcessingText?: string;
  customColorStart?: string;
  customColorEnd?: string;
  textureMode: 'auto' | 'solid_blue' | 'xk' | 'gk' | 'ss' | 'vyal' | 'solid' | 'custom';
  customTextureUrl?: string;
  isItalic: boolean;
  underlineDescription: boolean;
  showLogo: boolean;
  titleFontSize: number; // 0 for auto
  priceFontSize: number; // 0 for auto
}

export interface ProcessingConfig {
  code: 'XK' | 'GK' | 'SS' | 'VYAL';
  label: string;
  badgeText: string;
  colorStart: string;
  colorEnd: string;
  textureUrl: string;
  description: string;
}

export const PROCESSING_TYPES: Record<'XK' | 'GK' | 'SS' | 'VYAL', ProcessingConfig> = {
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
};

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
  titleFontSize: 0,
  priceFontSize: 0,
};

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
      titleFontSize: 0,
      priceFontSize: 0,
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
      isItalic: false,
      underlineDescription: true,
      showLogo: true,
      titleFontSize: 0,
      priceFontSize: 0,
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
      textureMode: 'solid_blue',
      isItalic: true,
      underlineDescription: true,
      showLogo: true,
      titleFontSize: 0,
      priceFontSize: 0,
    },
  },
  {
    name: '4. Сиг • 3333₽ (100г.) • ВЯЛ',
    tag: {
      title: 'СИГ',
      description: '',
      weight: '100г.',
      price: '3333',
      currency: '₽',
      processingType: 'VYAL',
      textureMode: 'auto',
      isItalic: true,
      underlineDescription: true,
      showLogo: true,
      titleFontSize: 0,
      priceFontSize: 0,
    },
  },
];

interface PriceTagsTabProps {
  catalogItems?: any[];
}

export default function PriceTagsTab({ catalogItems = [] }: PriceTagsTabProps) {
  const [currentTag, setCurrentTag] = useState<PriceTagItem>(DEFAULT_TAG);
  const [printQueue, setPrintQueue] = useState<PriceTagItem[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [printLayoutMode, setPrintLayoutMode] = useState<'color' | 'eco'>('color');
  const [printCardsPerPage, setPrintCardsPerPage] = useState<6 | 8>(6);

  // Скрытый Canvas для генерации и скачивания PNG
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCardRef = useRef<HTMLDivElement | null>(null);

  // Кешированные изображения для Canvas
  const loadedImagesRef = useRef<{ [url: string]: HTMLImageElement }>({});

  // Получить конфигурацию обработки
  const currentProcConfig = useMemo(() => {
    if (currentTag.processingType !== 'CUSTOM') {
      return PROCESSING_TYPES[currentTag.processingType];
    }
    return {
      code: 'CUSTOM' as any,
      label: 'Свой вид',
      badgeText: currentTag.customProcessingText || 'ТОП',
      colorStart: currentTag.customColorStart || '#2b81b0',
      colorEnd: currentTag.customColorEnd || '#a9e1ff',
      textureUrl: '/textures/xk.jpg',
      description: 'Пользовательский вид обработки',
    };
  }, [currentTag]);

  // Вычисляем URL фоновой текстуры
  const activeTextureUrl = useMemo(() => {
    if (currentTag.textureMode === 'custom' && currentTag.customTextureUrl) {
      return currentTag.customTextureUrl;
    }
    if (currentTag.textureMode === 'solid' || currentTag.textureMode === 'solid_blue') {
      return '';
    }
    if (currentTag.textureMode === 'auto') {
      return currentProcConfig.textureUrl;
    }
    return `/textures/${currentTag.textureMode}.jpg`;
  }, [currentTag.textureMode, currentTag.customTextureUrl, currentProcConfig]);

  // Функция для отрисовки ценника на Canvas
  const drawTagToCanvas = async (
    tag: PriceTagItem,
    targetCanvas: HTMLCanvasElement,
    scale: number = 1
  ): Promise<void> => {
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    const baseW = 1024;
    const baseH = 614;
    targetCanvas.width = baseW * scale;
    targetCanvas.height = baseH * scale;

    ctx.save();
    ctx.scale(scale, scale);

    // 1. Очистка и заливка темного фона по умолчанию
    ctx.fillStyle = '#171d41';
    ctx.fillRect(0, 0, baseW, baseH);

    // 2. Отрисовка фоновой текстуры
    const textureUrl =
      tag.textureMode === 'custom' && tag.customTextureUrl
        ? tag.customTextureUrl
        : (tag.textureMode === 'solid' || tag.textureMode === 'solid_blue')
        ? ''
        : tag.textureMode === 'auto'
        ? (tag.processingType === 'CUSTOM'
            ? '/textures/xk.jpg'
            : PROCESSING_TYPES[tag.processingType].textureUrl)
        : `/textures/${tag.textureMode}.jpg`;

    if (textureUrl) {
      try {
        let img = loadedImagesRef.current[textureUrl];
        if (!img) {
          img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            i.crossOrigin = 'anonymous';
            i.onload = () => resolve(i);
            i.onerror = () => reject();
            i.src = textureUrl;
          });
          loadedImagesRef.current[textureUrl] = img;
        }
        ctx.drawImage(img, 0, 0, baseW, baseH);
      } catch (e) {
        // Fallback если картинка не загрузилась
        ctx.fillStyle = '#161d36';
        ctx.fillRect(0, 0, baseW, baseH);
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
        : PROCESSING_TYPES[tag.processingType];

    // Форма шильдика: прямоугольник с закругленным правым верхним углом
    const badgeH = 148;
    const badgePaddingX = 46;
    // Оцениваем ширину текста
    ctx.font = '900 82px -apple-system, BlinkMacSystemFont, "Montserrat", "Arial Black", sans-serif';
    const textMetrics = ctx.measureText(proc.badgeText);
    const badgeW = Math.max(260, textMetrics.width + badgePaddingX * 2);
    const badgeTop = baseH - badgeH;
    const radius = 42;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, baseH);
    ctx.lineTo(0, badgeTop);
    ctx.lineTo(badgeW - radius, badgeTop);
    ctx.arcTo(badgeW, badgeTop, badgeW, badgeTop + radius, radius);
    ctx.lineTo(badgeW, baseH);
    ctx.closePath();

    // Градиент шильдика от темного к светлому слева направо
    const grad = ctx.createLinearGradient(0, 0, badgeW, 0);
    grad.addColorStop(0, proc.colorStart);
    grad.addColorStop(1, proc.colorEnd);
    ctx.fillStyle = grad;
    ctx.fill();

    // Текст шильдика
    ctx.fillStyle = '#151b32';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(proc.badgeText, badgeW / 2 - 4, badgeTop + badgeH / 2 + 2);
    ctx.restore();

    // 4. Отрисовка фирменного логотипа ТопФиш в правом нижнем углу
    if (tag.showLogo) {
      try {
        const logoUrl = '/Logo%20price.png';
        let logoImg = loadedImagesRef.current[logoUrl];
        if (!logoImg) {
          logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            i.crossOrigin = 'anonymous';
            i.onload = () => resolve(i);
            i.onerror = () => reject();
            i.src = logoUrl;
          });
          loadedImagesRef.current[logoUrl] = logoImg;
        }
        const logoW = 240;
        const logoH = (logoW * logoImg.height) / logoImg.width;
        ctx.drawImage(logoImg, baseW - logoW - 36, baseH - logoH - 28, logoW, logoH);
      } catch (e) {
        // Fallback текстовый логотип если картинка не найдена
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px serif';
        ctx.textAlign = 'right';
        ctx.fillText('ТОПФИШ', baseW - 40, baseH - 45);
        ctx.font = '12px sans-serif';
        ctx.fillText('КОПЧЕНАЯ РЫБА', baseW - 40, baseH - 28);
        ctx.restore();
      }
    }

    // 5. Отрисовка названия и описания (Сверху слева)
    ctx.save();
    const titleText = (tag.title || '').trim().toUpperCase();
    const descText = (tag.description || '').trim().toUpperCase();

    // Автоматический или ручной расчет размера шрифта
    let fontSize = tag.titleFontSize;
    if (!fontSize) {
      const fullLen = titleText.length + (descText ? descText.length + 3 : 0);
      if (fullLen <= 7) fontSize = 88;
      else if (fullLen <= 15) fontSize = 74;
      else if (fullLen <= 26) fontSize = 62;
      else if (fullLen <= 42) fontSize = 52;
      else fontSize = 44;
    }

    const fontStyle = tag.isItalic ? 'italic ' : '';
    ctx.font = `${fontStyle}800 ${fontSize}px -apple-system, BlinkMacSystemFont, "Montserrat", "Segoe UI", Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const maxTitleWidth = baseW - 90;
    const startX = 48;
    let currentY = 40;
    const lineHeight = fontSize * 1.14;

    // Формируем слова для переноса строк
    type WordToken = { text: string; isDesc: boolean };
    const tokens: WordToken[] = [];
    titleText.split(/\s+/).filter(Boolean).forEach((w) => tokens.push({ text: w, isDesc: false }));

    if (descText) {
      const descWords = descText.split(/\s+/).filter(Boolean);
      descWords.forEach((w, idx) => {
        let t = w;
        if (idx === 0) t = '(' + t;
        if (idx === descWords.length - 1) t = t + ')';
        tokens.push({ text: t, isDesc: true });
      });
    }

    // Разбивка на строки по ширине
    const lines: WordToken[][] = [];
    let curLine: WordToken[] = [];
    let curWidth = 0;

    for (const token of tokens) {
      const tokenWidth = ctx.measureText(token.text + ' ').width;
      if (curLine.length > 0 && curWidth + tokenWidth > maxTitleWidth) {
        lines.push(curLine);
        curLine = [token];
        curWidth = tokenWidth;
      } else {
        curLine.push(token);
        curWidth += tokenWidth;
      }
    }
    if (curLine.length > 0) lines.push(curLine);

    // Отрисовка строк
    lines.forEach((line) => {
      let x = startX;
      line.forEach((token) => {
        const textToDraw = token.text;
        const w = ctx.measureText(textToDraw).width;

        ctx.fillText(textToDraw, x, currentY);

        // Подчеркивание для описания в скобках
        if (token.isDesc && tag.underlineDescription) {
          ctx.save();
          ctx.fillStyle = '#ffffff';
          const lineY = currentY + fontSize * 1.05;
          const lineThickness = Math.max(3, Math.round(fontSize * 0.055));
          ctx.fillRect(x, lineY, w, lineThickness);
          ctx.restore();
        }

        x += w + ctx.measureText(' ').width;
      });
      currentY += lineHeight;
    });
    ctx.restore();

    // 6. Отрисовка ЦЕНЫ и ВЕСА
    ctx.save();
    const priceVal = (tag.price || '0').trim();
    const curr = tag.currency || '₽';
    const priceStr = `${priceVal}${curr}`;

    let priceSize = tag.priceFontSize;
    if (!priceSize) {
      priceSize = priceStr.length > 6 ? 135 : 158;
    }

    ctx.font = `900 ${priceSize}px -apple-system, BlinkMacSystemFont, "Montserrat", "Segoe UI", Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const priceMetrics = ctx.measureText(priceStr);
    const priceW = priceMetrics.width;

    // Рассчитываем горизонтальное положение цены (по центру с учетом бейджа веса)
    const weightVal = (tag.weight || '').trim();
    let weightPillW = 0;
    let formattedWeight = weightVal;
    if (weightVal) {
      if (!formattedWeight.startsWith('(') && !formattedWeight.endsWith(')')) {
        formattedWeight = `(${formattedWeight})`;
      }
      ctx.save();
      ctx.font = '700 32px -apple-system, BlinkMacSystemFont, "Montserrat", sans-serif';
      const wMetrics = ctx.measureText(formattedWeight);
      weightPillW = wMetrics.width + 30; // 15px padding each side
      ctx.restore();
    }

    const totalGroupW = priceW + (weightVal ? weightPillW + 16 : 0);
    // Смещение цены вправо относительно центра для баланса с шильдиком слева
    const rightOffset = 115;
    const groupStartX = Math.min(baseW - totalGroupW - 40, Math.max(260, (baseW - totalGroupW) / 2 + rightOffset));
    const priceY = 368;

    // Отрисовываем цену
    ctx.fillText(priceStr, groupStartX, priceY);

    // 7. Отрисовка ВЕСА (справа от цены сверху)
    if (weightVal) {
      const weightX = groupStartX + priceW + 16;
      // Вверху относительно цены:
      const weightY = priceY - priceSize * 0.42;

      ctx.save();
      ctx.font = '700 30px -apple-system, BlinkMacSystemFont, "Montserrat", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const pillH = 46;
      const pillRadius = 23;

      // Овальная рамка
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 2.5;
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(weightX, weightY - pillH / 2, weightPillW, pillH, pillRadius);
      } else {
        ctx.rect(weightX, weightY - pillH / 2, weightPillW, pillH);
      }
      ctx.stroke();

      // Текст внутри рамки
      ctx.fillText(formattedWeight, weightX + weightPillW / 2, weightY + 1);
      ctx.restore();
    }

    ctx.restore();
    ctx.restore(); // Final pop of scale
  };

  // Перерисовка Canvas при изменении параметров
  useEffect(() => {
    if (canvasRef.current) {
      drawTagToCanvas(currentTag, canvasRef.current, 1);
    }
  }, [currentTag, currentProcConfig, activeTextureUrl]);

  // Быстрое скачивание PNG
  const handleDownloadPNG = async (scale: number = 1) => {
    try {
      const offCanvas = document.createElement('canvas');
      await drawTagToCanvas(currentTag, offCanvas, scale);
      const dataUrl = offCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      const safeTitle = (currentTag.title || 'Ценник').replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_');
      const safeType = currentTag.processingType;
      const resSuffix = scale > 1 ? '_HD' : '';
      link.download = `Ценник_${safeTitle}_${safeType}${resSuffix}.png`;
      link.href = dataUrl;
      link.click();
      toast.success(
        scale > 1
          ? 'Ценник скачан в Ultra HD качестве (2048×1228)!'
          : 'Ценник скачан (1024×614)!'
      );
    } catch (e) {
      console.error(e);
      toast.error('Ошибка при генерации изображения');
    }
  };

  // Копирование картинки в буфер обмена
  const handleCopyImage = async () => {
    try {
      const offCanvas = document.createElement('canvas');
      await drawTagToCanvas(currentTag, offCanvas, 1);
      offCanvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setIsCopied(true);
          toast.success('Изображение скопировано в буфер обмена!');
          setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
          toast.error('Ваш браузер заблокировал копирование картинки. Используйте Скачать PNG.');
        }
      }, 'image/png');
    } catch (e) {
      toast.error('Не удалось скопировать изображение');
    }
  };

  // Добавление текущего ценника в очередь печати
  const handleAddToQueue = () => {
    const newItem: PriceTagItem = {
      ...currentTag,
      id: `tag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    setPrintQueue((prev) => [...prev, newItem]);
    toast.success(`Ценник «${currentTag.title}» добавлен в очередь на печать!`);
  };

  // Добавление всех запланированных позиций из каталога/недели
  const handleAddAllFromCatalog = () => {
    if (!catalogItems || catalogItems.length === 0) {
      toast.error('В текущем плане нет позиций');
      return;
    }

    const newTags: PriceTagItem[] = catalogItems
      .filter((i) => i.productName && !i.isDeleted)
      .map((item, idx) => {
        const parsed = parseProductText(item.productName);
        return {
          id: `batch_${Date.now()}_${idx}`,
          title: parsed.title,
          description: parsed.description,
          weight: '100г',
          price: item.price ? String(Math.round(item.price)) : '0',
          currency: '₽',
          processingType: parsed.procType,
          textureMode: 'auto',
          isItalic: true,
          underlineDescription: true,
          showLogo: true,
          titleFontSize: 0,
          priceFontSize: 0,
        };
      });

    setPrintQueue((prev) => [...prev, ...newTags]);
    toast.success(`Добавлено ${newTags.length} ценников из плана цеха!`);
  };

  // Удаление ценника из очереди
  const handleRemoveFromQueue = (id: string) => {
    setPrintQueue((prev) => prev.filter((t) => t.id !== id));
  };

  // Загрузка ценника из очереди в редактор
  const handleLoadFromQueue = (tag: PriceTagItem) => {
    setCurrentTag({ ...tag });
    toast.success(`Ценник «${tag.title}» загружен в редактор`);
  };

  // Печать текущего ценника
  const handlePrintSingle = () => {
    window.print();
  };

  // Загрузка своего фона
  const handleUploadCustomTexture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите файл изображения');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCurrentTag((prev) => ({
        ...prev,
        textureMode: 'custom',
        customTextureUrl: dataUrl,
      }));
      toast.success('Пользовательский фон успешно загружен!');
    };
    reader.readAsDataURL(file);
  };

  // Умный парсер названия товара
  const parseProductText = (rawName: string) => {
    let text = rawName.trim();
    let procType: 'XK' | 'GK' | 'SS' | 'VYAL' = 'XK';

    // Определение вида обработки
    const lower = text.toLowerCase();
    if (lower.includes('г/к') || lower.includes('г.к.') || lower.includes('горяч')) {
      procType = 'GK';
    } else if (lower.includes('с/с') || lower.includes('слабосол') || lower.includes('солен')) {
      procType = 'SS';
    } else if (lower.includes('вял') || lower.includes('вялен')) {
      procType = 'VYAL';
    } else {
      procType = 'XK'; // По умолчанию Х/К
    }

    // Удаляем маркер обработки из названия
    text = text
      .replace(/(?:^|\s)(?:х\/к|х\.к\.|г\/к|г\.к\.|с\/с|с\.с\.|вял\.?|вяленая|вяленый)(?:$|\s)/gi, ' ')
      .trim();

    // Извлекаем описание в скобках, если есть
    let title = text;
    let description = '';

    const parenMatch = text.match(/\((.*?)\)/);
    if (parenMatch) {
      description = parenMatch[1].trim();
      title = text.replace(/\(.*?\)/, '').trim();
    } else {
      // Проверяем распространенные суффиксы: б/г, с/г, кусок, пласт, филе
      const subMatch = text.match(/(?:б\/г|с\/г|без головы|кусок|пласт|филе|нарезка|ломтики|тушка)/i);
      if (subMatch && subMatch.index && subMatch.index > 0) {
        title = text.substring(0, subMatch.index).trim();
        description = text.substring(subMatch.index).trim();
      }
    }

    return { title: title.toUpperCase(), description: description.toUpperCase(), procType };
  };

  // При выборе товара из каталога
  const handleSelectCatalogItem = (item: any) => {
    const parsed = parseProductText(item.productName || '');
    setCurrentTag((prev) => ({
      ...prev,
      title: parsed.title,
      description: parsed.description,
      price: item.price ? String(Math.round(item.price)) : prev.price,
      processingType: parsed.procType,
      textureMode: 'auto',
    }));
    setIsCatalogOpen(false);
    toast.success(`Выбран товар: ${parsed.title}`);
  };

  // Фильтрация позиций каталога для модалки
  const filteredCatalogItems = useMemo(() => {
    if (!catalogItems) return [];
    if (!catalogSearch.trim()) return catalogItems.slice(0, 50);
    const q = catalogSearch.toLowerCase();
    return catalogItems.filter((i) => i.productName && i.productName.toLowerCase().includes(q));
  }, [catalogItems, catalogSearch]);

  return (
    <div className="space-y-6">
      {/* Скрытый Canvas для генерации PNG */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Верхний заголовок и панель быстрых действий */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/20 shrink-0">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Генератор ценников
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-teal-100 text-teal-800">
                PRO 1024×614
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Создание фирменных ценников ТопФиш (Х/К, Г/К, С/С, ВЯЛ) с печатью и экспортом в HD
            </p>
          </div>
        </div>

        {/* Кнопки экспорта и печати */}
        <div className="flex flex-wrap items-center gap-2.5">
          {catalogItems.length > 0 && (
            <button
              type="button"
              onClick={() => setIsCatalogOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4 text-slate-500" />
              <span>Выбрать из прайса ({catalogItems.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAddToQueue}
            className="px-3.5 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-teal-600" />
            <span>В очередь на печать</span>
            {printQueue.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-teal-600 text-white text-[10px]">
                {printQueue.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleDownloadPNG(1)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-teal-400" />
            <span>Скачать PNG</span>
          </button>

          <button
            type="button"
            onClick={handlePrintSingle}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-md shadow-teal-600/20 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Печать</span>
          </button>
        </div>
      </div>

      {/* Готовые пресеты образцов из фото пользователя */}
      <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/60">
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Образцы ценников (как на ваших примерах):
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {SAMPLE_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setCurrentTag({ ...preset.tag, id: 'current' });
                toast.success(`Загружен пресет: ${preset.name}`);
              }}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100/80 border border-slate-200 text-left transition shadow-2xs hover:border-teal-400 group cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 group-hover:text-teal-700">
                <span className="truncate">{preset.tag.title} {preset.tag.description ? `(${preset.tag.description})` : ''}</span>
                <span className="shrink-0 text-slate-400 group-hover:text-teal-600 ml-1">
                  {preset.tag.price}₽
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      preset.tag.processingType === 'CUSTOM'
                        ? '#2b81b0'
                        : PROCESSING_TYPES[preset.tag.processingType].colorStart,
                  }}
                />
                <span>Вид: {preset.tag.processingType}</span>
                {preset.tag.weight && (
                  <span className="text-slate-400">• {preset.tag.weight}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Основная сетка: Редактор слева + Интерактивный предпросмотр справа */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ЛЕВАЯ КОЛОНКА: Панель параметров ценника (5 колонок) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-600" />
                <span>Параметры ценника</span>
              </h3>
              <button
                type="button"
                onClick={() => setCurrentTag(DEFAULT_TAG)}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Сбросить</span>
              </button>
            </div>

            {/* НАЗВАНИЕ ТОВАРА */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                НАЗВАНИЕ (ОСНОВНОЕ):
              </label>
              <input
                type="text"
                value={currentTag.title}
                onChange={(e) =>
                  setCurrentTag((prev) => ({ ...prev, title: e.target.value.toUpperCase() }))
                }
                placeholder="КОЛБАСА, ТЕРПУГ, СКУМБРИЯ, СИГ"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
              />
            </div>

            {/* ОПИСАНИЕ (В СКОБКАХ) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  ОПИСАНИЕ (БУДЕТ В СКОБКАХ):
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentTag.underlineDescription}
                    onChange={(e) =>
                      setCurrentTag((prev) => ({
                        ...prev,
                        underlineDescription: e.target.checked,
                      }))
                    }
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>Подчеркивать</span>
                </label>
              </div>
              <input
                type="text"
                value={currentTag.description}
                onChange={(e) =>
                  setCurrentTag((prev) => ({
                    ...prev,
                    description: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="ФОРЕЛЬ, ТУНЕЦ, МАСЛЯНАЯ / БЕЗ ГОЛОВЫ"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Будет автоматически заключено в скобки, например: ({currentTag.description || 'ОПИСАНИЕ'})
              </span>
            </div>

            {/* ВИД ОБРАБОТКИ (Х/К, Г/К, С/С, ВЯЛ) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                ВИД ОБРАБОТКИ:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {(['XK', 'GK', 'SS', 'VYAL'] as const).map((code) => {
                  const item = PROCESSING_TYPES[code];
                  const isSelected = currentTag.processingType === code;
                  return (
                    <button
                      key={code}
                      type="button"
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
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm">{item.badgeText}</span>
                        {isSelected && <Check className="w-4 h-4 text-teal-400" />}
                      </div>

                      {/* Индикатор градиента */}
                      <div
                        className="h-2 rounded-full mt-2 w-full"
                        style={{
                          background: `linear-gradient(to right, ${item.colorStart}, ${item.colorEnd})`,
                        }}
                      />
                      <span
                        className={`text-[10px] mt-1.5 block ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {item.label.split(' ')[1]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Возможность выбрать свой вид обработки */}
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentTag((prev) => ({
                      ...prev,
                      processingType: prev.processingType === 'CUSTOM' ? 'XK' : 'CUSTOM',
                      customProcessingText: prev.customProcessingText || 'СВЕЖ',
                    }))
                  }
                  className="text-[11px] font-bold text-teal-700 hover:text-teal-800 underline cursor-pointer"
                >
                  {currentTag.processingType === 'CUSTOM' ? '← Стандартные виды' : '+ Свой вид обработки'}
                </button>
              </div>

              {currentTag.processingType === 'CUSTOM' && (
                <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Текст шильдика:
                    </label>
                    <input
                      type="text"
                      value={currentTag.customProcessingText || ''}
                      onChange={(e) =>
                        setCurrentTag((prev) => ({
                          ...prev,
                          customProcessingText: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="СВЕЖ / АКЦИЯ / ФИЛЕ"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Цвет начала:</label>
                      <input
                        type="color"
                        value={currentTag.customColorStart || '#2b81b0'}
                        onChange={(e) =>
                          setCurrentTag((prev) => ({ ...prev, customColorStart: e.target.value }))
                        }
                        className="w-full h-8 rounded border border-slate-300 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Цвет конца:</label>
                      <input
                        type="color"
                        value={currentTag.customColorEnd || '#a9e1ff'}
                        onChange={(e) =>
                          setCurrentTag((prev) => ({ ...prev, customColorEnd: e.target.value }))
                        }
                        className="w-full h-8 rounded border border-slate-300 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ЦЕНА ЗА ВЕС И ВЕС */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* ЦЕНА ЗА ВЕС */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ЦЕНА:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={currentTag.price}
                    onChange={(e) =>
                      setCurrentTag((prev) => ({ ...prev, price: e.target.value }))
                    }
                    placeholder="3333"
                    className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-extrabold text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  />
                  <span className="absolute right-3 top-2.5 text-base font-extrabold text-slate-400">
                    {currentTag.currency}
                  </span>
                </div>
              </div>

              {/* ВЕС (по умолчанию 100г) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ВЕС:
                </label>
                <input
                  type="text"
                  value={currentTag.weight}
                  onChange={(e) =>
                    setCurrentTag((prev) => ({ ...prev, weight: e.target.value }))
                  }
                  placeholder="100г, 1кг, 1 шт"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Быстрые кнопки веса */}
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400 mr-1">Быстрый вес:</span>
                {['100г.', '100г', '150г', '200г', '250г', '500г', '1 кг', '1 шт'].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setCurrentTag((prev) => ({ ...prev, weight: w }))}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                      currentTag.weight === w
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {w}
                  </button>
                ))}
                {currentTag.weight && (
                  <button
                    type="button"
                    onClick={() => setCurrentTag((prev) => ({ ...prev, weight: '' }))}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    Без веса
                  </button>
                )}
              </div>
            </div>

            {/* НАСТРОЙКИ ФОНА И ТЕКСТУРЫ */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                ФОН КАРТОЧКИ:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentTag((prev) => ({ ...prev, textureMode: 'auto' }))}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer text-xs font-bold ${
                    currentTag.textureMode === 'auto'
                      ? 'border-teal-600 bg-teal-50 text-teal-800'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  ⚡ Авто (по виду)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTag((prev) => ({ ...prev, textureMode: 'solid_blue' }))}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer text-xs font-bold ${
                    currentTag.textureMode === 'solid_blue'
                      ? 'border-teal-600 bg-teal-50 text-teal-800'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  🔷 Просто синий
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTag((prev) => ({ ...prev, textureMode: 'xk' }))}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer text-xs font-bold ${
                    currentTag.textureMode === 'xk'
                      ? 'border-teal-600 bg-teal-50 text-teal-800'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  ХК (волны)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTag((prev) => ({ ...prev, textureMode: 'gk' }))}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer text-xs font-bold ${
                    currentTag.textureMode === 'gk'
                      ? 'border-teal-600 bg-teal-50 text-teal-800'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  ГК (дым)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTag((prev) => ({ ...prev, textureMode: 'ss' }))}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer text-xs font-bold ${
                    currentTag.textureMode === 'ss'
                      ? 'border-teal-600 bg-teal-50 text-teal-800'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  СС (чешуя)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTag((prev) => ({ ...prev, textureMode: 'vyal' }))}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer text-xs font-bold ${
                    currentTag.textureMode === 'vyal'
                      ? 'border-teal-600 bg-teal-50 text-teal-800'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  ВЯЛ (минерал)
                </button>
                <label className="p-2 rounded-xl border border-dashed border-slate-300 hover:border-teal-500 bg-white hover:bg-teal-50 text-center transition cursor-pointer text-xs font-bold text-slate-700 flex items-center justify-center gap-1">
                  <Upload className="w-3.5 h-3.5 text-teal-600" />
                  <span>Свой фон</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadCustomTexture}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* ДОПОЛНИТЕЛЬНЫЕ ПЕРЕКЛЮЧАТЕЛИ */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer">
                <span>Курсив для названия (как на образцах)</span>
                <input
                  type="checkbox"
                  checked={currentTag.isItalic}
                  onChange={(e) =>
                    setCurrentTag((prev) => ({ ...prev, isItalic: e.target.checked }))
                  }
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer">
                <span>Отображать логотип «ТопФиш»</span>
                <input
                  type="checkbox"
                  checked={currentTag.showLogo}
                  onChange={(e) =>
                    setCurrentTag((prev) => ({ ...prev, showLogo: e.target.checked }))
                  }
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
              </label>
            </div>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Интерактивный Live Preview ценника (7 колонок) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-teal-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  Живой предпросмотр (1024×614)
                </h3>
              </div>
              <span className="text-xs text-slate-400">Точное соответствие при печати</span>
            </div>

            {/* САМА КАРТОЧКА ЦЕННИКА (В масштабе, 100% точный вид) */}
            <div className="w-full overflow-hidden rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-300/80 bg-slate-900">
              <div
                ref={previewCardRef}
                className="relative w-full aspect-[1024/614] select-none overflow-hidden"
                style={{
                  backgroundColor: '#171d41',
                  backgroundImage: activeTextureUrl ? `url(${activeTextureUrl})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* 1. Верхний текст: Название и Описание */}
                <div
                  className="absolute left-[4.8%] top-[5.5%] max-w-[90%] text-white"
                  style={{
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "Montserrat", "Segoe UI", Arial, sans-serif',
                    fontStyle: currentTag.isItalic ? 'italic' : 'normal',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    lineHeight: 1.15,
                  }}
                >
                  <div className="text-[clamp(18px,4.5vw,46px)] tracking-tight">
                    <span>{currentTag.title || 'НАЗВАНИЕ ТОВАРА'}</span>
                    {currentTag.description && (
                      <span className="ml-2">
                        (
                        <span
                          style={{
                            textDecoration: currentTag.underlineDescription
                              ? 'underline'
                              : 'none',
                            textUnderlineOffset: '4px',
                            textDecorationThickness: '3px',
                          }}
                        >
                          {currentTag.description}
                        </span>
                        )
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. ЦЕНА И ВЕС ПО ЦЕНТРУ */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none pt-12 pl-[18%]">
                  <div className="flex items-start justify-center">
                    <span
                      className="text-white font-black tracking-tight"
                      style={{
                        fontSize: 'clamp(36px,10.5vw,110px)',
                        fontFamily:
                          '-apple-system, BlinkMacSystemFont, "Montserrat", "Segoe UI", Arial, sans-serif',
                        lineHeight: 1,
                      }}
                    >
                      {currentTag.price || '0'}
                      {currentTag.currency}
                    </span>

                    {/* ВЕС СПРАВА ОТ ЦЕНЫ СВЕРХУ */}
                    {currentTag.weight && (
                      <div
                        className="ml-2 sm:ml-3 -mt-1 sm:-mt-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-white/45 text-white/90 font-bold tracking-wide"
                        style={{
                          fontSize: 'clamp(10px,2.2vw,22px)',
                          lineHeight: 1,
                        }}
                      >
                        {currentTag.weight.startsWith('(')
                          ? currentTag.weight
                          : `(${currentTag.weight})`}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. ШИЛЬДИК ОБРАБОТКИ В ЛЕВОМ НИЖНЕМ УГЛУ */}
                <div
                  className="absolute left-0 bottom-0 flex items-center justify-center font-black"
                  style={{
                    height: '24%',
                    minWidth: '26%',
                    paddingLeft: '3.5%',
                    paddingRight: '3.5%',
                    borderTopRightRadius: '32px',
                    background: `linear-gradient(to right, ${currentProcConfig.colorStart}, ${currentProcConfig.colorEnd})`,
                    color: '#151b32',
                    fontSize: 'clamp(18px,5.5vw,56px)',
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "Montserrat", "Arial Black", sans-serif',
                    lineHeight: 1,
                  }}
                >
                  {currentProcConfig.badgeText}
                </div>

                {/* 4. ЛОГОТИП ТОПФИШ В ПРАВОМ НИЖНЕМ УГЛУ */}
                {currentTag.showLogo && (
                  <div className="absolute right-[3.6%] bottom-[4.8%] w-[23%] max-w-[240px] pointer-events-none">
                    <img
                      src="/Logo%20price.png"
                      alt="ТопФиш Копченая рыба"
                      className="w-full h-auto object-contain drop-shadow-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Кнопки действий под карточкой предпросмотра */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleDownloadPNG(1)}
                className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-teal-400" />
                <span>PNG (1x)</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadPNG(2)}
                className="px-3 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                title="Экспорт в разрешении 2048x1228 для печати"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>PNG Ultra HD</span>
              </button>

              <button
                type="button"
                onClick={handleCopyImage}
                className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Скопировано!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>В буфер</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleAddToQueue}
                className="px-3 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-teal-600" />
                <span>В очередь</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ОЧЕРЕДЬ НА ПЕЧАТЬ (ПАКЕТНАЯ ПЕЧАТЬ НА А4) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-teal-600" />
              <h3 className="font-extrabold text-slate-900 text-lg">
                Очередь ценников на печать (Лист А4)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                {printQueue.length} шт.
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Сформируйте список ценников и распечатайте их сеткой на листах А4 (6 или 8 штук на страницу)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {catalogItems.length > 0 && (
              <button
                type="button"
                onClick={handleAddAllFromCatalog}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                <span>+ Добавить весь план недели ({catalogItems.length})</span>
              </button>
            )}

            {printQueue.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setPrintQueue([])}
                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Очистить</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-md shadow-teal-600/20 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Распечатать все ({printQueue.length})</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Настройки печати сетки */}
        {printQueue.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
            <div className="flex items-center gap-4">
              <span className="text-slate-400">Формат сетки:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="cardsPerPage"
                  checked={printCardsPerPage === 6}
                  onChange={() => setPrintCardsPerPage(6)}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span>6 шт на лист А4 (2×3, крупнее)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="cardsPerPage"
                  checked={printCardsPerPage === 8}
                  onChange={() => setPrintCardsPerPage(8)}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span>8 шт на лист А4 (2×4, компактно)</span>
              </label>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-slate-400">Режим расхода краски:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="printLayoutMode"
                  checked={printLayoutMode === 'color'}
                  onChange={() => setPrintLayoutMode('color')}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span>Полноцветный (с текстурой)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="printLayoutMode"
                  checked={printLayoutMode === 'eco'}
                  onChange={() => setPrintLayoutMode('eco')}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span>Эконом (белый фон)</span>
              </label>
            </div>
          </div>
        )}

        {/* Список ценников в очереди */}
        {printQueue.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Printer className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-600">Очередь печати пуста</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Нажмите кнопку «В очередь на печать» в редакторе выше или «+ Добавить весь план недели»,
              чтобы отправить сразу несколько ценников на печать на лист А4.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {printQueue.map((tag) => {
              const proc =
                tag.processingType === 'CUSTOM'
                  ? {
                      badgeText: tag.customProcessingText || 'ТОП',
                      colorStart: tag.customColorStart || '#2b81b0',
                      colorEnd: tag.customColorEnd || '#a9e1ff',
                    }
                  : PROCESSING_TYPES[tag.processingType];

              const tagTexture =
                tag.textureMode === 'custom' && tag.customTextureUrl
                  ? tag.customTextureUrl
                  : (tag.textureMode === 'solid' || tag.textureMode === 'solid_blue')
                  ? ''
                  : tag.textureMode === 'auto'
                  ? (tag.processingType === 'CUSTOM'
                      ? '/textures/xk.jpg'
                      : PROCESSING_TYPES[tag.processingType].textureUrl)
                  : `/textures/${tag.textureMode}.jpg`;

              return (
                <div
                  key={tag.id}
                  className="p-3 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs transition flex flex-col justify-between group"
                >
                  {/* Мини-превью */}
                  <div
                    className="relative w-full aspect-[1024/614] rounded-xl overflow-hidden mb-2.5"
                    style={{
                      backgroundColor: '#141b33',
                      backgroundImage: tagTexture ? `url(${tagTexture})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    <div className="absolute left-2 top-1.5 text-white font-extrabold text-[10px] leading-tight max-w-[85%] truncate">
                      {tag.title} {tag.description ? `(${tag.description})` : ''}
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center text-white font-black text-sm">
                      {tag.price}
                      {tag.currency}
                      {tag.weight && (
                        <span className="text-[8px] ml-1 text-white/70">({tag.weight})</span>
                      )}
                    </div>

                    <div
                      className="absolute left-0 bottom-0 text-[8px] font-black px-1.5 py-0.5 text-slate-900"
                      style={{
                        background: `linear-gradient(to right, ${proc.colorStart}, ${proc.colorEnd})`,
                        borderTopRightRadius: '8px',
                      }}
                    >
                      {proc.badgeText}
                    </div>
                  </div>

                  {/* Описание и кнопки управления */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <button
                      type="button"
                      onClick={() => handleLoadFromQueue(tag)}
                      className="font-bold text-teal-700 hover:text-teal-900 text-left truncate mr-2 cursor-pointer"
                    >
                      {tag.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromQueue(tag.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                      title="Удалить из очереди"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* МОДАЛЬНОЕ ОКНО ВЫБОРА ТОВАРА ИЗ ПЛАНА / КАТАЛОГА */}
      {isCatalogOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Шапка модалки */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Выбор товара из производственного плана
                  </h3>
                  <p className="text-xs text-slate-500">
                    Кликните по товару, чтобы автоматически подставить его название, цену и вид обработки
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCatalogOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Поле поиска */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Поиск по названию рыбы (сиг, скумбрия, терпуг, колбаса...)"
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Список товаров */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1 max-h-[50vh]">
              {filteredCatalogItems.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  Товары не найдены
                </div>
              ) : (
                filteredCatalogItems.map((item, idx) => {
                  const parsed = parseProductText(item.productName || '');
                  return (
                    <button
                      key={item.id || idx}
                      type="button"
                      onClick={() => handleSelectCatalogItem(item)}
                      className="w-full p-3 rounded-2xl border border-slate-200/80 hover:border-teal-400 hover:bg-teal-50/50 text-left transition flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-sm group-hover:text-teal-800">
                          {parsed.title} {parsed.description ? `(${parsed.description})` : ''}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          <span className="font-semibold text-teal-700">Вид: {parsed.procType}</span>
                          {item.category && <span>• {item.category}</span>}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-slate-900 text-sm group-hover:text-teal-700">
                          {item.price ? `${Math.round(item.price)} ₽` : '—'}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Подвал модалки */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCatalogOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ПЕЧАТНАЯ ВЕРСТКА ДЛЯ СЕТКИ НА А4 (Отображается только в окне печати @media print) */}
      <div className="hidden print:block print:w-full">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background: #fff !important;
              color: #000 !important;
            }
            @page {
              size: A4 portrait;
              margin: 8mm 6mm;
            }
            header, nav, main > *:not(.print-price-tags-sheet), .print\\:block {
              display: none !important;
            }
            .print-price-tags-sheet {
              display: block !important;
              width: 100% !important;
            }
            .print-tag-card {
              page-break-inside: avoid;
              break-inside: avoid;
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}} />

        <div className="print-price-tags-sheet">
          <div
            className={`grid gap-3 ${
              printCardsPerPage === 6 ? 'grid-cols-2' : 'grid-cols-2'
            }`}
          >
            {(printQueue.length > 0 ? printQueue : [currentTag]).map((tag, idx) => {
              const proc =
                tag.processingType === 'CUSTOM'
                  ? {
                      badgeText: tag.customProcessingText || 'ТОП',
                      colorStart: tag.customColorStart || '#2b81b0',
                      colorEnd: tag.customColorEnd || '#a9e1ff',
                    }
                  : PROCESSING_TYPES[tag.processingType];

              const tagTexture =
                printLayoutMode === 'eco'
                  ? ''
                  : tag.textureMode === 'custom' && tag.customTextureUrl
                  ? tag.customTextureUrl
                  : tag.textureMode === 'solid'
                  ? ''
                  : tag.textureMode === 'auto'
                  ? (tag.processingType === 'CUSTOM'
                      ? '/textures/xk.jpg'
                      : PROCESSING_TYPES[tag.processingType].textureUrl)
                  : `/textures/${tag.textureMode}.jpg`;

              const isEco = printLayoutMode === 'eco';

              return (
                <div
                  key={idx}
                  className="print-tag-card relative w-full aspect-[1024/614] border border-slate-400 rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: isEco ? '#ffffff' : '#141b33',
                    backgroundImage: tagTexture ? `url(${tagTexture})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    color: isEco ? '#000000' : '#ffffff',
                  }}
                >
                  {/* Название и описание */}
                  <div
                    className="absolute left-[4.8%] top-[5.5%] max-w-[90%]"
                    style={{
                      color: isEco ? '#000000' : '#ffffff',
                      fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Montserrat", "Segoe UI", Arial, sans-serif',
                      fontStyle: tag.isItalic ? 'italic' : 'normal',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      lineHeight: 1.15,
                    }}
                  >
                    <div className="text-[20px] tracking-tight">
                      <span>{tag.title}</span>
                      {tag.description && (
                        <span className="ml-2">
                          (
                          <span
                            style={{
                              textDecoration: tag.underlineDescription ? 'underline' : 'none',
                              textUnderlineOffset: '3px',
                            }}
                          >
                            {tag.description}
                          </span>
                          )
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Цена и вес */}
                  <div className="absolute inset-0 flex items-center justify-center pl-[18%]">
                    <div className="flex items-start justify-center">
                      <span
                        className="font-black tracking-tight"
                        style={{
                          fontSize: '56px',
                          color: isEco ? '#000000' : '#ffffff',
                          fontFamily:
                            '-apple-system, BlinkMacSystemFont, "Montserrat", "Segoe UI", Arial, sans-serif',
                          lineHeight: 1,
                        }}
                      >
                        {tag.price}
                        {tag.currency}
                      </span>
                      {tag.weight && (
                        <div
                          className="ml-2 -mt-1 px-2 py-0.5 rounded-full border border-slate-400 font-bold"
                          style={{
                            fontSize: '14px',
                            color: isEco ? '#333333' : 'rgba(255, 255, 255, 0.85)',
                          }}
                        >
                          {tag.weight.startsWith('(') ? tag.weight : `(${tag.weight})`}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Шильдик вида обработки */}
                  <div
                    className="absolute left-0 bottom-0 flex items-center justify-center font-black"
                    style={{
                      height: '24%',
                      minWidth: '26%',
                      paddingLeft: '3.5%',
                      paddingRight: '3.5%',
                      borderTopRightRadius: '24px',
                      background: `linear-gradient(to right, ${proc.colorStart}, ${proc.colorEnd})`,
                      color: '#151b32',
                      fontSize: '28px',
                      fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Montserrat", "Arial Black", sans-serif',
                      lineHeight: 1,
                    }}
                  >
                    {proc.badgeText}
                  </div>

                  {/* Логотип ТопФиш */}
                  {tag.showLogo && (
                    <div className="absolute right-[3.8%] bottom-[4.8%] w-[22%] max-w-[120px]">
                      <img
                        src="/Logo%20price.png"
                        alt="ТопФиш"
                        className="w-full h-auto object-contain"
                        style={{
                          filter: isEco ? 'invert(1)' : 'none',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
