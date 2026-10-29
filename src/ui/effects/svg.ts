import type { Unit } from '../../game/model';
import { unitPosition } from '../presentation';

const SVG_NS = 'http://www.w3.org/2000/svg';
export const clamp = (value: number): number => Math.max(0, Math.min(1, value));

export function svg<K extends keyof SVGElementTagNameMap>(tag: K, className: string): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  element.setAttribute('class', className);
  return element;
}

export function center(unit: Unit): { x: number; y: number } {
  const position = unitPosition(unit);
  return { x: (position.x + 0.5) * 100, y: (position.y + 0.5) * 100 };
}
