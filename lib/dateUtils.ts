/**
 * Утилиты для работы с датами, ISO-неделями и именами файлов 1С на фронтенде
 */

export function getISOWeekInfo(date: Date = new Date()) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = target.getFullYear();

  const monday = new Date(date);
  monday.setDate(date.getDate() - dayNr);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { weekNumber, year, monday, sunday };
}

/**
 * Автоматически распознает дату и время из названия файла 1С:
 * - PRC_202611060411.xlsx (PRC_YYYYMMDDHHMM) -> 2026-11-06 04:11
 * - PRC_20261106_0411.xlsx -> 2026-11-06 04:11
 * - PRC_20261106.xlsx -> 2026-11-06 12:00
 * - 2026-11-06...
 * - 06.11.2026...
 */
export function extractDateFromFileName(fileName: string): Date | null {
  if (!fileName || typeof fileName !== 'string') return null;

  // 1. Формат 1С: PRC_YYYYMMDDHHMM (например, PRC_202611060411.xlsx)
  const matchPrcTime = fileName.match(/PRC_(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/i);
  if (matchPrcTime) {
    const [, y, m, d, hh, mm] = matchPrcTime;
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), parseInt(hh, 10), parseInt(mm, 10));
    if (!isNaN(date.getTime())) return date;
  }

  // 2. Формат: PRC_YYYYMMDD_HHMM
  const matchPrcTimeUnderscore = fileName.match(/PRC_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/i);
  if (matchPrcTimeUnderscore) {
    const [, y, m, d, hh, mm] = matchPrcTimeUnderscore;
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), parseInt(hh, 10), parseInt(mm, 10));
    if (!isNaN(date.getTime())) return date;
  }

  // 3. Формат: PRC_YYYYMMDD
  const matchPrcDate = fileName.match(/PRC_(\d{4})(\d{2})(\d{2})/i);
  if (matchPrcDate) {
    const [, y, m, d] = matchPrcDate;
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 12, 0);
    if (!isNaN(date.getTime())) return date;
  }

  // 4. Формат ISO: YYYY-MM-DD
  const matchIsoDate = fileName.match(/(\d{4})-(\d{2})-(\d{2})(?:[ T_](\d{2})[:\.](\d{2}))?/);
  if (matchIsoDate) {
    const [, y, m, d, hh, mm] = matchIsoDate;
    const date = new Date(
      parseInt(y, 10),
      parseInt(m, 10) - 1,
      parseInt(d, 10),
      hh ? parseInt(hh, 10) : 12,
      mm ? parseInt(mm, 10) : 0
    );
    if (!isNaN(date.getTime())) return date;
  }

  // 5. Формат РФ: DD.MM.YYYY
  const matchRuDate = fileName.match(/(\d{2})\.(\d{2})\.(\d{4})(?:[ T_](\d{2})[:\.](\d{2}))?/);
  if (matchRuDate) {
    const [, d, m, y, hh, mm] = matchRuDate;
    const date = new Date(
      parseInt(y, 10),
      parseInt(m, 10) - 1,
      parseInt(d, 10),
      hh ? parseInt(hh, 10) : 12,
      mm ? parseInt(mm, 10) : 0
    );
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}
