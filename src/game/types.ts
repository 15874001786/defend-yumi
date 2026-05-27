export type ElementType =
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'blade'
  | 'sun'
  | 'arcane'
  | 'blast'
  | 'poison'
  | 'gear'
  | 'water'
  | 'void'
  | 'prism';

export type AttackPattern =
  | 'burn'
  | 'frostNova'
  | 'chain'
  | 'cleave'
  | 'healBeam'
  | 'pierce'
  | 'bomb'
  | 'poison'
  | 'drone'
  | 'tidal'
  | 'gravity'
  | 'refract';

export interface HeroSkill {
  level: 3 | 6 | 9;
  name: string;
  cost: number;
  description: string;
}

export interface HeroDefinition {
  id: string;
  name: string;
  title: string;
  element: ElementType;
  attackPattern: AttackPattern;
  cost: number;
  size: 2 | 3 | 4;
  baseDamage: number;
  attackRate: number;
  range: number;
  maxHp: number;
  color: number;
  accent: number;
  summary: string;
  skills: [HeroSkill, HeroSkill, HeroSkill];
}

export interface BaseUpgradeTrack {
  id: 'attack' | 'speed' | 'crystal';
  name: string;
  description: string;
  costs: number[];
  perLevel: number;
}

export interface WaveConfig {
  wave: number;
  count: number;
  hp: number;
  speed: number;
  damage: number;
  reward: number;
  spawnEveryMs: number;
  directions: Array<'top' | 'right' | 'bottom' | 'left'>;
  types: Array<'scout' | 'brute' | 'runner' | 'shield'>;
}

export interface HeroStats {
  damage: number;
  attackRate: number;
  range: number;
  maxHp: number;
}

export interface BaseLevels {
  attack: number;
  speed: number;
  crystal: number;
}
