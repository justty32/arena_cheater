import type { UnitRole } from '../game/model';

const paths: Record<string, string> = {
  guard: '<path d="M12 3 20 6v6c0 5-8 9-8 9S4 17 4 12V6Z"/><path d="M12 7v10M8 12h8"/>',
  ranger: '<path d="M7 3c13 6 13 12 0 18L10 12 7 3Z"/><path d="M3 12h18m-4-4 4 4-4 4"/>',
  mage: '<path d="m5 21 9-12M14 2l2 4 4 1-4 2-1 4-2-4-4-1 4-2Z"/><path d="m5 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z"/>',
  potion: '<path d="M9 3h6M10 3v6L5 17a3 3 0 0 0 3 4h8a3 3 0 0 0 3-4l-5-8V3"/><path d="M8 15h8M10 18h2"/>',
  swords: '<path d="m4 3 4 1 11 12-3 3L4 7 4 3Zm16 0-4 1-4 5M5 16l4-4M3 21l4-4m10 0 4 4M3 15l6 6m6 0 6-6"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  reset: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  crown: '<path d="m3 6 5 5 4-7 4 7 5-5-2 13H5Z"/><path d="M6 16h12"/>',
};

export function icon(name: string | UnitRole, className = ''): string {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.swords}</svg>`;
}
