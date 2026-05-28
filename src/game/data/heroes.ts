import type { BaseLevels, HeroDefinition, HeroStats } from '../types';

export const MAX_HERO_LEVEL = 9;

export const HEROES: HeroDefinition[] = [
  {
    id: 'ember-warden',
    name: '烬火卫士',
    title: '火焰蔓延',
    element: 'fire',
    attackPattern: 'burn',
    cost: 80,
    size: 2,
    baseDamage: 24,
    attackRate: 0.82,
    range: 255,
    maxHp: 260,
    color: 0xf06a3a,
    accent: 0xffc15f,
    summary: '单体火弹，持续灼烧并在高等级时向附近目标扩散。',
    skills: [
      { level: 3, name: '余烬跳燃', cost: 0, description: '灼烧目标死亡时对周围怪物造成一次火花伤害。' },
      { level: 6, name: '火线蔓延', cost: 520, description: '攻击会在目标脚下留下持续灼烧火场。' },
      { level: 9, name: '熔核审判', cost: 1450, description: '周期性落下熔核，爆炸后形成更大的燃烧区域。' },
    ],
  },
  {
    id: 'frost-marshal',
    name: '霜环元帅',
    title: '冰霜减速',
    element: 'ice',
    attackPattern: 'frostNova',
    cost: 95,
    size: 2,
    baseDamage: 18,
    attackRate: 0.74,
    range: 230,
    maxHp: 300,
    color: 0x7bd6ff,
    accent: 0xd8f6ff,
    summary: '范围冰环，造成中等伤害并降低怪物移动速度。',
    skills: [
      { level: 3, name: '碎霜', cost: 0, description: '冰环命中已减速目标时额外造成 35% 伤害。' },
      { level: 6, name: '寒潮领域', cost: 560, description: '攻击会展开冰冻范围，持续压低怪物速度。' },
      { level: 9, name: '绝对零域', cost: 1500, description: '周期性展开大范围冰域，暂时冻结区域内怪物。' },
    ],
  },
  {
    id: 'storm-caller',
    name: '雷链使者',
    title: '闪电连锁',
    element: 'lightning',
    attackPattern: 'chain',
    cost: 130,
    size: 3,
    baseDamage: 28,
    attackRate: 0.62,
    range: 280,
    maxHp: 290,
    color: 0xffdf47,
    accent: 0x7cf7ff,
    summary: '雷电会在多名怪物之间弹跳，适合处理密集进攻。',
    skills: [
      { level: 3, name: '二次导流', cost: 0, description: '闪电连锁次数 +1。' },
      { level: 6, name: '过载电弧', cost: 720, description: '每次弹跳伤害衰减降低，并短暂麻痹目标。' },
      { level: 9, name: '天穹落雷', cost: 1780, description: '每 2 秒从天上降下落雷，打击路线前方怪物。' },
    ],
  },
  {
    id: 'blade-dancer',
    name: '影刃舞者',
    title: '近战扇形',
    element: 'blade',
    attackPattern: 'cleave',
    cost: 70,
    size: 2,
    baseDamage: 30,
    attackRate: 1.05,
    range: 150,
    maxHp: 420,
    color: 0xd34c5f,
    accent: 0xf5d8bf,
    summary: '近距离高速斩击，扇形伤害覆盖路线内侧的密集怪物。',
    skills: [
      { level: 3, name: '回身斩', cost: 0, description: '攻击时额外命中身后最近的怪物。' },
      { level: 6, name: '残影步', cost: 440, description: '攻速提升，斩击残影会追加一次技能辉光。' },
      { level: 9, name: '百裂终幕', cost: 1320, description: '连续斩击内圈所有怪物。' },
    ],
  },
  {
    id: 'sun-chanter',
    name: '日辉吟者',
    title: '治疗光束',
    element: 'sun',
    attackPattern: 'healBeam',
    cost: 105,
    size: 2,
    baseDamage: 15,
    attackRate: 0.7,
    range: 260,
    maxHp: 260,
    color: 0xffb84d,
    accent: 0xfff1a6,
    summary: '光束伤害较低，但会修复晶核并提供团队增益。',
    skills: [
      { level: 3, name: '暖阳祷词', cost: 0, description: '每次攻击都会为晶核恢复少量生命。' },
      { level: 6, name: '日冕祝福', cost: 650, description: '附近英雄攻击力提升。' },
      { level: 9, name: '重燃圣歌', cost: 1680, description: '周期性爆发圣歌，额外修复晶核并灼伤路径怪物。' },
    ],
  },
  {
    id: 'arc-sniper',
    name: '弧光狙击手',
    title: '远程穿透',
    element: 'arcane',
    attackPattern: 'pierce',
    cost: 115,
    size: 2,
    baseDamage: 46,
    attackRate: 0.42,
    range: 430,
    maxHp: 230,
    color: 0xc193ff,
    accent: 0xffffff,
    summary: '超远距离高伤害单点，能穿透直线上的第二个目标。',
    skills: [
      { level: 3, name: '校准棱镜', cost: 0, description: '优先瞄准血量最高怪物，溢出伤害穿透。' },
      { level: 6, name: '弱点标定', cost: 760, description: '命中目标短时间受到伤害提高。' },
      { level: 9, name: '星轨贯穿', cost: 1850, description: '狙击线穿透更多目标，首目标必定暴击。' },
    ],
  },
  {
    id: 'bomb-chef',
    name: '爆破厨师',
    title: '抛物爆弹',
    element: 'blast',
    attackPattern: 'bomb',
    cost: 125,
    size: 3,
    baseDamage: 36,
    attackRate: 0.48,
    range: 300,
    maxHp: 330,
    color: 0xf2a23a,
    accent: 0x7a3320,
    summary: '投掷爆弹造成范围伤害，攻击慢但清群能力稳定。',
    skills: [
      { level: 3, name: '二次爆米', cost: 0, description: '爆炸后留下小范围余爆。' },
      { level: 6, name: '黑椒火药', cost: 700, description: '爆炸范围扩大，并附带短暂灼烧。' },
      { level: 9, name: '终极锅炉', cost: 1760, description: '每波第一次攻击投出巨型锅炉弹。' },
    ],
  },
  {
    id: 'venom-alchemist',
    name: '毒雾炼金师',
    title: '毒雾削甲',
    element: 'poison',
    attackPattern: 'poison',
    cost: 90,
    size: 2,
    baseDamage: 14,
    attackRate: 0.9,
    range: 245,
    maxHp: 250,
    color: 0x7ac943,
    accent: 0x2b5132,
    summary: '持续毒伤并降低怪物抗性，适合配合高爆发英雄。',
    skills: [
      { level: 3, name: '腐蚀瓶', cost: 0, description: '中毒怪物受到的后续伤害增加。' },
      { level: 6, name: '连锁毒雾', cost: 520, description: '毒素会跳到附近目标。' },
      { level: 9, name: '灾厄蒸馏', cost: 1420, description: '毒雾覆盖路径，持续削弱经过的怪物。' },
    ],
  },
  {
    id: 'gear-tinkerer',
    name: '齿轮工匠',
    title: '机械炮塔',
    element: 'gear',
    attackPattern: 'drone',
    cost: 145,
    size: 3,
    baseDamage: 20,
    attackRate: 1.25,
    range: 250,
    maxHp: 360,
    color: 0xaec3c0,
    accent: 0xffb347,
    summary: '高频机械弹幕，稳定压低前排怪物生命。',
    skills: [
      { level: 3, name: '副炮架设', cost: 0, description: '额外发射一枚低伤害机械弹。' },
      { level: 6, name: '自走炮台', cost: 820, description: '召唤一个小型炮台协助攻击。' },
      { level: 9, name: '全域装填', cost: 1980, description: '短时间内全队攻速提高。' },
    ],
  },
  {
    id: 'tide-monk',
    name: '潮汐武僧',
    title: '击退水波',
    element: 'water',
    attackPattern: 'tidal',
    cost: 135,
    size: 3,
    baseDamage: 26,
    attackRate: 0.58,
    range: 235,
    maxHp: 520,
    color: 0x3bb3b8,
    accent: 0xe4fff8,
    summary: '水波伤害并击退怪物，是保护内圈与水晶的关键防线。',
    skills: [
      { level: 3, name: '回潮', cost: 0, description: '击退后对目标追加一次水伤。' },
      { level: 6, name: '潮墙', cost: 780, description: '每隔一段时间生成减速水墙。' },
      { level: 9, name: '海啸印', cost: 1900, description: '水波改为大范围扇形击退。' },
    ],
  },
  {
    id: 'void-weaver',
    name: '虚空织者',
    title: '重力漩涡',
    element: 'void',
    attackPattern: 'gravity',
    cost: 210,
    size: 4,
    baseDamage: 34,
    attackRate: 0.5,
    range: 320,
    maxHp: 360,
    color: 0x6d5bd0,
    accent: 0x1b102f,
    summary: '大型范围牵引与减速，费用和占格很高但控场极强。',
    skills: [
      { level: 3, name: '引力折叠', cost: 0, description: '漩涡会把怪物向路径后方拉回少量距离。' },
      { level: 6, name: '事件视界', cost: 1120, description: '漩涡持续时间增加，范围内怪物伤害降低。' },
      { level: 9, name: '黑星坍缩', cost: 2600, description: '周期性制造高伤害黑星，强制聚怪。' },
    ],
  },
  {
    id: 'prism-oracle',
    name: '棱镜先知',
    title: '折射射线',
    element: 'prism',
    attackPattern: 'refract',
    cost: 190,
    size: 4,
    baseDamage: 42,
    attackRate: 0.46,
    range: 360,
    maxHp: 320,
    color: 0xff6ec7,
    accent: 0x82fff6,
    summary: '射线在多个目标间折射，越到高等级越像范围爆发核心。',
    skills: [
      { level: 3, name: '双棱折射', cost: 0, description: '射线额外折射 1 个目标。' },
      { level: 6, name: '彩虹焦点', cost: 980, description: '连续攻击同一目标会叠加伤害。' },
      { level: 9, name: '万华镜阵列', cost: 2400, description: '短时间展开阵列，对多名怪物持续折射。' },
    ],
  },
];

export function getHeroDefinition(id: string): HeroDefinition {
  const hero = HEROES.find((candidate) => candidate.id === id);
  if (!hero) {
    throw new Error(`Unknown hero id: ${id}`);
  }
  return hero;
}

export function calculateHeroStats(hero: HeroDefinition, level: number, baseLevels: BaseLevels): HeroStats {
  const clampedLevel = Math.max(1, Math.min(MAX_HERO_LEVEL, level));
  const levelBonus = 1 + (clampedLevel - 1) * 0.33;
  const attackBonus = 1 + baseLevels.attack * 0.055;
  const speedBonus = 1 + baseLevels.speed * 0.038;
  const rangeBoost = 170;
  return {
    damage: Math.round(hero.baseDamage * levelBonus * attackBonus),
    attackRate: Number((hero.attackRate * (1 + (clampedLevel - 1) * 0.025) * speedBonus).toFixed(2)),
    range: Math.round(Math.max(hero.range + rangeBoost, 390) + (clampedLevel - 1) * 8),
    maxHp: Math.round(hero.maxHp * (1 + (clampedLevel - 1) * 0.2)),
  };
}

export function directHeroUpgradeCost(hero: HeroDefinition, level: number): number | null {
  if (!canMerge(level)) {
    return null;
  }
  return hero.cost * Math.pow(2, level - 1);
}

export function canMerge(level: number): boolean {
  return level >= 1 && level < MAX_HERO_LEVEL;
}
