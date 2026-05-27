import type { DifficultyConfig, DifficultyId, MonsterKind, WaveConfig } from '../types';

export const DIFFICULTIES: DifficultyConfig[] = [
  {
    id: 'easy',
    name: '简单',
    shortName: '简',
    hpMultiplier: 0.9,
    speedMultiplier: 0.94,
    rewardMultiplier: 1.15,
    clearRewardMultiplier: 1.12,
    color: 0x57c890,
    description: '适合先熟悉布阵和合成，怪物更脆，金币更宽裕。',
  },
  {
    id: 'hard',
    name: '困难',
    shortName: '困',
    hpMultiplier: 1.28,
    speedMultiplier: 1.12,
    rewardMultiplier: 0.88,
    clearRewardMultiplier: 0.88,
    color: 0xf0a94e,
    description: '标准挑战，怪物生命和速度明显提高，经济更紧。',
  },
  {
    id: 'nightmare',
    name: '噩梦',
    shortName: '梦',
    hpMultiplier: 1.72,
    speedMultiplier: 1.27,
    rewardMultiplier: 0.68,
    clearRewardMultiplier: 0.72,
    color: 0xd85d82,
    description: '高压模式，怪物更厚更快，金币收益大幅收紧。',
  },
];

export const MONSTER_KINDS: MonsterKind[] = [
  'scout',
  'runner',
  'brute',
  'shield',
  'raider',
  'wraith',
  'golem',
  'titan',
  'goldling',
];

export const COMBAT_MONSTER_KINDS: MonsterKind[] = [
  'scout',
  'runner',
  'brute',
  'shield',
  'raider',
  'wraith',
  'golem',
  'titan',
];

export const GOLD_MONSTER_KIND: MonsterKind = 'goldling';

export function getDifficultyConfig(id: DifficultyId): DifficultyConfig {
  return DIFFICULTIES.find((difficulty) => difficulty.id === id) ?? DIFFICULTIES[0];
}

export const WAVES: WaveConfig[] = Array.from({ length: 20 }, (_, index) => {
  const wave = index + 1;
  const isGoldWave = wave % 4 === 0;
  const tier = Math.min(4, Math.floor(index / 4));
  const combatWave = wave - Math.floor(wave / 4);
  const currentTypeIndex = Math.min(COMBAT_MONSTER_KINDS.length - 1, combatWave - 1);
  const previousTypeIndex = Math.max(0, currentTypeIndex - 1);
  const normalTypes = combatWave === 1
    ? [COMBAT_MONSTER_KINDS[0]]
    : [COMBAT_MONSTER_KINDS[previousTypeIndex], COMBAT_MONSTER_KINDS[currentTypeIndex]];
  const baseHp = Math.round(88 * Math.pow(1.19, index) + wave * 18 + tier * 44);
  const baseReward = 14 + wave * 4 + tier * 10;

  return {
    wave,
    stageName: isGoldWave ? `金币潮 ${Math.ceil(wave / 4)}` : `第 ${wave} 波`,
    isGoldWave,
    count: isGoldWave ? 10 + wave + tier * 2 : 10 + wave * 2 + tier * 3,
    hp: Math.round(baseHp * (isGoldWave ? 1.55 + tier * 0.08 : 1)),
    speed: Number((43 + wave * 2.15 + tier * 4 + (isGoldWave ? 16 + tier * 3 : 0)).toFixed(1)),
    damage: isGoldWave ? 0 : Number((18 + wave * 2.7 + tier * 5).toFixed(1)),
    reward: Math.round(baseReward * (isGoldWave ? 3.1 + tier * 0.2 : 1)),
    spawnEveryMs: Math.max(isGoldWave ? 255 : 320, (isGoldWave ? 650 : 820) - wave * (isGoldWave ? 16 : 20) - tier * 16),
    directions: ['left'],
    types: isGoldWave ? [GOLD_MONSTER_KIND] : normalTypes,
  };
});
