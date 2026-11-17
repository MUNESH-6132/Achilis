# Habit tracker storage and migration

## Existing storage

The previous tracker UI stores `trackers` and `logs` as arrays in the application state. The state is loaded from the `achilles:v1` IndexedDB key in the `kv` store and is also serialized in the Supabase `user_data.data` JSON for signed-in accounts. Demo state uses the `achilles:demo:v1` IndexedDB key. Existing tracker logs use `{ id, trackerId, date }`, with `date` as a local `YYYY-MM-DD` string.

The regular app-state persistence and Supabase sync remain unchanged. V2 habits and logs use separate per-record IndexedDB stores and are scoped by the current account or demo identity.

## Additive V2 model

- `habits`: `id`, `name`, `type` (`check` or `count`), `target`, `unit`, `schedule`, `tiny_target`, `created_at`, and `archived_at`.
- `habit_logs`: `id`, `habit_id`, local `date` (`YYYY-MM-DD`), `value`, and `status` (`done`, `partial`, `rest`, or `skipped`).
- Records also carry an IndexedDB owner key so separate accounts on the same device do not see each other's V2 tracker data.

On first V2 load, the app writes the original arrays to the `backup_trackers_v1` IndexedDB key before creating any V2 records. Each legacy tracker becomes a check habit, and valid legacy completion dates become done logs. Stable IDs and check-before-insert behavior make the copy idempotent; existing V2 records are never overwritten or removed. Backups are retained per owner, and `restoreTrackersBackup()` additively restores any missing legacy and V2 records.

If backup, migration, or initial V2 loading fails, the error is logged and the legacy tracker screen is shown. The original arrays remain untouched. Set `VITE_HABIT_TRACKER_V2=false` to disable the new UI and continue using the legacy screen.
