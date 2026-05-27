import { describe, expect, it } from 'vitest';
import { BASE_UPGRADES, GRID_EXPANSIONS, INITIAL_GRID_CAPACITY, MAX_GRID_CAPACITY } from '../src/game/data/economy';
import { calculateHeroStats, canMerge, HEROES, MAX_HERO_LEVEL } from '../src/game/data/heroes';
import { DIFFICULTIES, WAVES, getDifficultyConfig } from '../src/game/data/waves';

describe('game balance tables', () => {
  it('defines 12 unique heroes with complete skill ladders', () => {
    expect(HEROES).toHaveLength(12);
    expect(new Set(HEROES.map((hero) => hero.id)).size).toBe(12);
    for (const hero of HEROES) {
      expect(hero.skills.map((skill) => skill.level)).toEqual([3, 6, 9]);
      expect(hero.skills[0].cost).toBe(0);
      expect(hero.cost).toBeGreaterThan(0);
      expect(hero.size).toBeGreaterThanOrEqual(2);
      expect(hero.size).toBeLessThanOrEqual(4);
    }
  });

  it('keeps merge capped at level 9', () => {
    expect(canMerge(1)).toBe(true);
    expect(canMerge(8)).toBe(true);
    expect(canMerge(MAX_HERO_LEVEL)).toBe(false);
  });

  it('scales hero stats upward with level and base upgrades', () => {
    const hero = HEROES[0];
    const levelOne = calculateHeroStats(hero, 1, { attack: 0, speed: 0, crystal: 0 });
    const levelNine = calculateHeroStats(hero, 9, { attack: 9, speed: 9, crystal: 9 });
    expect(levelNine.damage).toBeGreaterThan(levelOne.damage);
    expect(levelNine.attackRate).toBeGreaterThan(levelOne.attackRate);
    expect(levelNine.maxHp).toBeGreaterThan(levelOne.maxHp);
  });

  it('defines a 20-wave campaign and exact grid expansion path', () => {
    expect(WAVES).toHaveLength(20);
    expect(GRID_EXPANSIONS[0].from).toBe(INITIAL_GRID_CAPACITY);
    expect(GRID_EXPANSIONS.at(-1)?.to).toBe(MAX_GRID_CAPACITY);
  });

  it('turns every fourth wave into a faster bonus gold wave', () => {
    const goldWaves = WAVES.filter((wave) => wave.isGoldWave);
    expect(goldWaves.map((wave) => wave.wave)).toEqual([4, 8, 12, 16, 20]);
    for (const wave of goldWaves) {
      const previousWave = WAVES[wave.wave - 2];
      expect(wave.damage).toBe(0);
      expect(wave.speed).toBeGreaterThan(previousWave.speed);
      expect(wave.hp).toBeGreaterThan(previousWave.hp);
      expect(wave.reward).toBeGreaterThan(previousWave.reward * 2);
      expect(wave.types.every((kind) => kind.startsWith('gold'))).toBe(true);
    }
  });

  it('escalates monster models and stats across the campaign', () => {
    expect(new Set(WAVES.flatMap((wave) => wave.types)).size).toBeGreaterThanOrEqual(8);
    expect(WAVES[0].hp).toBeLessThan(WAVES[18].hp);
    expect(WAVES[0].speed).toBeLessThan(WAVES[18].speed);
    expect(WAVES[16].types).toContain('titan');
  });

  it('defines three difficulty tiers with stricter rewards upward', () => {
    expect(DIFFICULTIES.map((difficulty) => difficulty.id)).toEqual(['easy', 'hard', 'nightmare']);
    const easy = getDifficultyConfig('easy');
    const hard = getDifficultyConfig('hard');
    const nightmare = getDifficultyConfig('nightmare');

    expect(hard.hpMultiplier).toBeGreaterThan(easy.hpMultiplier);
    expect(nightmare.hpMultiplier).toBeGreaterThan(hard.hpMultiplier);
    expect(hard.speedMultiplier).toBeGreaterThan(easy.speedMultiplier);
    expect(nightmare.speedMultiplier).toBeGreaterThan(hard.speedMultiplier);
    expect(hard.rewardMultiplier).toBeLessThan(easy.rewardMultiplier);
    expect(nightmare.rewardMultiplier).toBeLessThan(hard.rewardMultiplier);
  });

  it('keeps every base upgrade track at 9 purchasable levels', () => {
    expect(BASE_UPGRADES).toHaveLength(3);
    for (const upgrade of BASE_UPGRADES) {
      expect(upgrade.costs).toHaveLength(9);
      expect(upgrade.costs[8]).toBeGreaterThan(upgrade.costs[0]);
    }
  });
});
