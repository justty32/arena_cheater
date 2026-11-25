import type { ArenaState } from './types';
export interface AuditEvent { time: number; kind: string; [key: string]: unknown }
const events = new WeakMap<ArenaState, AuditEvent[]>();
export function record(state: ArenaState, kind: string, detail: Record<string, unknown>): void {
  if (!events.has(state)) events.set(state, []);
  events.get(state)!.push({ time: state.time, kind, ...detail });
}
export function auditEvents(state: ArenaState): AuditEvent[] { return events.get(state) ?? []; }
