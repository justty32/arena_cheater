import { BALANCE as B } from '../shared/balance';
import type { Fighter, Weapon } from '../shared/types';

export function isTwoHanded(weapon: Weapon): boolean {
  return weapon === 'club' || weapon === 'bow';
}

export function canEquip(fighter: Fighter, weapon: Weapon): boolean {
  if (fighter.hp <= 0 || weapon === 'fists') return false;
  if (weapon === 'shield') return !fighter.shield && !isTwoHanded(fighter.weapon);
  return fighter.weapon === 'fists' && (!isTwoHanded(weapon) || !fighter.shield);
}

export function equip(fighter: Fighter, weapon: Weapon): void {
  if (!canEquip(fighter, weapon)) return;
  if (weapon === 'shield') {
    fighter.shield = true;
    return;
  }
  fighter.weapon = weapon;
  fighter.ammo = weapon === 'bow' ? B.bowAmmo : 0;
  fighter.durability = weapon === 'club' ? B.clubDurability : 0;
}
