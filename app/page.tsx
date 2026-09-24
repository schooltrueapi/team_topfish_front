'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import AttentionBanner from '@/components/AttentionBanner';
import WeekConclusionBanner from '@/components/WeekConclusionBanner';
import Checklist, { PlanItem } from '@/components/Checklist';
import ReviewModal from '@/components/ReviewModal';
import AuditLogsDrawer from '@/components/AuditLogsDrawer';
import RolesModal from '@/components/RolesModal';
import UploadModal from '@/components/UploadModal';
import UploadDiffModal, { UploadDiffData } from '@/components/UploadDiffModal';
import WeekHistoryModal, { WeekHistoryItem } from '@/components/WeekHistoryModal';
import PlanSnapshotPanel from '@/components/PlanSnapshotPanel';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, hasPermission } = useAuth();

  const [currentWeek, setCurrentWeek] = useState<any>(null);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [needsReview, setNeedsReview] = useState(false);
  const [reviewWeek, setReviewWeek] = useState<any>(null);
  const [currentFilter, setCurrentFilter] = useState('all');

  // Архив производственных недель
  const [weeksHistory, setWeeksHistory] = useState<WeekHistoryItem[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [selectedWeekData, setSelectedWeekData] = useState<any | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Модальные окна
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isRolesOpen, setIsRolesOpen] = useState(false);
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [uploadDiffData, setUploadDiffData] = useState<UploadDiffData | null>(null);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [autoSyncPrice, setAutoSyncPrice] = useState<boolean>(true);
  const [snapshotRefreshKey, setSnapshotRefreshKey] = useState(0);

  // Редирект на логин, если не авторизован
  useEffect(() => {
    if (!loading && !user) {
      window.location.replace('/login');
    }
  }, [user, loading]);

  // Загрузка настроек системы (авто-синхронизация с Прайсом)
  useEffect(() => {
    if (!user) return;
    try {
      const local = localStorage.getItem('topfish_auto_sync_price');
      if (local !== null) {
        setAutoSyncPrice(local === 'true');
      }
    } catch (e) {}

    api.get('/api/plan/settings')
      .then((res) => {
        if (typeof res.data?.autoSyncPrice === 'boolean') {
          setAutoSyncPrice(res.data.autoSyncPrice);
          try {
            localStorage.setItem('topfish_auto_sync_price', String(res.data.autoSyncPrice));
          } catch (e) {}
        }
      })
      .catch((err) => {
        console.warn('Failed to load plan settings:', err);
      });
  }, [user]);

  const handleToggleAutoSync = async (nextVal?: boolean) => {
    const val = nextVal !== undefined ? nextVal : !autoSyncPrice;
    setAutoSyncPrice(val);
    try {
      localStorage.setItem('topfish_auto_sync_price', String(val));
      await api.put('/api/plan/settings', { autoSyncPrice: val });
      toast.success(
        val
          ? 'Авто-синхронизация с Прайсом ВКЛЮЧЕНА (сработает при загрузке 1С)'
          : 'Авто-синхронизация ВЫКЛЮЧЕНА (синхронизация теперь только по кнопке)'
      );
    } catch (e) {
      toast.error('Не удалось сохранить настройку на сервере');
    }
  };

  // Загрузка списка недель (история)
  const fetchWeeksHistory = async () => {
    try {
      const res = await api.get('/api/weeks/history');
      setWeeksHistory(res.data || []);
    } catch (e) {
      console.warn('Failed to load weeks history:', e);
    }
  };

  // Загрузка данных текущей недели (isBackground: без мерцания экрана)
  const fetchCurrentWeek = async (isBackground = false) => {
    try {
      if (!isBackground) {
        setIsInitialLoading(true);
      }
      const res = await api.get('/api/weeks/current');
      fetchWeeksHistory();
      if (res.data.needsReview) {
        setNeedsReview(true);
        setReviewWeek(res.data.reviewWeek);
        setCurrentWeek(null);
        setItems([]);
      } else {
        setNeedsReview(false);
        setReviewWeek(null);
        setCurrentWeek(res.data.currentWeek);

        // Если сейчас просматривается текущая неделя, обновляем её позиции
        if (!selectedWeekId || selectedWeekId === res.data.currentWeek?.id) {
          const newItems: PlanItem[] = res.data.currentWeek?.items || [];
          if (isBackground) {
            setItems((prev) => {
              if (prev.length !== newItems.length) {
                setSnapshotRefreshKey((k) => k + 1);
                return newItems;
              }
              const hasDiff = prev.some((p, idx) => {
                const n = newItems[idx];
                return (
                  !n ||
                  p.id !== n.id ||
                  p.isPlanned !== n.isPlanned ||
                  p.updatedAt !== n.updatedAt ||
                  p.resultStatus !== n.resultStatus
                );
              });
              if (hasDiff) {
                setSnapshotRefreshKey((k) => k + 1);
                return newItems;
              }
              return prev;
            });
          } else {
            setItems(newItems);
          }
        }

        if (res.data.currentWeek?.id) {
          // 1. Приоритет: отчет из базы данных (доступен с любого браузера и устройства)
          if (res.data.currentWeek.uploadReport) {
            const serverReport = res.data.currentWeek.uploadReport;
            if (!serverReport.uploadedAt) {
              serverReport.uploadedAt =
                res.data.currentWeek.excelFileUploadedAt ||
                res.data.currentWeek.lastUploadedAt ||
                res.data.currentWeek.updatedAt;
            }
            setUploadDiffData(serverReport);
            try {
              localStorage.setItem(
                `topfish_diff_${res.data.currentWeek.id}`,
                JSON.stringify(serverReport)
              );
            } catch (e) {}
          } else {
            // 2. Резерв: локальный кэш браузера или базовый отчет по загруженному файлу
            try {
              const cachedDiff = localStorage.getItem(`topfish_diff_${res.data.currentWeek.id}`);
              if (cachedDiff) {
                const parsed = JSON.parse(cachedDiff);
                if (!parsed.uploadedAt) {
                  parsed.uploadedAt =
                    res.data.currentWeek.excelFileUploadedAt ||
                    res.data.currentWeek.lastUploadedAt ||
                    res.data.currentWeek.updatedAt;
                }
                setUploadDiffData(parsed);
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
                    novelties: res.data.currentWeek.items?.filter((i: any) => i.isNew).length || 0,
                    outOfStock: res.data.currentWeek.items?.filter((i: any) => (i.stockKg ?? 0) === 0).length || 0,
                  },
                  changes: {
                    hits: [],
                    novelties: res.data.currentWeek.items?.filter((i: any) => i.isNew).map((i: any) => ({
                      name: i.productName,
                      category: i.category,
                      price: i.price,
                      stockKg: i.stockKg,
                    })) || [],
                    outOfStock: res.data.currentWeek.items?.filter((i: any) => (i.stockKg ?? 0) === 0).map((i: any) => ({
                      name: i.productName,
                      category: i.category,
                      newStock: 0,
                    })) || [],
                    backInStock: [],
                    priceChanges: [],
                    stockChanges: [],
                    addedToWeek: [],
                  },
                };
                setUploadDiffData(fallbackReport);
              } else {
                setUploadDiffData(null);
              }
            } catch (e) {}
          }
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка загрузки недели');
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCurrentWeek();
    }
  }, [user]);

  const displayWeek = selectedWeekData?.week || currentWeek;
  const isViewingArchive = Boolean(selectedWeekId && currentWeek && selectedWeekId !== currentWeek.id) || displayWeek?.status === 'CLOSED';

  // Периодическая фоновая синхронизация данных (каждые 5 сек), чтобы изменения от других пользователей
  // (например, Технолога на другом компьютере) сразу появлялись на экране без перезагрузки
  useEffect(() => {
    if (!user || isViewingArchive) return;

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchCurrentWeek(true);
      }
    }, 5000);

    const handleFocusOrVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchCurrentWeek(true);
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [user, isViewingArchive, selectedWeekId]);

  // Переключение выбранной недели (просмотр архива или текущей)
  const handleSelectWeek = async (weekId: string) => {
    if (!currentWeek) return;

    if (weekId === currentWeek.id) {
      setSelectedWeekId(null);
      setSelectedWeekData(null);
      setItems(currentWeek.items || []);
      setCurrentFilter('all');
      if (currentWeek.uploadReport) {
        setUploadDiffData(currentWeek.uploadReport);
      }
      return;
    }

    try {
      setIsInitialLoading(true);
      setSelectedWeekId(weekId);
      const res = await api.get(`/api/weeks/${weekId}`);
      setSelectedWeekData(res.data);
      setItems(res.data.items || []);
      setCurrentFilter('planned'); // По умолчанию открываем план недели
      if (res.data.week?.uploadReport) {
        setUploadDiffData(res.data.week.uploadReport);
      } else {
        try {
          const cached = localStorage.getItem(`topfish_diff_${weekId}`);
          setUploadDiffData(cached ? JSON.parse(cached) : null);
        } catch (e) {
          setUploadDiffData(null);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка загрузки данных архивной недели');
    } finally {
      setIsInitialLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-300 gap-4 p-4">
        <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-base font-semibold text-teal-400">Проверка авторизации...</p>
        <a
          href="/login"
          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 text-xs font-medium transition"
        >
          Перейти на страницу входа &rarr;
        </a>
      </div>
    );
  }

  // Обновление одного пункта в локальном стейте
  const handleItemUpdated = (updatedItem: PlanItem) => {
    let nextItems: PlanItem[] = [];
    setItems((prev) => {
      nextItems = prev.map((i) => {
        if (i.id !== updatedItem.id) return i;
        return {
          ...i,
          ...updatedItem,
          smartMeta: updatedItem.smartMeta !== undefined ? updatedItem.smartMeta : i.smartMeta,
          salesPercent: updatedItem.salesPercent !== undefined ? updatedItem.salesPercent : i.salesPercent,
          salesHistoryWeeks: updatedItem.salesHistoryWeeks !== undefined ? updatedItem.salesHistoryWeeks : i.salesHistoryWeeks,
          rawAbcCategory: updatedItem.rawAbcCategory ?? i.rawAbcCategory,
          rawIsHit: updatedItem.rawIsHit ?? i.rawIsHit,
        };
      });
      return nextItems;
    });

    // Если мы просматриваем закрытую архивную неделю, пересчитываем статистику и обновляем логи
    if (isViewingArchive && selectedWeekId) {
      const planned = nextItems.filter((i) => i.isPlanned);
      const totalPlanned = planned.length;
      const completed = planned.filter((i) => i.resultStatus === 'COMPLETED').length;
      const forgotten = planned.filter((i) => i.resultStatus === 'FORGOTTEN').length;
      const noRaw = planned.filter((i) => i.resultStatus === 'NO_RAW_MATERIAL').length;
      const other = planned.filter((i) => i.resultStatus === 'OTHER').length;
      const percentCompleted = totalPlanned > 0 ? Math.round((completed / totalPlanned) * 100) : 0;

      setSelectedWeekData((prev: any) => {
        if (!prev) return prev;
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
        };
      });

      setWeeksHistory((prev) =>
        prev.map((w) => {
          if (w.id !== selectedWeekId) return w;
          return {
            ...w,
            totalPlanned,
            completed,
            forgotten,
            noRaw,
            other,
            percentCompleted,
          };
        })
      );

      // Фоновое обновление логов архива
      api
        .get(`/api/weeks/${selectedWeekId}/logs`)
        .then((res) => {
          setSelectedWeekData((prev: any) =>
            prev ? { ...prev, auditLogs: res.data } : prev
          );
        })
        .catch(() => {});
    }

    // Обновляем панель "План vs Факт" при каждом изменении галочки
    setSnapshotRefreshKey((k) => k + 1);
  };

  // Удаление товара из локального стейта
  const handleItemDeleted = (deletedId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== deletedId));
    setSnapshotRefreshKey((k) => k + 1);
  };

  const handleReviewConfirmed = () => {
    setNeedsReview(false);
    setReviewWeek(null);
    fetchCurrentWeek();
  };

  const activeItems = items.filter((i) => !i.isDeleted);
  const plannedCount = activeItems.filter((i) => i.isPlanned).length;
  const noveltiesCount = activeItems.filter((i) => i.isNew).length;
  const outOfStockCount = activeItems.filter((i) => (i.stockKg ?? 0) === 0).length;
  const hitsCount = activeItems.filter((i) => i.smartMeta?.tag === 'HIT_REPEAT').length;
  const longTimeCount = activeItems.filter((i) => i.smartMeta?.tag === 'LONG_TIME_NO_PLAN').length;
  const unfinishedCount = activeItems.filter((i) => i.smartMeta?.tag === 'LAST_WEEK_UNFINISHED').length;

  const canEditArchive = isViewingArchive && (hasPermission('TOGGLE_PLAN') || hasPermission('FULL_ACCESS'));

  return (
    <div className="min-h-screen bg-slate-100/60 pb-16">
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
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
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
            onReturnToCurrent={() => handleSelectWeek(currentWeek.id)}
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
        {!isViewingArchive && !isInitialLoading && displayWeek?.id && (
          <div className="mt-4">
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
          <div className="p-12 text-center text-slate-400 text-sm">
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
            onBulkUpdated={() => { fetchCurrentWeek(); setSnapshotRefreshKey((k) => k + 1); }}
            onPlanConfirmed={() => { fetchCurrentWeek(); setSnapshotRefreshKey((k) => k + 1); }}
            onOpenUpload={() => setIsUploadOpen(true)}
          />
        )}
      </main>

      {/* Блокирующее окно подведения итогов по понедельникам */}
      {needsReview && reviewWeek && (
        <ReviewModal
          reviewWeek={reviewWeek}
          onReviewConfirmed={handleReviewConfirmed}
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
            setItems(newItems);
            fetchCurrentWeek();
            if (uploadResult && (uploadResult.changes || uploadResult.syncResult)) {
              setUploadDiffData(uploadResult);
              setIsDiffOpen(true);
              try {
                localStorage.setItem(
                  `topfish_diff_${currentWeek.id}`,
                  JSON.stringify(uploadResult)
                );
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
          uploadedAtFallback={displayWeek?.lastUploadedAt || displayWeek?.updatedAt}
        />
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
  );
}
