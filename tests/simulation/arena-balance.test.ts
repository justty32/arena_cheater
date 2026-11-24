import { describe, expect, it } from 'vitest';
import table from '../../src/arena/data/arena-balance.json';
import { BALANCE, loadBalance } from '../../src/arena/shared/balance';
import { createArena } from '../../src/arena/sim/engine';
import { CARDS } from '../../src/arena/shared/card-catalog';
import { ORIGINAL_VALUES } from './arena-balance-values';
import { ORIGINAL_ENTRY } from './arena-entry-values';

// These values were projected from the old source and full snapshots, not the new JSON.
describe('current balance compatibility', () => {
  it('keeps every extracted value equal to its pre-refactor literal', () => {
    expect(BALANCE).toEqual(ORIGINAL_VALUES);
  });
  it.each([42, 2026] as const)('keeps the independent entry RNG stream for seed %s', seed => {
    expect(createArena(seed).fighters.map(f => [f.x, f.y, f.facing, f.nextAttack])).toEqual(ORIGINAL_ENTRY[seed]);
  });
  it('preserves card order, costs and optional effect shapes', () => {
    expect(CARDS.map(c => [c.id, c.cost.generic, c.cost.colored])).toEqual([
      ['lightning-rain', 0, { red: 1 }], ['divine-wrath', 0, { red: 4 }], ['stone', 1, {}],
      ['pot', 2, {}], ['dung', 0, { black: 1 }], ['spike-pit', 2, {}], ['bear-trap', 2, {}],
      ['sword', 2, {}], ['spear', 1, {}], ['hatchet', 2, { yellow: 1 }], ['club', 2, {}],
      ['shield', 3, {}], ['bow', 1, {}], ['lightning', 0, { red: 1 }],
      ['bloodlust', 1, { red: 1 }], ['deliberate', 0, { blue: 1 }],
      ['intuition', 0, { blue: 1 }], ['growth', 2, { green: 1 }],
    ]);
    expect(CARDS.filter(c => c.target === 'area').map(c => [c.areaRadius, c.damage])).toEqual([[1.5, 1], [2.5, 3]]);
    expect(CARDS.find(c => c.id === 'stone')).not.toHaveProperty('damage');
  });
});

describe('balance schema validation', () => {
  it('loads native numeric and boolean values without exposing row aliases', () => {
    const input = structuredClone(table);
    const result = loadBalance(input);
    input.rows[0].value = 999;
    expect(result.wolfHp).toBe(110);
    expect(result.throwPotBypassDefense).toBe(true);
  });
  it.each([
    ['duplicate', (t: typeof table) => t.rows.push(t.rows[0])],
    ['missing', (t: typeof table) => t.rows.shift()],
    ['unknown id', (t: typeof table) => { t.rows[0].id = 'not-a-parameter'; }],
    ['wrong unit', (t: typeof table) => { t.rows[0].unit = 'count'; }],
    ['wrong type', (t: typeof table) => { t.rows[0].value = true; }],
    ['NaN', (t: typeof table) => { t.rows[0].value = NaN; }],
    ['infinity', (t: typeof table) => { t.rows[0].value = Infinity; }],
    ['negative hp', (t: typeof table) => { t.rows[0].value = -1; }],
    ['fractional count', (t: typeof table) => { t.rows.find(r => r.id === 'weapon.bow.ammo')!.value = 2.5; }],
    ['zero duration', (t: typeof table) => { t.rows.find(r => r.id === 'buff.fury.duration')!.value = 0; }],
  ] as const)('rejects %s', (_name, mutate) => {
    const input = structuredClone(table);
    mutate(input);
    expect(() => loadBalance(input)).toThrow();
  });
  it('rejects malformed contracts and rows', () => {
    for (const bad of [null, [], {}, { ...table, schema_version: 1 }, { ...table, columns: [] },
      { ...table, rows: [null] }, { ...table, rows: [{ ...table.rows[0], extra: 1 }] }]) {
      expect(() => loadBalance(bad)).toThrow();
    }
  });
});
