import { BALANCE_SCHEMA } from '../../src/arena/shared/balance-schema';
import { loadBalance } from '../../src/arena/shared/balance';

const COLUMNS = ['id', 'source_path', 'source_locator', 'source_revision', 'decision', 'rationale'];
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Authoring-only validation: metadata must never enter the runtime import graph. */
export function validateBalanceMetadata(values: unknown, metadata: unknown): void {
  loadBalance(values);
  if (!object(metadata) || metadata.contract !== 'wf-table/1' || metadata.schema_version !== 2 ||
      !Array.isArray(metadata.columns) || metadata.columns.join('|') !== COLUMNS.join('|') ||
      !Array.isArray(metadata.link_columns) || metadata.link_columns.length !== 0 || !Array.isArray(metadata.rows)) {
    throw new Error('Invalid balance metadata contract');
  }
  const allowed = new Set<string>(Object.values(BALANCE_SCHEMA).map(spec => spec[0]));
  const seen = new Set<string>();
  for (const row of metadata.rows) {
    if (!object(row) || Object.keys(row).length !== COLUMNS.length || !COLUMNS.every(key => key in row) ||
        typeof row.id !== 'string' || !allowed.has(row.id)) throw new Error('Unknown balance metadata row');
    if (seen.has(row.id)) throw new Error(`Duplicate balance metadata id: ${row.id}`);
    if (typeof row.source_path !== 'string' || !row.source_path.startsWith('src/arena/') ||
        row.source_path.includes('..') || typeof row.source_locator !== 'string' || !row.source_locator.trim() ||
        typeof row.source_revision !== 'string' || !/^[0-9a-f]{40}$/.test(row.source_revision) ||
        row.decision !== '現值等價抽取，非平衡批准' || typeof row.rationale !== 'string' || !row.rationale.trim()) {
      throw new Error(`Invalid balance metadata: ${row.id}`);
    }
    seen.add(row.id);
  }
  for (const id of allowed) {
    if (!seen.has(id)) throw new Error(`Missing balance metadata id: ${id}`);
  }
}
