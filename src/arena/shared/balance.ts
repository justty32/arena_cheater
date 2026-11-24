import table from '../data/arena-balance.json' with { type: 'json' };
import { BALANCE_SCHEMA } from './balance-schema';
import type { Balance, BalanceKey } from './balance-schema';

const COLUMNS = ['id', 'value', 'unit'];
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Validate once at startup, never during a simulation tick. No fallback values. */
export function loadBalance(input: unknown): Balance {
  if (!object(input) || input.contract !== 'wf-table/1' || input.schema_version !== 2 ||
      !Array.isArray(input.columns) || input.columns.join('|') !== COLUMNS.join('|') ||
      !Array.isArray(input.link_columns) || input.link_columns.length !== 0 || !Array.isArray(input.rows)) {
    throw new Error('Invalid balance table contract');
  }
  const rows = new Map<string, Record<string, unknown>>();
  const allowed = new Set<string>(Object.values(BALANCE_SCHEMA).map(spec => spec[0]));
  for (const row of input.rows) {
    if (!object(row) || Object.keys(row).length !== COLUMNS.length || !COLUMNS.every(key => key in row) ||
        typeof row.id !== 'string' || !allowed.has(row.id)) throw new Error('Unknown balance row');
    if (rows.has(row.id)) throw new Error(`Duplicate balance id: ${row.id}`);
    rows.set(row.id, row);
  }
  const result: Partial<Balance> = {};
  for (const key of Object.keys(BALANCE_SCHEMA) as BalanceKey[]) {
    const [id, unit, type] = BALANCE_SCHEMA[key];
    const row = rows.get(id);
    if (!row) throw new Error(`Missing balance id: ${id}`);
    if (row.unit !== unit || typeof row.value !== type) throw new Error(`Invalid balance type/unit: ${id}`);
    const value = row.value;
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || (unit === 'count' && !Number.isInteger(value)) ||
          (unit === 'scalar' ? value < -1 || value > 1 : value < 0) ||
          (['s', 'm/s', 'rad/s', 'ratio'].includes(unit) && value === 0)) {
        throw new Error(`Invalid balance range: ${id}`);
      }
    }
    // The schema has already narrowed each row's type; assignment does not expose JSON rows.
    Object.assign(result, { [key]: value });
  }
  return result as Balance;
}

export const BALANCE = loadBalance(table);
