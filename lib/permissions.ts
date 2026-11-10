import {
  Shield,
  UploadCloud,
  CheckSquare,
  ClipboardList,
  FlaskConical,
  PhoneCall,
  Wallet,
  ChefHat,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  Snowflake,
  Tag,
  type LucideIcon,
} from 'lucide-react';

export type TabId =
  | 'main_plan'
  | 'trial_novelties'
  | 'clients'
  | 'finance'
  | 'tech_cards'
  | 'stock_analytics'
  | 'monthly_plan'
  | 'inventory'
  | 'freezer'
  | 'price_tags';

export type PermissionId =
  | 'FULL_ACCESS'
  | 'UPLOAD_1C'
  | 'TOGGLE_PLAN'
  | 'ACCESS_MAIN_PLAN'
  | 'ACCESS_TRIAL_NOVELTIES'
  | 'MANAGE_CLIENTS'
  | 'ACCESS_FINANCE'
  | 'ACCESS_TECH_CARDS'
  | 'ACCESS_STOCK_ANALYTICS'
  | 'ACCESS_MONTHLY_PLAN'
  | 'ACCESS_INVENTORY'
  | 'ACCESS_FREEZER'
  | 'ACCESS_PRICE_TAGS';

export interface PermissionConfigItem {
  id: PermissionId;
  name: string;
  description: string;
  group: 'system' | 'section';
  tabId?: TabId;
  badgeClass: string;
  icon: LucideIcon;
}

export const PERMISSION_CONFIG: PermissionConfigItem[] = [
  {
    id: 'FULL_ACCESS',
    name: 'Полный доступ',
    description: 'Все функции, закрытие недель и управление ролями',
    group: 'system',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Shield,
  },
  {
    id: 'UPLOAD_1C',
    name: 'Загрузка файла 1С',
    description: 'Загрузка и пересчет прайс-листов 1С на неделю',
    group: 'system',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
    icon: UploadCloud,
  },
  {
    id: 'TOGGLE_PLAN',
    name: 'Отметка в плане',
    description: 'Отметка товаров в производственный план недели и лимитов',
    group: 'system',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: CheckSquare,
  },
  {
    id: 'ACCESS_MAIN_PLAN',
    name: 'Основной план производства',
    description: 'Доступ к разделу основного плана производства и чеклисту 1С',
    group: 'section',
    tabId: 'main_plan',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    icon: ClipboardList,
  },
  {
    id: 'ACCESS_TRIAL_NOVELTIES',
    name: 'Вторые новинки (Отработка)',
    description: 'Доступ к разделу экспериментальных новинок и отработки',
    group: 'section',
    tabId: 'trial_novelties',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: FlaskConical,
  },
  {
    id: 'MANAGE_CLIENTS',
    name: 'База обзвона (Клиенты)',
    description: 'Просмотр, редактирование и добавление клиентов для обзвона',
    group: 'section',
    tabId: 'clients',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: PhoneCall,
  },
  {
    id: 'ACCESS_FINANCE',
    name: 'Анализ финансов',
    description: 'Финансовая оценка складских остатков по оптовым ценам',
    group: 'section',
    tabId: 'finance',
    badgeClass: 'bg-green-100 text-green-800 border-green-200',
    icon: Wallet,
  },
  {
    id: 'ACCESS_TECH_CARDS',
    name: 'Тех. карты',
    description: 'Технологические карты, справочник и работа с партиями в цеху',
    group: 'section',
    tabId: 'tech_cards',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: ChefHat,
  },
  {
    id: 'ACCESS_STOCK_ANALYTICS',
    name: 'Аналитика склада',
    description: 'История загрузок 1С и динамика складских остатков',
    group: 'section',
    tabId: 'stock_analytics',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    icon: BarChart3,
  },
  {
    id: 'ACCESS_MONTHLY_PLAN',
    name: 'Месячный план',
    description: 'Месячные лимиты производства, спрос и контроль перебора',
    group: 'section',
    tabId: 'monthly_plan',
    badgeClass: 'bg-lime-100 text-lime-800 border-lime-200',
    icon: CalendarDays,
  },
  {
    id: 'ACCESS_INVENTORY',
    name: 'Инвентаризация',
    description: 'Сверка склада 1С, недостачи, излишки и загрузка документов',
    group: 'section',
    tabId: 'inventory',
    badgeClass: 'bg-violet-100 text-violet-800 border-violet-200',
    icon: ClipboardCheck,
  },
  {
    id: 'ACCESS_FREEZER',
    name: 'Заморозка',
    description: 'Остатки сырья на складе заморозки и себестоимость',
    group: 'section',
    tabId: 'freezer',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    icon: Snowflake,
  },
  {
    id: 'ACCESS_PRICE_TAGS',
    name: 'Ценники',
    description: 'Генератор и печать фирменных ценников ТопФиш',
    group: 'section',
    tabId: 'price_tags',
    badgeClass: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
    icon: Tag,
  },
];

export const SYSTEM_PERMISSIONS = PERMISSION_CONFIG.filter((p) => p.group === 'system');
export const SECTION_PERMISSIONS = PERMISSION_CONFIG.filter((p) => p.group === 'section');
export const ALL_PERMISSION_IDS = PERMISSION_CONFIG.map((p) => p.id);

export const TAB_PERMISSION_MAP: Record<TabId, PermissionId> = {
  main_plan: 'ACCESS_MAIN_PLAN',
  trial_novelties: 'ACCESS_TRIAL_NOVELTIES',
  clients: 'MANAGE_CLIENTS',
  finance: 'ACCESS_FINANCE',
  tech_cards: 'ACCESS_TECH_CARDS',
  stock_analytics: 'ACCESS_STOCK_ANALYTICS',
  monthly_plan: 'ACCESS_MONTHLY_PLAN',
  inventory: 'ACCESS_INVENTORY',
  freezer: 'ACCESS_FREEZER',
  price_tags: 'ACCESS_PRICE_TAGS',
};

