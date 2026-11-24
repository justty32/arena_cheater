import type { ArenaState } from '../../src/arena/shared/types';

// Keep ordered resource outcomes, not unrelated fighter balance/rendering properties.
export function projectResources(state: ArenaState) {
  return {
    randomState: state.randomState,
    nextId: state.nextId,
    deck: state.deck,
    discard: state.discard,
    hand: state.hand,
    stones: state.stones,
    knownUpcomingCount: state.knownUpcomingCount,
    redrawAvailableAt: state.redrawAvailableAt,
    supportKillRewardStones: state.supportKillRewardStones,
    supportedId: state.supportedId ?? null,
    fighters: state.fighters.map(({ id, hp, pose, buffs }) => ({ id, hp, pose, buffs })),
    effects: state.effects,
    logs: state.logs,
  };
}
