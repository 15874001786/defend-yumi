import type { BaseUpgradeTrack } from '../types';

export const INITIAL_GOLD = 480;
export const INITIAL_GRID_CAPACITY = 8;
export const MAX_GRID_CAPACITY = 30;
export const BENCH_SIZE = 8;

export const GRID_EXPANSIONS = [
  { from: 8, to: 12, cost: 180 },
  { from: 12, to: 16, cost: 280 },
  { from: 16, to: 20, cost: 420 },
  { from: 20, to: 24, cost: 620 },
  { from: 24, to: 30, cost: 1050 },
] as const;

export const BASE_UPGRADES: BaseUpgradeTrack[] = [
  {
    id: 'attack',
    name: '战术火力',
    description: '每级使所有英雄攻击力 +5.5%。',
    perLevel: 0.055,
    costs: [120, 190, 290, 430, 620, 880, 1220, 1650, 2150],
  },
  {
    id: 'speed',
    name: '节拍核心',
    description: '每级使所有英雄攻速 +3.8%。',
    perLevel: 0.038,
    costs: [140, 220, 340, 500, 720, 1020, 1400, 1880, 2450],
  },
  {
    id: 'crystal',
    name: '晶核护壁',
    description: '每级使水晶最大生命 +90，并降低怪物对英雄伤害。',
    perLevel: 90,
    costs: [130, 210, 320, 480, 700, 980, 1320, 1760, 2260],
  },
];

export function nextGridExpansion(capacity: number) {
  return GRID_EXPANSIONS.find((expansion) => expansion.from === capacity);
}

export function getBaseUpgradeCost(trackId: BaseUpgradeTrack['id'], level: number): number | null {
  const track = BASE_UPGRADES.find((candidate) => candidate.id === trackId);
  if (!track || level >= 9) {
    return null;
  }
  return track.costs[level] ?? null;
}

export function crystalMaxHp(crystalLevel: number): number {
  return 1200 + crystalLevel * 90;
}
