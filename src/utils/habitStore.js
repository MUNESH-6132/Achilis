import { idbDeleteRecord, idbGet, idbGetAllRecords, idbPutRecord, idbSet } from './db';
import { generateId } from './helpers';

const HABITS_STORE = 'habits';
const HABIT_LOGS_STORE = 'habit_logs';
const BACKUP_KEY = 'backup_trackers_v1';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isLocalDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function mergeById(current, restored) {
  const merged = new Map(current.map(item => [item.id, item]));
  for (const item of restored) {
    if (!merged.has(item.id)) merged.set(item.id, item);
  }
  return [...merged.values()];
}

export async function getHabitRecords(ownerId) {
  const [habits, logs] = await Promise.all([
    idbGetAllRecords(HABITS_STORE),
    idbGetAllRecords(HABIT_LOGS_STORE),
  ]);
  return {
    habits: habits.filter(habit => habit.ownerId === ownerId),
    logs: logs.filter(log => log.ownerId === ownerId),
  };
}

async function saveLegacyBackup(ownerId, trackers, logs) {
  const backup = await idbGet(BACKUP_KEY) || { version: 1, owners: {} };
  if (backup.owners?.[ownerId]) return;

  await idbSet(BACKUP_KEY, {
    ...backup,
    version: 1,
    owners: {
      ...(backup.owners || {}),
      [ownerId]: {
        created_at: new Date().toISOString(),
        trackers: trackers.map(tracker => ({ ...tracker })),
        logs: logs.map(log => ({ ...log })),
      },
    },
  });
}

export async function migrateLegacyTrackers(ownerId, trackers, logs) {
  await saveLegacyBackup(ownerId, trackers, logs);
  const current = await getHabitRecords(ownerId);
  const existingHabitIds = new Set(current.habits.map(habit => habit.id));
  const existingLogIds = new Set(current.logs.map(log => log.id));
  const legacyHabits = trackers
    .filter(tracker => tracker && typeof tracker === 'object' && tracker.id != null)
    .map(tracker => ({
      id: `legacy-habit-${tracker.id}`,
      ownerId,
      name: String(tracker.name || 'Untitled habit'),
      type: 'check',
      target: 1,
      unit: '',
      schedule: [0, 1, 2, 3, 4, 5, 6],
      tiny_target: 1,
      created_at: new Date().toISOString(),
      archived_at: null,
    }));

  const sourceHabitIds = new Map(
    trackers
      .filter(tracker => tracker && typeof tracker === 'object' && tracker.id != null)
      .map(tracker => [String(tracker.id), `legacy-habit-${tracker.id}`]),
  );
  const legacyLogs = logs.flatMap((log, index) => {
    if (!log || typeof log !== 'object' || log.trackerId == null || !isLocalDate(log.date)) return [];
    const habitId = sourceHabitIds.get(String(log.trackerId));
    if (!habitId) return [];
    return [{
      id: `legacy-log-${log.id ?? `${log.trackerId}-${log.date}-${index}`}`,
      ownerId,
      habit_id: habitId,
      date: log.date,
      value: 1,
      status: 'done',
    }];
  });

  for (const habit of legacyHabits) {
    if (!existingHabitIds.has(habit.id)) await idbPutRecord(HABITS_STORE, habit);
  }
  for (const log of legacyLogs) {
    if (!existingLogIds.has(log.id)) await idbPutRecord(HABIT_LOGS_STORE, log);
  }
}

export async function saveHabitRecord(habit) {
  await idbPutRecord(HABITS_STORE, habit);
}

export async function saveHabitLogRecord(log) {
  await idbPutRecord(HABIT_LOGS_STORE, log);
}

export async function deleteHabitLogRecord(ownerId, id) {
  await idbDeleteRecord(HABIT_LOGS_STORE, ownerId, id);
}

export async function getTrackersBackup(ownerId) {
  const backup = await idbGet(BACKUP_KEY);
  return backup?.owners?.[ownerId] || null;
}

export async function restoreTrackersBackup(ownerId, currentState) {
  const backup = await getTrackersBackup(ownerId);
  if (!backup) throw new Error('No tracker backup is available for this account on this device.');

  await migrateLegacyTrackers(ownerId, backup.trackers, backup.logs);
  return {
    trackers: mergeById(currentState.trackers || [], backup.trackers),
    logs: mergeById(currentState.logs || [], backup.logs),
  };
}

export function createHabit({ name, type, target, unit, schedule, ownerId }) {
  return {
    id: generateId(),
    ownerId,
    name: name.trim(),
    type,
    target: type === 'count' ? Math.max(1, Number(target) || 1) : 1,
    unit: type === 'count' ? unit.trim() : '',
    schedule,
    tiny_target: 1,
    created_at: new Date().toISOString(),
    archived_at: null,
  };
}
