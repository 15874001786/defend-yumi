import { describe, expect, it } from 'vitest';
import { BASE_UPGRADES, GRID_EXPANSIONS, INITIAL_GRID_CAPACITY, MAX_GRID_CAPACITY } from '../src/game/data/economy';
import { calculateHeroStats, canMerge, HEROES, MAX_HERO_LEVEL } from '../src/game/data/heroes';
import { WAVES } from '../src/game/data/waves';

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

  it('keeps every base upgrade track at 9 purchasable levels', () => {
    expect(BASE_UPGRADES).toHaveLength(3);
    for (const upgrade of BASE_UPGRADES) {
      expect(upgrade.costs).toHaveLength(9);
      expect(upgrade.costs[8]).toBeGreaterThan(upgrade.costs[0]);
    }
  });
});
