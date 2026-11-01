export const WEAPONS = {
  sword: {
    name: 'Sunsteel Sword',
    damage: 18,
    range: 2.6,
    cooldown: 0.45,
    color: 0xe1e5ec,
  },
  spear: {
    name: 'Aurelian Spear',
    damage: 22,
    range: 3.2,
    cooldown: 0.6,
    color: 0xc5d5e6,
  },
  mace: {
    name: 'Gilded Mace',
    damage: 28,
    range: 2.2,
    cooldown: 0.84,
    color: 0xd2b270,
  },
};

export const ENEMIES = {
  skirmisher: {
    name: 'Skirmisher',
    color: 0x46b57b,
    speed: 2.2,
    health: 42,
    damage: 10,
    xp: 12,
    attackRate: 1.0,
  },
  brute: {
    name: 'Brute',
    color: 0x9d5c44,
    speed: 1.5,
    health: 72,
    damage: 18,
    xp: 20,
    attackRate: 1.4,
  },
  wraith: {
    name: 'Wraith',
    color: 0x6c72ff,
    speed: 2.9,
    health: 54,
    damage: 14,
    xp: 17,
    attackRate: 1.1,
  },
};

export const WORLD_LIMIT = 22;
export const PLAYER_START = { x: 0, z: 0 };
