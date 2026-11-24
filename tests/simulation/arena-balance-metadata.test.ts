import { describe, expect, it } from 'vitest';
import table from '../../src/arena/data/arena-balance.json';
import metadata from '../../src/arena/data/arena-balance-meta.json';
import { BALANCE_SCHEMA } from '../../src/arena/shared/balance-schema';
import { validateBalanceMetadata } from './arena-balance-metadata';

const runtimeSources = import.meta.glob('/src/**/*.{ts,css,html}', {
  query: '?raw', import: 'default', eager: true,
});

describe('authoring-only balance metadata', () => {
  it('keeps metadata references out of runtime source', () => {
    for (const [path, source] of Object.entries(runtimeSources)) {
      expect(source, path).not.toMatch(/arena-balance-meta|source_locator|source_revision|rationale/);
    }
  });
  it('validates both tables against the exact schema id set', () => {
    expect(() => validateBalanceMetadata(table, metadata)).not.toThrow();
    const ids = Object.values(BALANCE_SCHEMA).map(spec => spec[0]).sort();
    expect(table.rows.map(row => row.id).sort()).toEqual(ids);
    expect(metadata.rows.map(row => row.id).sort()).toEqual(ids);
  });
  it.each(['values', 'metadata'] as const)('rejects missing, unknown and duplicate ids in %s', side => {
    for (const mutation of ['missing', 'unknown', 'duplicate'] as const) {
      const values = structuredClone(table);
      const meta = structuredClone(metadata);
      const rows = side === 'values' ? values.rows : meta.rows;
      if (mutation === 'missing') rows.shift();
      if (mutation === 'unknown') rows[0].id = 'not-a-parameter';
      if (mutation === 'duplicate') rows[1].id = rows[0].id;
      expect(() => validateBalanceMetadata(values, meta)).toThrow();
    }
  });
  it.each([
    ['source_path', ''], ['source_path', 'src/arena/../bad.ts'], ['source_path', 'outside.ts'],
    ['source_locator', ' '], ['source_revision', 'HEAD'], ['decision', 'approved'], ['rationale', ' '],
  ] as const)('rejects invalid %s (%s)', (key, value) => {
    const meta = structuredClone(metadata);
    meta.rows[0][key] = value;
    expect(() => validateBalanceMetadata(table, meta)).toThrow();
  });
  it('rejects malformed metadata contracts and row shapes', () => {
    for (const bad of [null, [], {}, { ...metadata, contract: 'other' }, { ...metadata, schema_version: 1 },
      { ...metadata, columns: [] }, { ...metadata, link_columns: ['source_path'] }, { ...metadata, rows: null },
      { ...metadata, rows: [null] }, { ...metadata, rows: [{ ...metadata.rows[0], value: 1 }] }]) {
      expect(() => validateBalanceMetadata(table, bad)).toThrow();
    }
  });
  it('joins by id rather than requiring matching row order', () => {
    expect(() => validateBalanceMetadata(table, { ...metadata, rows: [...metadata.rows].reverse() })).not.toThrow();
  });
});
