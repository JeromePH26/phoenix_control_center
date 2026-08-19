import "server-only";
import type { SettlementJob } from "@/lib/types";

/**
 * football_match_settlement_jobs rows come back from the backend as raw
 * snake_case column names (this table predates the Control Center - see
 * lib/legacyBackend.ts). Map to the camelCase SettlementJob shape the
 * frontend uses, same spirit as the Dart-side mapMatchRowToJson but done
 * here since the /matches/settle/* endpoints intentionally return the raw
 * DB shape for their pre-existing callers.
 */
export function mapSettlementJobRow(row: Record<string, unknown> | null | undefined): SettlementJob | null {
  if (!row) return null;
  return {
    id: row.id as number,
    status: row.status as string,
    minHoursSinceKickoff: (row.min_hours_since_kickoff as number) ?? null,
    batchSize: (row.batch_size as number) ?? null,
    checked: (row.checked as number) ?? null,
    settled: (row.settled as number) ?? null,
    pending: (row.pending as number) ?? null,
    failed: (row.failed as number) ?? null,
    error: (row.error as string) ?? null,
    lastError: (row.last_error as string) ?? null,
    createdAt: (row.created_at as string) ?? null,
    completedAt: (row.completed_at as string) ?? null,
  };
}
