import { describe, expect, it } from 'vitest';
import { LabelLayout, type LabelAnchor, type LabelBounds, type PlacedLabel } from '../../src/arena/label-layout';

function expectInside(labels: PlacedLabel[], bounds: LabelBounds): void {
  for (const label of labels) {
    expect(label.x, label.id).toBeGreaterThanOrEqual(0);
    expect(label.y, label.id).toBeGreaterThanOrEqual(0);
    expect(label.x + label.width, label.id).toBeLessThanOrEqual(bounds.width);
    expect(label.y + label.height, label.id).toBeLessThanOrEqual(bounds.height);
  }
}

const anchor = (id: string): LabelAnchor => ({ id, x: 210, y: 180, width: 70, height: 22 });
const bounds: LabelBounds = { width: 500, height: 400 };

describe('fighter label layout', () => {
  it('keeps seven crowded full-size labels separate from each other and a body, contained without mutating anchors, including after resize', () => {
    const labels = Array.from({ length: 7 }, (_, i) => anchor(`fighter-${i}`));
    const before = structuredClone(labels);
    const layout = new LabelLayout();
    const body = { id: 'body', x: 190, y: 206, width: 40, height: 44 };
    const placed = layout.arrange(labels, bounds, 0, [body]);
    expect(placed.map(label => label.id).sort()).toEqual(labels.map(label => label.id).sort());
    expect(placed.every(label => !label.fallback)).toBe(true);
    expectInside(placed, bounds);
    for (const [i, label] of placed.entries()) {
      const original = labels.find(entry => entry.id === label.id)!;
      expect({ width: label.width, height: label.height }).toEqual({ width: original.width, height: original.height });
      for (const other of [...placed.slice(i + 1), body]) {
        expect(label.x + label.width <= other.x || other.x + other.width <= label.x ||
          label.y + label.height <= other.y || other.y + other.height <= label.y, `${label.id}/${other.id}`).toBe(true);
      }
    }
    const smaller = { width: 180, height: 160 };
    const resized = layout.arrange(labels, smaller, 0);
    expect(resized).toHaveLength(labels.length);
    expectInside(resized, smaller);
    expect(labels).toEqual(before);
  });

  it('stays stable across ordering and paused redraws, then returns home only after game time advances', () => {
    const labels = [{ ...anchor('a'), priority: 1 }, { ...anchor('b'), priority: 0 }];
    const layout = new LabelLayout();
    const crowded = layout.arrange(labels, bounds, 1);
    expect(new LabelLayout().arrange([...labels].reverse(), bounds, 1)).toEqual(crowded);
    expect(layout.arrange([...labels].reverse(), bounds, 1)).toEqual(crowded);
    const remaining = labels[0];
    const retained = layout.arrange([remaining], bounds, 1);
    expect(retained[0].displaced).toBe(true);
    for (let frame = 0; frame < 5; frame++) expect(layout.arrange([remaining], bounds, 1)).toEqual(retained);
    const returned = layout.arrange([remaining], bounds, 2)[0];
    expect(returned.displaced).toBe(false);
    expect({ x: returned.x, y: returned.y }).toEqual({ x: remaining.x, y: remaining.y });
  });

  it('forgets old offsets when a new round reuses the same ids at the same game time', () => {
    const layout = new LabelLayout();
    const labels = [anchor('a'), anchor('b')];
    expect(layout.arrange(labels, bounds, 0).find(label => label.id === 'b')!.displaced).toBe(true);
    layout.reset();
    const nextRound = [labels[1]];
    expect(layout.arrange(nextRound, bounds, 0)).toEqual(new LabelLayout().arrange(nextRound, bounds, 0));
  });
});
