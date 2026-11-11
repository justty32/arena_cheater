import type { Fighter, Weapon } from './model';

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
  fighter.ammo = weapon === 'bow' ? 3 : 0;
  fighter.durability = weapon === 'club' ? 2 : 0;
}
