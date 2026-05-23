import prisma from '../config/prisma.js';

/**
 * Bulk-updates BRAG status for tasks or planItems using 4 updateMany calls
 * instead of the old fetch-all + N individual updates pattern.
 *
 * Status derivation rules (same logic as the per-item deriveStatus helper):
 *   progress >= 100                  → Blue
 *   effectiveDue < today             → Red   (overdue)
 *   effectiveDue within 7 days       → Amber (threatened)
 *   effectiveDue > 7 days away       → Green (on track)
 *
 * @param {'task'|'planItem'} model  Prisma model name
 * @param {object} where             Additional Prisma where filter to scope the update
 */
export const syncBragStatuses = async (model, where = {}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysOut = new Date(today);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  sevenDaysOut.setHours(23, 59, 59, 999);

  const notBlue = { not: 'Blue' };
  const notDone = { lt: 100 };

  const overdueCondition = {
    OR: [
      { revisedDate: null, dueDate: { lt: today } },
      { revisedDate: { not: null, lt: today } }
    ]
  };

  const threatenedCondition = {
    OR: [
      { revisedDate: null, dueDate: { gte: today, lte: sevenDaysOut } },
      { revisedDate: { not: null, gte: today, lte: sevenDaysOut } }
    ]
  };

  const onTrackCondition = {
    OR: [
      { revisedDate: null, dueDate: { gt: sevenDaysOut } },
      { revisedDate: { not: null, gt: sevenDaysOut } }
    ]
  };

  await Promise.all([
    prisma[model].updateMany({
      where: { ...where, bragStatus: notBlue, progress: { gte: 100 } },
      data: { bragStatus: 'Blue' }
    }),
    prisma[model].updateMany({
      where: { ...where, bragStatus: notBlue, progress: notDone, ...overdueCondition },
      data: { bragStatus: 'Red' }
    }),
    prisma[model].updateMany({
      where: { ...where, bragStatus: notBlue, progress: notDone, ...threatenedCondition },
      data: { bragStatus: 'Amber' }
    }),
    prisma[model].updateMany({
      where: { ...where, bragStatus: notBlue, progress: notDone, ...onTrackCondition },
      data: { bragStatus: 'Green' }
    })
  ]);
};
