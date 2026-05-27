import Phaser from 'phaser';
import { BASE_UPGRADES, BENCH_SIZE, crystalMaxHp, getBaseUpgradeCost, INITIAL_GOLD, INITIAL_GRID_CAPACITY, nextGridExpansion } from '../data/economy';
import { calculateHeroStats, canMerge, getHeroDefinition, HEROES } from '../data/heroes';
import { DIFFICULTIES, MONSTER_KINDS, WAVES, getDifficultyConfig } from '../data/waves';
import type { BaseLevels, BaseUpgradeTrack, DifficultyId, HeroDefinition, HeroStats, MonsterKind, WaveConfig } from '../types';

const WIDTH = 900;
const HEIGHT = 1600;
const BOARD_CENTER = { x: 450, y: 620 };
const CRYSTAL_POS = { x: 802, y: 334 };
const BOARD_TOP = 312;
const BOARD_GRID = {
  cols: 6,
  rows: 5,
  cell: 104,
  x: 156,
  y: 360,
};
const SELECTED_PANEL_Y = 1000;
const BENCH_Y = 1116;
const SHOP_Y = 1312;
const ASSET_BASE = `${import.meta.env.BASE_URL}assets`;

type BoardLocation = { type: 'board'; index: number; cells: number[] };
type BenchLocation = { type: 'bench'; index: number };
type HeroLocation = BoardLocation | BenchLocation;
type Direction = WaveConfig['directions'][number];

interface SceneInitData {
  difficulty?: DifficultyId;
  restartedByDifficulty?: boolean;
}

interface Slot {
  index: number;
  row: number;
  col: number;
  x: number;
  y: number;
  occupant?: HeroUnit;
}

interface BenchSlot {
  index: number;
  x: number;
  y: number;
  occupant?: HeroUnit;
}

interface HeroUnit {
  uid: number;
  def: HeroDefinition;
  level: number;
  hp: number;
  cooldown: number;
  attackCounter: number;
  learned6: boolean;
  learned9: boolean;
  reviveUsedWave: number;
  location: HeroLocation;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  levelText: Phaser.GameObjects.Text;
  hpFill: Phaser.GameObjects.Rectangle;
  ring: Phaser.GameObjects.Ellipse;
}

interface MonsterStatus {
  burnDps: number;
  burnUntil: number;
  poisonDps: number;
  poisonUntil: number;
  slowUntil: number;
  slowFactor: number;
  stunUntil: number;
  vulnerableUntil: number;
  vulnerableMultiplier: number;
}

interface MonsterUnit {
  uid: number;
  kind: MonsterKind;
  isGold: boolean;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  reward: number;
  path: Phaser.Math.Vector2[];
  pathIndex: number;
  progress: number;
  attackCooldown: number;
  targetHero?: HeroUnit;
  attackingCrystal: boolean;
  dead: boolean;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  hpFill: Phaser.GameObjects.Rectangle;
  status: MonsterStatus;
}

interface ActiveWave {
  config: WaveConfig;
  spawned: number;
  nextSpawnAt: number;
}

interface DragPayload {
  kind: 'shop' | 'hero';
  heroId?: string;
  unitId?: number;
}

interface MonsterTypeStats {
  hp: number;
  speed: number;
  reward: number;
  damage: number;
  scale: number;
}

const MONSTER_TYPE_STATS: Record<MonsterKind, MonsterTypeStats> = {
  scout: { hp: 1, speed: 1, reward: 1, damage: 1, scale: 0.72 },
  runner: { hp: 0.72, speed: 1.45, reward: 0.9, damage: 0.82, scale: 0.66 },
  brute: { hp: 1.72, speed: 0.72, reward: 1.32, damage: 1.35, scale: 0.86 },
  shield: { hp: 2.05, speed: 0.82, reward: 1.55, damage: 1.48, scale: 0.9 },
  raider: { hp: 1.08, speed: 1.18, reward: 1.12, damage: 1.08, scale: 0.75 },
  wraith: { hp: 0.95, speed: 1.32, reward: 1.24, damage: 1.18, scale: 0.74 },
  golem: { hp: 2.42, speed: 0.66, reward: 1.75, damage: 1.65, scale: 0.96 },
  titan: { hp: 3.15, speed: 0.58, reward: 2.25, damage: 2.05, scale: 1.06 },
  goldling: { hp: 1.25, speed: 1.28, reward: 1.05, damage: 0, scale: 0.7 },
  'gold-brute': { hp: 1.95, speed: 1.08, reward: 1.35, damage: 0, scale: 0.86 },
  'gold-titan': { hp: 2.8, speed: 0.92, reward: 1.8, damage: 0, scale: 1 },
};

export class BattleScene extends Phaser.Scene {
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private rangeGraphics!: Phaser.GameObjects.Graphics;
  private uiLayer!: Phaser.GameObjects.Layer;
  private effectLayer!: Phaser.GameObjects.Layer;
  private slots: Slot[] = [];
  private benchSlots: BenchSlot[] = [];
  private heroes: HeroUnit[] = [];
  private monsters: MonsterUnit[] = [];
  private shopCards: Phaser.GameObjects.Container[] = [];
  private gold = INITIAL_GOLD;
  private gridCapacity = INITIAL_GRID_CAPACITY;
  private baseLevels: BaseLevels = { attack: 0, speed: 0, crystal: 0 };
  private crystalHp = crystalMaxHp(0);
  private selectedHero?: HeroUnit;
  private selectedPanel?: Phaser.GameObjects.Container;
  private activeWave?: ActiveWave;
  private currentWave = 0;
  private gameEnded = false;
  private heroUid = 1;
  private monsterUid = 1;
  private messageText!: Phaser.GameObjects.Text;
  private hudGold!: Phaser.GameObjects.Text;
  private hudWave!: Phaser.GameObjects.Text;
  private hudCrystal!: Phaser.GameObjects.Text;
  private hudCapacity!: Phaser.GameObjects.Text;
  private expandLabel!: Phaser.GameObjects.Text;
  private baseLabels: Partial<Record<BaseUpgradeTrack['id'], Phaser.GameObjects.Text>> = {};
  private globalSpeedBuffUntil = 0;
  private shopPage = 0;
  private shopPageText!: Phaser.GameObjects.Text;
  private rangeText?: Phaser.GameObjects.Text;
  private difficulty: DifficultyId = 'easy';
  private pendingIntroMessage?: string;

  constructor() {
    super('BattleScene');
  }

  init(data: SceneInitData = {}): void {
    this.difficulty = data.difficulty ?? this.difficulty;
    this.resetRuntimeState();
    if (data.restartedByDifficulty) {
      this.pendingIntroMessage = `已切换为${getDifficultyConfig(this.difficulty).name}难度，战局重新开始`;
    }
  }

  private resetRuntimeState(): void {
    this.slots = [];
    this.benchSlots = [];
    this.heroes = [];
    this.monsters = [];
    this.shopCards = [];
    this.gold = INITIAL_GOLD;
    this.gridCapacity = INITIAL_GRID_CAPACITY;
    this.baseLevels = { attack: 0, speed: 0, crystal: 0 };
    this.crystalHp = crystalMaxHp(0);
    this.selectedHero = undefined;
    this.selectedPanel = undefined;
    this.activeWave = undefined;
    this.currentWave = 0;
    this.gameEnded = false;
    this.heroUid = 1;
    this.monsterUid = 1;
    this.baseLabels = {};
    this.globalSpeedBuffUntil = 0;
    this.shopPage = 0;
    this.rangeText = undefined;
    this.pendingIntroMessage = undefined;
  }

  preload(): void {
    for (const hero of HEROES) {
      this.load.svg(`hero-${hero.id}`, `${ASSET_BASE}/heroes/${hero.id}.svg`, { width: 96, height: 112 });
    }
    for (const monster of MONSTER_KINDS) {
      this.load.svg(`monster-${monster}`, `${ASSET_BASE}/monsters/${monster}.svg`, { width: 100, height: 112 });
    }
    this.load.svg('crystal', `${ASSET_BASE}/ui/crystal.svg`, { width: 140, height: 170 });
  }

  create(): void {
    this.input.dragDistanceThreshold = 4;
    this.effectLayer = this.add.layer().setDepth(70);
    this.uiLayer = this.add.layer().setDepth(100);
    this.createBackground();
    this.createBoard();
    this.createCrystal();
    this.createHud();
    this.createBench();
    this.createShop();
    this.createDragHandlers();
    this.refreshAll();
    this.showMessage(this.pendingIntroMessage ?? '先布阵，再点“开战”。商店英雄可拖到战斗区或备战区。');
  }

  update(time: number, delta: number): void {
    if (this.gameEnded) {
      return;
    }

    const dt = delta / 1000;
    this.updateWaveSpawner(time);
    this.updateMonsterStatuses(time, dt);
    this.updateMonsters(time, dt);
    this.updateHeroes(time, dt);
    this.checkWaveClear();
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x7acb63, 0x6fb957, 0x4d9848, 0x3a7f3e, 1);
    bg.fillRect(0, 0, WIDTH, HEIGHT);

    bg.fillStyle(0x8fd878, 0.32);
    bg.fillEllipse(190, 1035, 440, 160);
    bg.fillEllipse(688, 1075, 420, 150);
    bg.fillStyle(0x276a3a, 0.18);
    for (let i = 0; i < 46; i += 1) {
      bg.fillCircle(Phaser.Math.Between(22, WIDTH - 22), Phaser.Math.Between(210, 1180), Phaser.Math.Between(3, 10));
    }

    const topPanel = this.add.rectangle(WIDTH / 2, 136, WIDTH - 34, 248, 0x0d1210, 0.86).setDepth(90);
    topPanel.setStrokeStyle(2, 0xd6aa55, 0.28);
    const bottomPanel = this.add.rectangle(WIDTH / 2, 1300, WIDTH - 34, 600, 0x101512, 0.9);
    bottomPanel.setStrokeStyle(2, 0x70c7b4, 0.2);

    this.pathGraphics = this.add.graphics().setDepth(4);
    this.drawPaths();
  }

  private drawPaths(): void {
    this.pathGraphics.clear();
    const points = this.createPath('left', 0);
    this.pathGraphics.lineStyle(96, 0x6d5a36, 0.28);
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      this.pathGraphics.lineTo(points[i].x, points[i].y);
    }
    this.pathGraphics.strokePath();

    this.pathGraphics.lineStyle(78, 0xc2ac72, 0.98);
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      this.pathGraphics.lineTo(points[i].x, points[i].y);
    }
    this.pathGraphics.strokePath();

    this.pathGraphics.lineStyle(4, 0xf5df9f, 0.45);
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      this.pathGraphics.lineTo(points[i].x, points[i].y);
    }
    this.pathGraphics.strokePath();
  }

  private createBoard(): void {
    this.boardGraphics = this.add.graphics().setDepth(8);
    this.rangeGraphics = this.add.graphics().setDepth(28);
    this.slots = this.generateSlots();
    this.drawBoard();
  }

  private generateSlots(): Slot[] {
    const slots: Slot[] = [];
    for (let row = 0; row < BOARD_GRID.rows; row += 1) {
      for (let col = 0; col < BOARD_GRID.cols; col += 1) {
        slots.push({
          index: slots.length,
          row,
          col,
          x: BOARD_GRID.x + col * BOARD_GRID.cell,
          y: BOARD_GRID.y + row * BOARD_GRID.cell,
        });
      }
    }

    return slots
      .sort((a, b) => {
        const aDistance = Phaser.Math.Distance.Between(a.x, a.y, BOARD_CENTER.x, BOARD_CENTER.y);
        const bDistance = Phaser.Math.Distance.Between(b.x, b.y, BOARD_CENTER.x, BOARD_CENTER.y);
        return aDistance - bDistance;
      })
      .map((slot, index) => ({ ...slot, index }));
  }

  private drawBoard(): void {
    this.boardGraphics.clear();
    this.boardGraphics.fillStyle(0x3f8f43, 0.78);
    this.boardGraphics.lineStyle(5, 0x2c6f35, 0.65);
    this.boardGraphics.fillRoundedRect(BOARD_GRID.x - 60, BOARD_GRID.y - 60, (BOARD_GRID.cols - 1) * BOARD_GRID.cell + 120, (BOARD_GRID.rows - 1) * BOARD_GRID.cell + 120, 18);
    this.boardGraphics.strokeRoundedRect(BOARD_GRID.x - 60, BOARD_GRID.y - 60, (BOARD_GRID.cols - 1) * BOARD_GRID.cell + 120, (BOARD_GRID.rows - 1) * BOARD_GRID.cell + 120, 18);

    for (const slot of this.slots) {
      const unlocked = slot.index < this.gridCapacity;
      const occupied = Boolean(slot.occupant);
      const color = occupied ? slot.occupant!.def.color : unlocked ? 0x73bf55 : 0x2d7537;
      const alpha = occupied ? 0.36 : unlocked ? 0.74 : 0.34;
      this.boardGraphics.fillStyle(color, alpha);
      this.boardGraphics.lineStyle(4, unlocked ? 0x3a8738 : 0x23602e, unlocked ? 0.82 : 0.48);
      this.boardGraphics.fillRoundedRect(slot.x - 46, slot.y - 46, 92, 92, 6);
      this.boardGraphics.strokeRoundedRect(slot.x - 46, slot.y - 46, 92, 92, 6);
      if (!occupied) {
        this.drawCellPlus(this.boardGraphics, slot.x, slot.y, unlocked ? 0x2c7a35 : 0x1e5528, unlocked ? 0.58 : 0.3);
      }
    }
  }

  private drawCellPlus(graphics: Phaser.GameObjects.Graphics, x: number, y: number, color: number, alpha: number): void {
    graphics.fillStyle(color, alpha);
    graphics.fillRoundedRect(x - 8, y - 25, 16, 50, 5);
    graphics.fillRoundedRect(x - 25, y - 8, 50, 16, 5);
  }

  private createCrystal(): void {
    const pedestal = this.add.ellipse(CRYSTAL_POS.x, CRYSTAL_POS.y + 76, 120, 34, 0x6d5a36, 0.56).setDepth(9);
    pedestal.setStrokeStyle(3, 0xf5df9f, 0.3);
    const aura = this.add.ellipse(CRYSTAL_POS.x, CRYSTAL_POS.y + 54, 154, 66, 0x64ffe1, 0.14).setDepth(11);
    this.tweens.add({
      targets: aura,
      scaleX: 1.1,
      scaleY: 1.18,
      alpha: 0.22,
      yoyo: true,
      repeat: -1,
      duration: 1400,
      ease: 'Sine.easeInOut',
    });
    this.add.image(CRYSTAL_POS.x, CRYSTAL_POS.y + 6, 'crystal').setDepth(20).setScale(0.78);
  }

  private createHud(): void {
    const statCard = this.add.rectangle(170, 112, 280, 180, 0x142319, 0.92).setStrokeStyle(2, 0x8bcf8b, 0.28).setDepth(101);
    const actionCard = this.add.rectangle(402, 116, 214, 180, 0x142018, 0.88).setStrokeStyle(2, 0xf2ca73, 0.22).setDepth(101);
    const upgradeCard = this.add.rectangle(706, 116, 318, 180, 0x122019, 0.9).setStrokeStyle(2, 0x7dd8bc, 0.22).setDepth(101);
    this.uiLayer.add([statCard, actionCard, upgradeCard]);

    this.add.text(42, 28, '资源', this.textStyle(16, '#9fc9b2', 800)).setDepth(102);
    this.hudGold = this.add.text(42, 52, '', this.textStyle(28, '#ffe09a', 800)).setDepth(102);
    this.hudWave = this.add.text(42, 92, '', this.textStyle(22, '#e8fff8', 800)).setDepth(102);
    this.hudCrystal = this.add.text(42, 126, '', this.textStyle(20, '#9dfff0', 800)).setDepth(102);
    this.hudCapacity = this.add.text(42, 158, '', this.textStyle(19, '#cde9d2', 700)).setDepth(102);

    this.add.text(326, 35, '战斗控制', this.textStyle(17, '#fff4bd', 800)).setDepth(102);
    const battleButton = this.createButton(402, 68, 178, 48, '开战', 0xe96b45, () => this.startNextWave(), 21, 14);
    this.uiLayer.add(battleButton);
    const battleHotspot = this.add.rectangle(402, 68, 236, 72, 0xffffff, 0.001).setDepth(126).setInteractive();
    battleHotspot.on('pointerdown', () => {
      this.tweens.add({ targets: battleButton, scale: 0.96, duration: 55, yoyo: true });
      this.startNextWave();
    });
    this.uiLayer.add(battleHotspot);

    const expandButton = this.createButton(402, 126, 178, 40, '', 0x4fb591, () => this.buyGridExpansion(), 17, 6);
    this.expandLabel = expandButton.getByName('label') as Phaser.GameObjects.Text;
    this.uiLayer.add(expandButton);
    this.add.text(314, 161, '难度', this.textStyle(14, '#99c7ad', 800)).setDepth(102);
    DIFFICULTIES.forEach((difficulty, index) => {
      const active = difficulty.id === this.difficulty;
      const button = this.createButton(
        370 + index * 50,
        183,
        42,
        30,
        difficulty.shortName,
        active ? difficulty.color : 0x263b34,
        () => this.changeDifficulty(difficulty.id),
        14,
        5,
      );
      button.setAlpha(active ? 1 : 0.78);
      this.uiLayer.add(button);
    });

    this.add.text(558, 35, '基地升级', this.textStyle(17, '#fff4bd', 800)).setDepth(102);
    const positions: Array<[BaseUpgradeTrack['id'], number, number]> = [
      ['attack', 706, 72],
      ['speed', 706, 122],
      ['crystal', 706, 172],
    ];

    for (const [id, x, y] of positions) {
      const upgrade = BASE_UPGRADES.find((candidate) => candidate.id === id);
      if (!upgrade) {
        continue;
      }
      const button = this.createButton(x, y, 278, 40, '', 0x2d7363, () => this.buyBaseUpgrade(id), 16);
      this.baseLabels[id] = button.getByName('label') as Phaser.GameObjects.Text;
      this.uiLayer.add(button);
    }

    this.messageText = this.add.text(WIDTH / 2, 222, '', {
      ...this.textStyle(24, '#fff4bd', 800),
      align: 'center',
      backgroundColor: 'rgba(17, 23, 20, 0.78)',
      padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setDepth(150);
    this.messageText.setY(262);
  }

  private createBench(): void {
    this.add.text(34, 1056, '备战区', this.textStyle(26, '#e7fff1', 800)).setDepth(101);
    this.add.text(140, 1061, '可先合成，再拖入战斗区', this.textStyle(18, '#9fc9b2', 600)).setDepth(101);

    const startX = 66;
    const gap = 98;
    for (let i = 0; i < BENCH_SIZE; i += 1) {
      const x = startX + i * gap;
      const y = BENCH_Y;
      this.benchSlots.push({ index: i, x, y });
      const slot = this.add.rectangle(x, y, 82, 88, 0x18211d, 0.9).setDepth(100);
      slot.setStrokeStyle(2, 0x9edfbf, 0.24);
      this.add.text(x, y + 51, `${i + 1}`, this.textStyle(13, '#70947e', 700)).setOrigin(0.5).setDepth(101);
    }
  }

  private createShop(): void {
    this.add.text(34, 1192, '英雄商店', this.textStyle(26, '#ffe09a', 800)).setDepth(101);
    this.add.text(34, 1224, '大卡片拖拽购买，翻页查看全部英雄', this.textStyle(18, '#ccb782', 600)).setDepth(101);

    const prev = this.createButton(612, 1234, 86, 40, '上页', 0x2d7363, () => this.changeShopPage(-1), 16);
    const next = this.createButton(812, 1234, 86, 40, '下页', 0x2d7363, () => this.changeShopPage(1), 16);
    this.shopPageText = this.add.text(712, 1234, '', this.textStyle(17, '#e8fff8', 800)).setOrigin(0.5).setDepth(121);
    this.uiLayer.add([prev, next, this.shopPageText]);
    this.renderShopCards();
  }

  private createShopCard(hero: HeroDefinition, x: number, y: number, width: number, height: number): Phaser.GameObjects.Container {
    const card = this.add.container(x, y).setDepth(110).setSize(width, height);
    const bg = this.add.rectangle(0, 0, width, height, 0x18231e, 0.97).setStrokeStyle(3, hero.color, 0.58);
    const touchGlow = this.add.rectangle(0, 0, width + 18, height + 18, hero.color, 0.001);
    const iconBack = this.add.ellipse(-96, -2, 80, 92, hero.color, 0.2);
    const icon = this.add.image(-96, -8, `hero-${hero.id}`).setDisplaySize(72, 84);
    const name = this.add.text(-46, -42, hero.name, this.textStyle(22, '#fff5d0', 800));
    const title = this.add.text(-46, -12, hero.title, this.textStyle(16, '#aed9c2', 700));
    const meta = this.add.text(-46, 18, `${hero.cost}金  占${hero.size}格`, this.textStyle(16, '#ffd67d', 800));
    const hint = this.add.text(82, 38, '拖动', this.textStyle(15, '#8edfb7', 800)).setOrigin(0.5);
    card.add([touchGlow, bg, iconBack, icon, name, title, meta, hint]);
    card.setInteractive(new Phaser.Geom.Rectangle(-width / 2 - 18, -height / 2 - 18, width + 36, height + 36), Phaser.Geom.Rectangle.Contains);
    this.input.setDraggable(card);
    card.setData('payload', { kind: 'shop', heroId: hero.id } satisfies DragPayload);
    card.setData('homeX', x);
    card.setData('homeY', y);
    return card;
  }

  private renderShopCards(): void {
    for (const card of this.shopCards) {
      card.destroy();
    }
    this.shopCards = [];
    const pageSize = 6;
    const maxPage = Math.ceil(HEROES.length / pageSize) - 1;
    this.shopPage = Phaser.Math.Clamp(this.shopPage, 0, maxPage);
    this.shopPageText.setText(`${this.shopPage + 1}/${maxPage + 1}`);

    const cardWidth = 260;
    const cardHeight = 108;
    const gapX = 22;
    const gapY = 16;
    const startX = 34 + cardWidth / 2;
    const startIndex = this.shopPage * pageSize;

    HEROES.slice(startIndex, startIndex + pageSize).forEach((hero, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = startX + col * (cardWidth + gapX);
      const y = SHOP_Y + row * (cardHeight + gapY);
      const card = this.createShopCard(hero, x, y, cardWidth, cardHeight);
      this.shopCards.push(card);
      this.uiLayer.add(card);
    });
    this.refreshAll();
  }

  private changeShopPage(delta: number): void {
    const pageSize = 6;
    const maxPage = Math.ceil(HEROES.length / pageSize) - 1;
    this.shopPage = Phaser.Math.Wrap(this.shopPage + delta, 0, maxPage + 1);
    this.renderShopCards();
  }

  private createDragHandlers(): void {
    this.input.on('dragstart', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      const container = gameObject as Phaser.GameObjects.Container;
      container.setData('dragStartX', container.x);
      container.setData('dragStartY', container.y);
      container.setDepth(300);
      const payload = container.getData('payload') as DragPayload | undefined;
      container.setAlpha(payload?.kind === 'shop' ? 0.86 : 1);
      this.tweens.add({ targets: container, scale: payload?.kind === 'shop' ? 0.98 : 1.08, duration: 90, ease: 'Sine.easeOut' });
    });

    this.input.on('drag', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
      const container = gameObject as Phaser.GameObjects.Container;
      container.setPosition(dragX, dragY);
    });

    this.input.on('dragend', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      const container = gameObject as Phaser.GameObjects.Container;
      const payload = container.getData('payload') as DragPayload | undefined;
      if (!payload) {
        return;
      }

      const accepted = payload.kind === 'shop'
        ? this.handleShopDrop(payload, pointer.worldX, pointer.worldY)
        : this.handleHeroDrop(payload, pointer.worldX, pointer.worldY);

      if (payload.kind === 'shop') {
        this.returnContainerHome(container);
      } else if (!accepted) {
        this.returnHeroToLocation(payload.unitId);
      }

      this.tweens.add({ targets: container, scale: 1, duration: 110, ease: 'Sine.easeOut' });
      container.setAlpha(1);
      container.setDepth(110);
      this.refreshAll();
    });
  }

  private handleShopDrop(payload: DragPayload, x: number, y: number): boolean {
    if (!payload.heroId) {
      return false;
    }
    const def = getHeroDefinition(payload.heroId);
    const targetHero = this.findHeroAt(x, y);
    if (targetHero && this.canMergeUnits(def.id, 1, targetHero)) {
      if (!this.spendGold(def.cost)) {
        return false;
      }
      this.levelUpHero(targetHero);
      this.showMessage(`${def.name} 合成到 Lv.${targetHero.level}`);
      return true;
    }

    const slot = this.findSlotAt(x, y);
    if (slot) {
      const placement = this.findPlacement(def, slot.index);
      if (!placement) {
        this.showMessage('这些格子放不下该英雄，换个位置或先扩容。');
        return false;
      }
      if (!this.spendGold(def.cost)) {
        return false;
      }
      this.createHeroUnit(def, placement);
      return true;
    }

    const bench = this.findBenchAt(x, y);
    if (bench && !bench.occupant) {
      if (!this.spendGold(def.cost)) {
        return false;
      }
      this.createHeroUnit(def, { type: 'bench', index: bench.index });
      return true;
    }

    if (targetHero) {
      this.showMessage('只能与同类型、同等级英雄合成。');
    }
    return false;
  }

  private handleHeroDrop(payload: DragPayload, x: number, y: number): boolean {
    const unit = this.heroes.find((hero) => hero.uid === payload.unitId);
    if (!unit) {
      return false;
    }

    const targetHero = this.findHeroAt(x, y, unit.uid);
    if (targetHero && this.canMergeUnits(unit.def.id, unit.level, targetHero)) {
      this.removeHeroFromLocation(unit);
      this.destroyHero(unit);
      this.levelUpHero(targetHero);
      this.selectedHero = targetHero;
      this.showMessage(`${targetHero.def.name} 升到 Lv.${targetHero.level}`);
      return true;
    }

    const slot = this.findSlotAt(x, y);
    if (slot) {
      const placement = this.findPlacement(unit.def, slot.index, unit);
      if (!placement) {
        this.showMessage('这些格子放不下该英雄，换个位置或先扩容。');
        return false;
      }
      this.moveHeroTo(unit, placement);
      return true;
    }

    const bench = this.findBenchAt(x, y);
    if (bench && !bench.occupant) {
      this.moveHeroTo(unit, { type: 'bench', index: bench.index });
      return true;
    }

    if (targetHero) {
      this.showMessage('合成需要同类型且同等级。');
    }
    return false;
  }

  private createHeroUnit(def: HeroDefinition, location: HeroLocation): HeroUnit {
    const { x, y } = this.positionForLocation(location);
    const container = this.add.container(x, y).setDepth(60).setSize(82, 92);
    const ring = this.add.ellipse(0, 20, 68 + def.size * 8, 30 + def.size * 3, def.color, 0.18);
    ring.setStrokeStyle(2, def.accent, 0.42);
    const sprite = this.add.image(0, -14, `hero-${def.id}`).setDisplaySize(70 + def.size * 7, 82 + def.size * 6);
    const levelText = this.add.text(0, -57, 'Lv.1', this.textStyle(17, '#fff5cf', 900)).setOrigin(0.5);
    const hpBack = this.add.rectangle(-38, 46, 76, 8, 0x141414, 0.85).setOrigin(0, 0.5);
    const hpFill = this.add.rectangle(-38, 46, 76, 8, 0x6ff0a8, 1).setOrigin(0, 0.5);
    const sizeTag = this.add.text(36, 29, `${def.size}`, this.textStyle(15, '#ffd67d', 900)).setOrigin(0.5);
    container.add([ring, sprite, levelText, hpBack, hpFill, sizeTag]);
    container.setInteractive(new Phaser.Geom.Rectangle(-48, -68, 96, 128), Phaser.Geom.Rectangle.Contains);
    this.input.setDraggable(container);

    const stats = calculateHeroStats(def, 1, this.baseLevels);
    const unit: HeroUnit = {
      uid: this.heroUid,
      def,
      level: 1,
      hp: stats.maxHp,
      cooldown: Phaser.Math.FloatBetween(0.1, 0.7),
      attackCounter: 0,
      learned6: false,
      learned9: false,
      reviveUsedWave: -1,
      location,
      container,
      sprite,
      levelText,
      hpFill,
      ring,
    };
    this.heroUid += 1;
    container.setData('payload', { kind: 'hero', unitId: unit.uid } satisfies DragPayload);
    container.on('pointerup', () => {
      this.selectedHero = unit;
      this.renderSelectedPanel();
      this.refreshAll();
    });

    this.heroes.push(unit);
    this.assignHeroToLocation(unit, location);
    this.refreshHeroVisual(unit);
    return unit;
  }

  private destroyHero(unit: HeroUnit): void {
    this.heroes = this.heroes.filter((hero) => hero.uid !== unit.uid);
    if (this.selectedHero?.uid === unit.uid) {
      this.selectedHero = undefined;
    }
    unit.container.destroy();
  }

  private levelUpHero(unit: HeroUnit): void {
    if (!canMerge(unit.level)) {
      this.showMessage('英雄已达到最高等级。');
      return;
    }
    unit.level += 1;
    const stats = this.statsFor(unit);
    unit.hp = stats.maxHp;
    if (unit.level === 3) {
      this.flashAt(unit.container.x, unit.container.y - 44, 0xfff1a6, '技能觉醒');
    }
    this.refreshHeroVisual(unit);
    this.renderSelectedPanel();
  }

  private canMergeUnits(sourceHeroId: string, sourceLevel: number, target: HeroUnit): boolean {
    return target.def.id === sourceHeroId && target.level === sourceLevel && canMerge(target.level);
  }

  private moveHeroTo(unit: HeroUnit, location: HeroLocation): void {
    this.removeHeroFromLocation(unit);
    this.assignHeroToLocation(unit, location);
    const position = this.positionForLocation(location);
    this.tweens.add({
      targets: unit.container,
      x: position.x,
      y: position.y,
      duration: 130,
      ease: 'Sine.easeOut',
    });
  }

  private assignHeroToLocation(unit: HeroUnit, location: HeroLocation): void {
    unit.location = location;
    if (location.type === 'board') {
      for (const cell of location.cells) {
        this.slots[cell].occupant = unit;
      }
      const position = this.positionForLocation(location);
      unit.container.setDepth(50 + Math.floor(position.y / 10));
    } else {
      this.benchSlots[location.index].occupant = unit;
      unit.container.setDepth(120);
    }
  }

  private removeHeroFromLocation(unit: HeroUnit): void {
    if (unit.location.type === 'board') {
      for (const cell of unit.location.cells) {
        const slot = this.slots[cell];
        if (slot?.occupant?.uid === unit.uid) {
          slot.occupant = undefined;
        }
      }
    } else {
      const bench = this.benchSlots[unit.location.index];
      if (bench?.occupant?.uid === unit.uid) {
        bench.occupant = undefined;
      }
    }
  }

  private returnHeroToLocation(uid?: number): void {
    const unit = this.heroes.find((hero) => hero.uid === uid);
    if (!unit) {
      return;
    }
    const position = this.positionForLocation(unit.location);
    this.tweens.add({ targets: unit.container, x: position.x, y: position.y, duration: 140, ease: 'Back.easeOut' });
  }

  private returnContainerHome(container: Phaser.GameObjects.Container): void {
    const x = container.getData('homeX') as number;
    const y = container.getData('homeY') as number;
    this.tweens.add({ targets: container, x, y, duration: 130, ease: 'Back.easeOut' });
  }

  private positionForLocation(location: HeroLocation): { x: number; y: number } {
    if (location.type === 'board') {
      const cells = location.cells.map((cell) => this.slots[cell]);
      const x = cells.reduce((sum, slot) => sum + slot.x, 0) / cells.length;
      const y = cells.reduce((sum, slot) => sum + slot.y, 0) / cells.length;
      return { x, y: y - 20 };
    }
    const bench = this.benchSlots[location.index];
    return { x: bench.x, y: bench.y - 4 };
  }

  private findSlotAt(x: number, y: number): Slot | undefined {
    let best: Slot | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const slot of this.slots) {
      if (slot.index >= this.gridCapacity) {
        continue;
      }
      const distance = Phaser.Math.Distance.Between(x, y, slot.x, slot.y);
      if (distance < 66 && distance < bestDistance) {
        best = slot;
        bestDistance = distance;
      }
    }
    return best;
  }

  private findBenchAt(x: number, y: number): BenchSlot | undefined {
    return this.benchSlots.find((slot) => Phaser.Math.Distance.Between(x, y, slot.x, slot.y) < 52);
  }

  private findHeroAt(x: number, y: number, excludeUid?: number): HeroUnit | undefined {
    const slot = this.findSlotAt(x, y);
    if (slot?.occupant && slot.occupant.uid !== excludeUid) {
      return slot.occupant;
    }
    return this.heroes.find((hero) => hero.uid !== excludeUid && Phaser.Math.Distance.Between(x, y, hero.container.x, hero.container.y) < 72);
  }

  private findPlacement(def: HeroDefinition, targetIndex: number, movingUnit?: HeroUnit): BoardLocation | undefined {
    const target = this.slots[targetIndex];
    const offsets = this.shapeOffsets(def.size);
    const candidateAnchors = new Map<string, { row: number; col: number }>();

    for (const offset of offsets) {
      const row = target.row - offset.row;
      const col = target.col - offset.col;
      candidateAnchors.set(`${row}:${col}`, { row, col });
    }

    for (let rowDelta = -1; rowDelta <= 1; rowDelta += 1) {
      for (let colDelta = -1; colDelta <= 1; colDelta += 1) {
        const row = target.row + rowDelta;
        const col = target.col + colDelta;
        candidateAnchors.set(`${row}:${col}`, { row, col });
      }
    }

    const anchors = [...candidateAnchors.values()].sort((a, b) => (
      Phaser.Math.Distance.Between(a.col, a.row, target.col, target.row)
      - Phaser.Math.Distance.Between(b.col, b.row, target.col, target.row)
    ));

    for (const anchor of anchors) {
      const cells: number[] = [];
      let valid = true;
      for (const offset of offsets) {
        const slot = this.slotAt(anchor.row + offset.row, anchor.col + offset.col);
        if (!slot || slot.index >= this.gridCapacity || (slot.occupant && slot.occupant.uid !== movingUnit?.uid)) {
          valid = false;
          break;
        }
        cells.push(slot.index);
      }
      if (valid) {
        return { type: 'board', index: cells[0], cells };
      }
    }

    return undefined;
  }

  private shapeOffsets(size: HeroDefinition['size']): Array<{ row: number; col: number }> {
    if (size === 2) {
      return [{ row: 0, col: 0 }, { row: 0, col: 1 }];
    }
    if (size === 3) {
      return [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }];
    }
    return [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }];
  }

  private slotAt(row: number, col: number): Slot | undefined {
    return this.slots.find((slot) => slot.row === row && slot.col === col);
  }

  private usedCapacity(): number {
    return this.heroes
      .filter((hero) => hero.location.type === 'board')
      .reduce((total, hero) => total + (hero.location.type === 'board' ? hero.location.cells.length : 0), 0);
  }

  private statsFor(unit: HeroUnit): HeroStats {
    const stats = calculateHeroStats(unit.def, unit.level, this.baseLevels);
    if (unit.def.id === 'blade-dancer' && unit.learned6) {
      stats.attackRate = Number((stats.attackRate * 1.16).toFixed(2));
    }
    if (this.time.now < this.globalSpeedBuffUntil) {
      stats.attackRate = Number((stats.attackRate * 1.22).toFixed(2));
    }
    return stats;
  }

  private updateHeroes(time: number, dt: number): void {
    for (const hero of this.heroes) {
      if (hero.location.type !== 'board' || hero.hp <= 0) {
        continue;
      }
      hero.cooldown -= dt;
      if (hero.cooldown > 0) {
        continue;
      }
      const stats = this.statsFor(hero);
      const target = this.selectTarget(hero, stats);
      if (!target) {
        hero.cooldown = Math.min(0.25, 1 / stats.attackRate);
        continue;
      }
      this.performHeroAttack(hero, target, stats, time);
      hero.attackCounter += 1;
      hero.cooldown = 1 / Math.max(0.1, stats.attackRate);
    }
  }

  private selectTarget(hero: HeroUnit, stats: HeroStats): MonsterUnit | undefined {
    const inRange = this.monsters.filter((monster) => !monster.dead && Phaser.Math.Distance.Between(hero.container.x, hero.container.y, monster.container.x, monster.container.y) <= stats.range);
    if (inRange.length === 0) {
      return undefined;
    }
    if (hero.def.attackPattern === 'pierce') {
      return inRange.sort((a, b) => b.hp - a.hp)[0];
    }
    return inRange.sort((a, b) => b.progress - a.progress)[0];
  }

  private performHeroAttack(hero: HeroUnit, target: MonsterUnit, stats: HeroStats, time: number): void {
    const x = hero.container.x;
    const y = hero.container.y - 20;
    const tx = target.container.x;
    const ty = target.container.y - 10;
    const skill3 = hero.level >= 3;

    switch (hero.def.attackPattern) {
      case 'burn': {
        this.emberProjectileEffect(x, y, tx, ty, hero.def.color);
        this.damageMonster(target, stats.damage, hero);
        this.applyBurn(target, stats.damage * 0.24, time + 3200);
        if (hero.learned6) {
          this.nearbyMonsters(target, 120, 2).forEach((monster) => this.applyBurn(monster, stats.damage * 0.2, time + 2600));
        }
        if (hero.learned9 && hero.attackCounter % 5 === 4) {
          this.areaDamage(tx, ty, 115, stats.damage * 1.4, hero, 0xff7a35);
        }
        break;
      }
      case 'frostNova': {
        const radius = hero.learned6 ? 112 : 86;
        this.frostShardEffect(x, y, tx, ty);
        this.circleEffect(tx, ty, radius, 0x89e5ff, 460);
        for (const monster of this.monstersInRadius(tx, ty, radius)) {
          const bonus = skill3 && monster.status.slowUntil > time ? 1.35 : 1;
          this.damageMonster(monster, stats.damage * bonus, hero);
          this.applySlow(monster, hero.learned6 ? 0.42 : 0.55, time + (hero.learned6 ? 2600 : 1800));
        }
        if (hero.learned9 && hero.attackCounter % 6 === 5) {
          target.status.stunUntil = Math.max(target.status.stunUntil, time + 1200);
          this.flashAt(tx, ty - 35, 0xd8f6ff, '冻结');
        }
        break;
      }
      case 'chain': {
        const jumps = 2 + (skill3 ? 1 : 0) + (hero.learned6 ? 1 : 0);
        let current = target;
        let damage = stats.damage;
        const hit = new Set<number>();
        for (let i = 0; i <= jumps; i += 1) {
          hit.add(current.uid);
          this.lightningEffect(i === 0 ? x : tx, i === 0 ? y : ty, current.container.x, current.container.y - 10, 0xffeb62);
          this.damageMonster(current, damage, hero);
          if (hero.learned6) {
            current.status.stunUntil = Math.max(current.status.stunUntil, time + 180);
          }
          const next = this.nearbyMonsters(current, 150, 1).find((monster) => !hit.has(monster.uid));
          if (!next) {
            break;
          }
          current = next;
          damage *= hero.learned6 ? 0.82 : 0.68;
        }
        if (hero.learned9 && hero.attackCounter % 7 === 6) {
          const highest = this.monsters.filter((monster) => !monster.dead).sort((a, b) => b.hp - a.hp)[0];
          if (highest) {
            this.lightningEffect(BOARD_CENTER.x, BOARD_TOP, highest.container.x, highest.container.y, 0xfff69b, 6);
            this.damageMonster(highest, stats.damage * 2.1, hero);
          }
        }
        break;
      }
      case 'cleave': {
        const radius = hero.learned9 && hero.attackCounter % 6 === 5 ? 225 : 145;
        this.slashEffect(x, y + 22, radius, 0xff6377);
        this.circleEffect(x, y + 22, radius, 0xff6377, 220);
        for (const monster of this.monstersInRadius(x, y + 18, radius).slice(0, hero.learned9 ? 9 : 4 + (skill3 ? 1 : 0))) {
          this.damageMonster(monster, stats.damage * (hero.learned9 ? 1.2 : 1), hero);
        }
        break;
      }
      case 'healBeam': {
        this.beamEffect(x, y, tx, ty, 0xfff1a6);
        this.damageMonster(target, stats.damage, hero);
        const injured = this.heroes
          .filter((candidate) => candidate.location.type === 'board' && candidate.hp > 0)
          .sort((a, b) => (a.hp / this.statsFor(a).maxHp) - (b.hp / this.statsFor(b).maxHp))[0];
        if (injured && (skill3 || injured.hp < this.statsFor(injured).maxHp)) {
          this.healHero(injured, stats.damage * (hero.learned6 ? 1.15 : 0.9));
          this.beamEffect(x, y, injured.container.x, injured.container.y - 26, 0xffef95, 2);
        }
        break;
      }
      case 'pierce': {
        this.sniperBeamEffect(x, y, tx, ty);
        this.damageMonster(target, stats.damage * (hero.learned9 ? 1.65 : 1.2), hero);
        if (skill3) {
          this.nearbyMonsters(target, 175, hero.learned9 ? 3 : 1).forEach((monster) => {
            this.sniperBeamEffect(tx, ty, monster.container.x, monster.container.y);
            this.damageMonster(monster, stats.damage * 0.55, hero);
          });
        }
        if (hero.learned6) {
          target.status.vulnerableUntil = Math.max(target.status.vulnerableUntil, time + 2200);
          target.status.vulnerableMultiplier = Math.max(target.status.vulnerableMultiplier, 1.18);
        }
        break;
      }
      case 'bomb': {
        this.projectileEffect(x, y, tx, ty, 0xffb347, () => {
          this.areaDamage(tx, ty, hero.learned6 ? 108 : 84, stats.damage, hero, 0xffa442);
          if (skill3) {
            this.time.delayedCall(190, () => this.areaDamage(tx, ty, 56, stats.damage * 0.42, hero, 0xffd27a));
          }
        });
        if (hero.learned9 && hero.attackCounter % 8 === 0) {
          this.time.delayedCall(260, () => this.areaDamage(BOARD_CENTER.x, BOARD_CENTER.y, 180, stats.damage * 1.8, hero, 0xff8438));
        }
        break;
      }
      case 'poison': {
        this.poisonGlobEffect(x, y, tx, ty);
        this.damageMonster(target, stats.damage, hero);
        this.applyPoison(target, stats.damage * 0.36, time + 4200);
        if (skill3) {
          target.status.vulnerableUntil = Math.max(target.status.vulnerableUntil, time + 2600);
          target.status.vulnerableMultiplier = Math.max(target.status.vulnerableMultiplier, 1.15);
        }
        if (hero.learned6) {
          this.nearbyMonsters(target, 125, 2).forEach((monster) => this.applyPoison(monster, stats.damage * 0.24, time + 3200));
        }
        if (hero.learned9 && hero.attackCounter % 6 === 5) {
          this.circleEffect(tx, ty, 135, 0x7dff5f, 900);
          for (const monster of this.monstersInRadius(tx, ty, 135)) {
            monster.status.vulnerableUntil = Math.max(monster.status.vulnerableUntil, time + 3600);
            monster.status.vulnerableMultiplier = Math.max(monster.status.vulnerableMultiplier, 1.25);
          }
        }
        break;
      }
      case 'drone': {
        this.bulletProjectileEffect(x, y, tx, ty, hero.def.accent);
        this.damageMonster(target, stats.damage, hero);
        if (skill3) {
          const extra = this.nearbyMonsters(target, 130, hero.learned6 ? 2 : 1);
          extra.forEach((monster) => this.damageMonster(monster, stats.damage * 0.44, hero));
        }
        if (hero.learned9 && hero.attackCounter % 9 === 8) {
          this.globalSpeedBuffUntil = time + 3300;
          this.flashAt(BOARD_CENTER.x, BOARD_CENTER.y - 170, 0xffc15f, '全域装填');
        }
        break;
      }
      case 'tidal': {
        this.waveProjectileEffect(x, y, tx, ty);
        this.damageMonster(target, stats.damage, hero);
        this.rewindMonster(target, hero.learned9 ? 76 : 48);
        this.applySlow(target, 0.62, time + 1200);
        if (skill3) {
          this.damageMonster(target, stats.damage * 0.35, hero);
        }
        if (hero.learned6 && hero.attackCounter % 4 === 3) {
          this.circleEffect(BOARD_CENTER.x, BOARD_CENTER.y, 210, 0x3bb3b8, 520);
          for (const monster of this.monstersInRadius(BOARD_CENTER.x, BOARD_CENTER.y, 210)) {
            this.applySlow(monster, 0.58, time + 1600);
          }
        }
        break;
      }
      case 'gravity': {
        const radius = hero.learned6 ? 142 : 112;
        this.circleEffect(tx, ty, radius, 0x8c7cff, 650);
        for (const monster of this.monstersInRadius(tx, ty, radius)) {
          this.damageMonster(monster, stats.damage * 0.78, hero);
          this.applySlow(monster, 0.46, time + (hero.learned6 ? 2600 : 1700));
          if (skill3) {
            this.rewindMonster(monster, 28);
          }
        }
        if (hero.learned9 && hero.attackCounter % 7 === 6) {
          this.areaDamage(tx, ty, 168, stats.damage * 1.7, hero, 0x6d5bd0);
        }
        break;
      }
      case 'refract': {
        const hits = 1 + (skill3 ? 1 : 0) + (hero.learned6 ? 1 : 0) + (hero.learned9 ? 2 : 0);
        const targets = [target, ...this.nearbyMonsters(target, 190, hits - 1)];
        targets.forEach((monster, index) => {
          this.prismBeamEffect(index === 0 ? x : targets[index - 1].container.x, index === 0 ? y : targets[index - 1].container.y, monster.container.x, monster.container.y - 12, index % 2 ? 0x82fff6 : 0xff6ec7);
          this.damageMonster(monster, stats.damage * Math.pow(0.82, index), hero);
        });
        if (hero.learned9 && hero.attackCounter % 8 === 7) {
          this.flashAt(hero.container.x, hero.container.y - 72, 0xff6ec7, '万华镜');
        }
        break;
      }
    }
  }

  private updateWaveSpawner(time: number): void {
    if (!this.activeWave) {
      return;
    }
    const wave = this.activeWave.config;
    if (this.activeWave.spawned >= wave.count || time < this.activeWave.nextSpawnAt) {
      return;
    }
    const direction = wave.directions[this.activeWave.spawned % wave.directions.length];
    const kind = wave.types[this.activeWave.spawned % wave.types.length];
    this.spawnMonster(wave, direction, kind);
    this.activeWave.spawned += 1;
    this.activeWave.nextSpawnAt = time + wave.spawnEveryMs;
  }

  private spawnMonster(wave: WaveConfig, direction: Direction, kind: MonsterKind): void {
    const mod = MONSTER_TYPE_STATS[kind];
    const difficulty = getDifficultyConfig(this.difficulty);
    const isGold = wave.isGoldWave || kind.startsWith('gold');
    const tier = Math.min(4, Math.floor((wave.wave - 1) / 4));
    const offset = Phaser.Math.Between(-70, 70);
    const path = this.createPath(direction, offset);
    const start = path[0];
    const container = this.add.container(start.x, start.y).setDepth(40);
    const aura = this.add.ellipse(0, -18, 84 + tier * 8, 72 + tier * 7, isGold ? 0xffd36e : 0x92ffb8, isGold ? 0.2 : 0.05 + tier * 0.025);
    const sprite = this.add.image(0, -18, `monster-${kind}`).setScale(mod.scale);
    const hpBack = this.add.rectangle(-34, 45, 68, 7, 0x111111, 0.82).setOrigin(0, 0.5);
    const hpFill = this.add.rectangle(-34, 45, 68, 7, isGold ? 0xffd36e : 0xff6b5c, 1).setOrigin(0, 0.5);
    const badge = this.add.text(0, -78, isGold ? '金币' : `Lv.${wave.wave}`, this.textStyle(13, isGold ? '#fff1a6' : '#e7fff1', 900)).setOrigin(0.5).setAlpha(isGold ? 1 : 0.72);
    container.add([aura, sprite, hpBack, hpFill, badge]);
    const monster: MonsterUnit = {
      uid: this.monsterUid,
      kind,
      isGold,
      hp: Math.round(wave.hp * mod.hp * difficulty.hpMultiplier),
      maxHp: Math.round(wave.hp * mod.hp * difficulty.hpMultiplier),
      speed: wave.speed * mod.speed * difficulty.speedMultiplier,
      damage: isGold ? 0 : wave.damage * mod.damage,
      reward: Math.max(1, Math.round(wave.reward * mod.reward * difficulty.rewardMultiplier)),
      path,
      pathIndex: 1,
      progress: 0,
      attackCooldown: 0,
      attackingCrystal: false,
      dead: false,
      container,
      sprite,
      hpFill,
      status: {
        burnDps: 0,
        burnUntil: 0,
        poisonDps: 0,
        poisonUntil: 0,
        slowUntil: 0,
        slowFactor: 1,
        stunUntil: 0,
        vulnerableUntil: 0,
        vulnerableMultiplier: 1,
      },
    };
    this.monsterUid += 1;
    this.monsters.push(monster);
  }

  private createPath(direction: Direction, offset: number): Phaser.Math.Vector2[] {
    void direction;
    return [
      new Phaser.Math.Vector2(92 + offset * 0.15, BOARD_TOP - 150),
      new Phaser.Math.Vector2(92 + offset * 0.15, 918),
      new Phaser.Math.Vector2(802 + offset * 0.12, 918),
      new Phaser.Math.Vector2(802 + offset * 0.08, CRYSTAL_POS.y + 78),
      new Phaser.Math.Vector2(CRYSTAL_POS.x, CRYSTAL_POS.y + 34),
    ];
  }

  private updateMonsterStatuses(time: number, dt: number): void {
    for (const monster of [...this.monsters]) {
      if (monster.dead) {
        continue;
      }
      if (monster.status.burnUntil > time && monster.status.burnDps > 0) {
        this.damageMonster(monster, monster.status.burnDps * dt, undefined, false);
      }
      if (monster.status.poisonUntil > time && monster.status.poisonDps > 0) {
        this.damageMonster(monster, monster.status.poisonDps * dt, undefined, false);
      }
      if (monster.status.slowUntil <= time) {
        monster.status.slowFactor = 1;
      }
      if (monster.status.vulnerableUntil <= time) {
        monster.status.vulnerableMultiplier = 1;
      }
    }
  }

  private updateMonsters(time: number, dt: number): void {
    for (const monster of [...this.monsters]) {
      if (monster.dead) {
        continue;
      }
      monster.attackCooldown -= dt;
      this.refreshMonsterVisual(monster);

      if (monster.status.stunUntil > time) {
        continue;
      }

      const reachedCrystal = monster.pathIndex >= monster.path.length
        || Phaser.Math.Distance.Between(monster.container.x, monster.container.y, CRYSTAL_POS.x, CRYSTAL_POS.y + 34) < 52;

      if (monster.isGold) {
        if (reachedCrystal) {
          this.escapeMonster(monster);
          continue;
        }
        const speed = monster.speed * monster.status.slowFactor;
        this.moveMonsterAlongPath(monster, speed * dt);
        continue;
      }

      const targetStillValid = monster.targetHero
        && monster.targetHero.hp > 0
        && monster.targetHero.location.type === 'board'
        && Phaser.Math.Distance.Between(monster.container.x, monster.container.y, monster.targetHero.container.x, monster.targetHero.container.y) < 78;

      if (!targetStillValid) {
        monster.targetHero = this.findInterceptHero(monster);
      }

      if (monster.targetHero) {
        this.attackHero(monster, monster.targetHero);
        continue;
      }

      if (reachedCrystal) {
        monster.attackingCrystal = true;
        this.attackCrystal(monster);
        continue;
      }

      monster.attackingCrystal = false;
      const speed = monster.speed * monster.status.slowFactor;
      this.moveMonsterAlongPath(monster, speed * dt);
    }
  }

  private moveMonsterAlongPath(monster: MonsterUnit, distance: number): void {
    let remaining = distance;
    while (remaining > 0 && monster.pathIndex < monster.path.length) {
      const target = monster.path[monster.pathIndex];
      const current = new Phaser.Math.Vector2(monster.container.x, monster.container.y);
      const segmentDistance = current.distance(target);
      if (segmentDistance <= remaining) {
        monster.container.setPosition(target.x, target.y);
        monster.pathIndex += 1;
        remaining -= segmentDistance;
      } else {
        const t = remaining / segmentDistance;
        monster.container.setPosition(
          Phaser.Math.Linear(current.x, target.x, t),
          Phaser.Math.Linear(current.y, target.y, t),
        );
        remaining = 0;
      }
    }
    monster.progress = monster.pathIndex + (monster.pathIndex >= monster.path.length ? 1 : 0);
    monster.container.setDepth(35 + Math.floor(monster.container.y / 10));
  }

  private rewindMonster(monster: MonsterUnit, distance: number): void {
    if (monster.pathIndex <= 1) {
      return;
    }
    const previous = monster.path[Math.max(0, monster.pathIndex - 2)];
    const current = new Phaser.Math.Vector2(monster.container.x, monster.container.y);
    const segmentDistance = current.distance(previous);
    const t = Math.min(1, distance / Math.max(1, segmentDistance));
    monster.container.setPosition(
      Phaser.Math.Linear(current.x, previous.x, t),
      Phaser.Math.Linear(current.y, previous.y, t),
    );
    if (t >= 0.98) {
      monster.pathIndex = Math.max(1, monster.pathIndex - 1);
    }
  }

  private findInterceptHero(monster: MonsterUnit): HeroUnit | undefined {
    return this.heroes
      .filter((hero) => hero.location.type === 'board' && hero.hp > 0)
      .sort((a, b) => Phaser.Math.Distance.Between(monster.container.x, monster.container.y, a.container.x, a.container.y) - Phaser.Math.Distance.Between(monster.container.x, monster.container.y, b.container.x, b.container.y))
      .find((hero) => Phaser.Math.Distance.Between(monster.container.x, monster.container.y, hero.container.x, hero.container.y) < 62 + hero.def.size * 4);
  }

  private attackHero(monster: MonsterUnit, hero: HeroUnit): void {
    if (monster.attackCooldown > 0) {
      return;
    }
    const mitigation = 1 - this.baseLevels.crystal * 0.025;
    hero.hp -= monster.damage * mitigation;
    monster.attackCooldown = 1;
    this.lineEffect(monster.container.x, monster.container.y - 20, hero.container.x, hero.container.y - 18, 0xff6b5c, 2);
    this.refreshHeroVisual(hero);
    if (hero.hp <= 0) {
      this.handleHeroDefeated(hero);
      monster.targetHero = undefined;
    }
  }

  private attackCrystal(monster: MonsterUnit): void {
    if (monster.isGold) {
      this.escapeMonster(monster);
      return;
    }
    if (monster.attackCooldown > 0) {
      return;
    }
    this.crystalHp -= monster.damage;
    monster.attackCooldown = 1;
    this.cameras.main.shake(120, 0.0035);
    this.circleEffect(CRYSTAL_POS.x, CRYSTAL_POS.y + 34, 72, 0xff6b5c, 200);
    if (this.crystalHp <= 0) {
      this.crystalHp = 0;
      this.endGame(false);
    }
    this.refreshHud();
  }

  private handleHeroDefeated(hero: HeroUnit): void {
    const reviver = this.heroes.find((candidate) => candidate.def.id === 'sun-chanter' && candidate.learned9 && candidate.location.type === 'board' && candidate.reviveUsedWave !== this.currentWave && candidate.hp > 0);
    if (reviver) {
      reviver.reviveUsedWave = this.currentWave;
      const stats = this.statsFor(hero);
      hero.hp = stats.maxHp * 0.45;
      this.flashAt(hero.container.x, hero.container.y - 58, 0xfff1a6, '复苏');
      this.refreshHeroVisual(hero);
      return;
    }
    this.removeHeroFromLocation(hero);
    this.destroyHero(hero);
    this.refreshAll();
  }

  private damageMonster(monster: MonsterUnit, amount: number, source?: HeroUnit, showFlash = true): void {
    if (monster.dead) {
      return;
    }
    const multiplier = monster.status.vulnerableMultiplier;
    const finalDamage = amount * multiplier;
    monster.hp -= finalDamage;
    if (showFlash) {
      monster.sprite.setTint(source?.def.accent ?? 0xffffff);
      this.time.delayedCall(70, () => monster.sprite.clearTint());
    }
    if (monster.hp <= 0) {
      this.killMonster(monster);
    } else {
      this.refreshMonsterVisual(monster);
    }
  }

  private killMonster(monster: MonsterUnit): void {
    if (monster.dead) {
      return;
    }
    monster.dead = true;
    this.gold += monster.reward;
    this.flashAt(monster.container.x, monster.container.y - 40, 0xffd36e, `+${monster.reward}`);
    this.monsters = this.monsters.filter((candidate) => candidate.uid !== monster.uid);
    this.tweens.add({
      targets: monster.container,
      alpha: 0,
      scale: 0.55,
      y: monster.container.y - 18,
      duration: 180,
      onComplete: () => monster.container.destroy(),
    });
    this.refreshHud();
  }

  private escapeMonster(monster: MonsterUnit): void {
    if (monster.dead) {
      return;
    }
    monster.dead = true;
    this.flashAt(monster.container.x, monster.container.y - 44, 0xffd36e, '逃走');
    this.monsters = this.monsters.filter((candidate) => candidate.uid !== monster.uid);
    this.tweens.add({
      targets: monster.container,
      alpha: 0,
      scale: 0.72,
      x: CRYSTAL_POS.x + 42,
      duration: 220,
      ease: 'Sine.easeIn',
      onComplete: () => monster.container.destroy(),
    });
  }

  private applyBurn(monster: MonsterUnit, dps: number, until: number): void {
    monster.status.burnDps = Math.max(monster.status.burnDps, dps);
    monster.status.burnUntil = Math.max(monster.status.burnUntil, until);
  }

  private applyPoison(monster: MonsterUnit, dps: number, until: number): void {
    monster.status.poisonDps = Math.max(monster.status.poisonDps, dps);
    monster.status.poisonUntil = Math.max(monster.status.poisonUntil, until);
  }

  private applySlow(monster: MonsterUnit, factor: number, until: number): void {
    monster.status.slowFactor = Math.min(monster.status.slowFactor, factor);
    monster.status.slowUntil = Math.max(monster.status.slowUntil, until);
  }

  private areaDamage(x: number, y: number, radius: number, damage: number, source: HeroUnit, color: number): void {
    this.circleEffect(x, y, radius, color, 420);
    for (const monster of this.monstersInRadius(x, y, radius)) {
      this.damageMonster(monster, damage, source);
    }
  }

  private monstersInRadius(x: number, y: number, radius: number): MonsterUnit[] {
    return this.monsters.filter((monster) => !monster.dead && Phaser.Math.Distance.Between(x, y, monster.container.x, monster.container.y) <= radius);
  }

  private nearbyMonsters(monster: MonsterUnit, radius: number, limit: number): MonsterUnit[] {
    return this.monsters
      .filter((candidate) => candidate.uid !== monster.uid && !candidate.dead && Phaser.Math.Distance.Between(monster.container.x, monster.container.y, candidate.container.x, candidate.container.y) <= radius)
      .sort((a, b) => Phaser.Math.Distance.Between(monster.container.x, monster.container.y, a.container.x, a.container.y) - Phaser.Math.Distance.Between(monster.container.x, monster.container.y, b.container.x, b.container.y))
      .slice(0, limit);
  }

  private healHero(hero: HeroUnit, amount: number): void {
    const stats = this.statsFor(hero);
    hero.hp = Math.min(stats.maxHp, hero.hp + amount);
    this.refreshHeroVisual(hero);
    this.flashAt(hero.container.x, hero.container.y - 58, 0x9aff9a, `+${Math.round(amount)}`);
  }

  private refreshHeroVisual(hero: HeroUnit): void {
    const stats = this.statsFor(hero);
    hero.levelText.setText(`Lv.${hero.level}`);
    hero.hpFill.displayWidth = Math.max(1, 76 * Phaser.Math.Clamp(hero.hp / stats.maxHp, 0, 1));
    hero.ring.setFillStyle(hero.def.color, this.selectedHero?.uid === hero.uid ? 0.36 : 0.18);
    hero.container.setAlpha(hero.hp > 0 ? 1 : 0.45);
  }

  private refreshMonsterVisual(monster: MonsterUnit): void {
    monster.hpFill.displayWidth = Math.max(1, 68 * Phaser.Math.Clamp(monster.hp / monster.maxHp, 0, 1));
    if (monster.status.slowFactor < 1) {
      monster.sprite.setTint(0x9be9ff);
    } else if (monster.status.poisonUntil > this.time.now) {
      monster.sprite.setTint(0xa8ff73);
    } else if (monster.status.burnUntil > this.time.now) {
      monster.sprite.setTint(0xffa15f);
    } else {
      monster.sprite.clearTint();
    }
  }

  private changeDifficulty(difficulty: DifficultyId): void {
    if (difficulty === this.difficulty) {
      this.showMessage(`当前已是${getDifficultyConfig(difficulty).name}难度`);
      return;
    }
    this.scene.restart({ difficulty, restartedByDifficulty: true } satisfies SceneInitData);
  }

  private startNextWave(): void {
    if (this.activeWave || this.gameEnded) {
      if (this.activeWave) {
        this.showMessage(`第 ${this.currentWave} 波正在战斗中`);
      }
      return;
    }
    if (this.currentWave >= WAVES.length) {
      this.endGame(true);
      return;
    }
    this.currentWave += 1;
    const config = WAVES[this.currentWave - 1];
    this.activeWave = {
      config,
      spawned: 0,
      nextSpawnAt: this.time.now + 400,
    };
    const difficulty = getDifficultyConfig(this.difficulty);
    const waveType = config.isGoldWave ? '金币关！金币怪不攻击水晶，击杀掉更多金币' : '怪物已从左侧路线进攻';
    this.showMessage(`${difficulty.name}难度 · ${config.stageName}：${waveType}`);
    this.refreshHud();
  }

  private checkWaveClear(): void {
    if (!this.activeWave) {
      return;
    }
    if (this.activeWave.spawned >= this.activeWave.config.count && this.monsters.length === 0) {
      const difficulty = getDifficultyConfig(this.difficulty);
      const goldWaveBonus = this.activeWave.config.isGoldWave ? 1.45 : 1;
      const clearReward = Math.round((70 + this.currentWave * 18) * difficulty.clearRewardMultiplier * goldWaveBonus);
      this.gold += clearReward;
      this.showMessage(`${this.activeWave.config.stageName}完成，清波奖励 +${clearReward}`);
      this.activeWave = undefined;
      if (this.currentWave >= WAVES.length) {
        this.endGame(true);
      }
      this.refreshHud();
    }
  }

  private buyGridExpansion(): void {
    const expansion = nextGridExpansion(this.gridCapacity);
    if (!expansion) {
      this.showMessage('战斗格容量已满。');
      return;
    }
    if (!this.spendGold(expansion.cost)) {
      return;
    }
    this.gridCapacity = expansion.to;
    this.drawBoard();
    this.showMessage(`战斗容量扩展到 ${this.gridCapacity}`);
    this.refreshAll();
  }

  private buyBaseUpgrade(id: BaseUpgradeTrack['id']): void {
    const level = this.baseLevels[id];
    const cost = getBaseUpgradeCost(id, level);
    if (cost === null) {
      this.showMessage('该基地属性已满级。');
      return;
    }
    if (!this.spendGold(cost)) {
      return;
    }
    this.baseLevels[id] += 1;
    if (id === 'crystal') {
      this.crystalHp = Math.min(crystalMaxHp(this.baseLevels.crystal), this.crystalHp + 90);
    }
    for (const hero of this.heroes) {
      const stats = this.statsFor(hero);
      hero.hp = Math.min(stats.maxHp, hero.hp + 24);
      this.refreshHeroVisual(hero);
    }
    this.showMessage(`${BASE_UPGRADES.find((upgrade) => upgrade.id === id)?.name ?? '基地'} 升到 ${this.baseLevels[id]} 级`);
    this.refreshAll();
  }

  private learnSkill(hero: HeroUnit, level: 6 | 9): void {
    const skill = hero.def.skills.find((candidate) => candidate.level === level);
    if (!skill) {
      return;
    }
    if (hero.level < level) {
      this.showMessage(`英雄达到 ${level} 级后才能学习。`);
      return;
    }
    if ((level === 6 && hero.learned6) || (level === 9 && hero.learned9)) {
      return;
    }
    if (!this.spendGold(skill.cost)) {
      return;
    }
    if (level === 6) {
      hero.learned6 = true;
    } else {
      hero.learned9 = true;
    }
    this.flashAt(hero.container.x, hero.container.y - 64, hero.def.accent, skill.name);
    this.renderSelectedPanel();
    this.refreshAll();
  }

  private spendGold(amount: number): boolean {
    if (this.gold < amount) {
      this.showMessage(`金币不足，还差 ${amount - this.gold}`);
      return false;
    }
    this.gold -= amount;
    this.refreshHud();
    return true;
  }

  private refreshAll(): void {
    this.drawBoard();
    this.refreshHud();
    this.heroes.forEach((hero) => this.refreshHeroVisual(hero));
    this.renderSelectedPanel();
    this.updateRangeIndicator();
    for (const card of this.shopCards) {
      const payload = card.getData('payload') as DragPayload;
      const def = payload.heroId ? getHeroDefinition(payload.heroId) : undefined;
      card.setAlpha(def && this.gold < def.cost ? 0.58 : 1);
    }
  }

  private updateRangeIndicator(): void {
    this.rangeGraphics.clear();
    this.rangeText?.destroy();
    this.rangeText = undefined;

    const hero = this.selectedHero;
    if (!hero || !this.heroes.includes(hero) || hero.location.type !== 'board' || hero.hp <= 0) {
      return;
    }

    const stats = this.statsFor(hero);
    const x = hero.container.x;
    const y = hero.container.y;
    this.rangeGraphics.fillStyle(hero.def.color, 0.055);
    this.rangeGraphics.fillCircle(x, y, stats.range);
    this.rangeGraphics.lineStyle(3, hero.def.accent, 0.72);
    this.rangeGraphics.strokeCircle(x, y, stats.range);
    this.rangeGraphics.lineStyle(1, 0xffffff, 0.26);
    this.rangeGraphics.strokeCircle(x, y, Math.max(12, stats.range - 10));

    const labelY = Phaser.Math.Clamp(y - stats.range - 24, 276, 922);
    this.rangeText = this.add.text(x, labelY, `射程 ${stats.range}`, {
      ...this.textStyle(18, '#fff8d5', 900),
      align: 'center',
      backgroundColor: 'rgba(18, 32, 25, 0.82)',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(85);
  }

  private refreshHud(): void {
    const difficulty = getDifficultyConfig(this.difficulty);
    this.hudGold.setText(`金币 ${this.gold}`);
    this.hudWave.setText(`波次 ${this.currentWave}/${WAVES.length} · ${difficulty.name}`);
    this.hudCrystal.setText(`晶核 ${Math.ceil(this.crystalHp)}/${crystalMaxHp(this.baseLevels.crystal)}`);
    this.hudCapacity.setText(`战斗容量 ${this.usedCapacity()}/${this.gridCapacity}`);

    const expansion = nextGridExpansion(this.gridCapacity);
    this.expandLabel.setText(expansion ? `扩容 +${expansion.to - expansion.from}  ${expansion.cost}金` : '容量已满');

    for (const upgrade of BASE_UPGRADES) {
      const level = this.baseLevels[upgrade.id];
      const cost = getBaseUpgradeCost(upgrade.id, level);
      const label = this.baseLabels[upgrade.id];
      if (label) {
        label.setText(`${upgrade.name} Lv.${level}${cost === null ? ' 满' : `  ${cost}金`}`);
      }
    }
  }

  private renderSelectedPanel(): void {
    this.selectedPanel?.destroy();
    const panel = this.add.container(WIDTH / 2, SELECTED_PANEL_Y).setDepth(130);
    const bg = this.add.rectangle(0, 0, WIDTH - 64, 96, 0x141b17, 0.96).setStrokeStyle(2, 0xd6aa55, 0.28);
    panel.add(bg);

    if (!this.selectedHero || !this.heroes.includes(this.selectedHero)) {
      panel.add(this.add.text(-385, -17, '未选择英雄', this.textStyle(22, '#dfeedd', 800)));
      panel.add(this.add.text(-385, 15, '点击或拖拽英雄后可查看技能学习。', this.textStyle(17, '#8eb59d', 600)));
      this.selectedPanel = panel;
      return;
    }

    const hero = this.selectedHero;
    const stats = this.statsFor(hero);
    panel.add(this.add.image(-382, -2, `hero-${hero.def.id}`).setDisplaySize(58, 68));
    panel.add(this.add.text(-340, -34, `${hero.def.name} Lv.${hero.level}`, this.textStyle(22, '#fff4c8', 900)));
    panel.add(this.add.text(-340, -5, `伤害 ${stats.damage}  攻速 ${stats.attackRate}/秒  射程 ${stats.range}  生命 ${Math.ceil(hero.hp)}/${stats.maxHp}`, this.textStyle(15, '#c8e8d2', 700)));
    panel.add(this.add.text(-340, 22, `3级：${hero.def.skills[0].name}${hero.level >= 3 ? ' 已觉醒' : ' 未觉醒'}`, this.textStyle(15, '#9fc9b2', 700)));

    const skill6 = hero.def.skills[1];
    const skill9 = hero.def.skills[2];
    panel.add(this.createSkillButton(hero, 6, 126, -17, skill6.name, skill6.cost, hero.learned6));
    panel.add(this.createSkillButton(hero, 9, 320, -17, skill9.name, skill9.cost, hero.learned9));

    this.selectedPanel = panel;
  }

  private createSkillButton(hero: HeroUnit, level: 6 | 9, x: number, y: number, name: string, cost: number, learned: boolean): Phaser.GameObjects.Container {
    const available = hero.level >= level && !learned;
    const label = learned ? `${level}级 已学` : `${level}级 ${cost}金`;
    const button = this.createButton(x, y, 170, 48, label, available ? hero.def.color : 0x314139, () => this.learnSkill(hero, level), 16);
    const nameText = this.add.text(x, y + 34, name, this.textStyle(14, available ? '#fff1bf' : '#8ca598', 700)).setOrigin(0.5);
    const container = this.add.container(0, 0);
    container.add([button, nameText]);
    return container;
  }

  private createButton(x: number, y: number, width: number, height: number, label: string, color: number, onClick: () => void, fontSize = 21, hitPadding = 10): Phaser.GameObjects.Container {
    const button = this.add.container(x, y).setSize(width, height).setDepth(120);
    const bg = this.add.rectangle(0, 0, width, height, color, 0.88).setStrokeStyle(2, 0xffffff, 0.15);
    const text = this.add.text(0, 0, label, this.textStyle(fontSize, '#fff7df', 900)).setOrigin(0.5).setName('label');
    button.add([bg, text]);
    button.setInteractive(new Phaser.Geom.Rectangle(-width / 2 - hitPadding, -height / 2 - hitPadding, width + hitPadding * 2, height + hitPadding * 2), Phaser.Geom.Rectangle.Contains);
    button.on('pointerover', () => bg.setFillStyle(color, 1));
    button.on('pointerout', () => bg.setFillStyle(color, 0.88));
    button.on('pointerdown', () => {
      this.tweens.add({ targets: button, scale: 0.96, duration: 55, yoyo: true });
      onClick();
    });
    return button;
  }

  private emberProjectileEffect(x1: number, y1: number, x2: number, y2: number, color: number): void {
    this.fadingTrail(x1, y1, x2, y2, color, 0.32, 8);
    const ember = this.add.circle(x1, y1, 10, color, 0.95).setStrokeStyle(3, 0xfff0a8, 0.9).setDepth(84);
    const spark = this.add.circle(x1 - 10, y1 + 8, 4, 0xffd27a, 0.8).setDepth(83);
    this.effectLayer.add([ember, spark]);
    this.tweens.add({ targets: ember, x: x2, y: y2, scale: 0.7, duration: 230, ease: 'Sine.easeIn', onComplete: () => ember.destroy() });
    this.tweens.add({ targets: spark, x: x2 - 18, y: y2 + 12, alpha: 0, duration: 230, ease: 'Sine.easeIn', onComplete: () => spark.destroy() });
  }

  private frostShardEffect(x1: number, y1: number, x2: number, y2: number): void {
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2) + Math.PI / 2;
    const shard = this.add.triangle(x1, y1, 0, -18, 12, 14, -12, 14, 0xbcefff, 0.92).setStrokeStyle(2, 0xffffff, 0.9).setRotation(angle).setDepth(84);
    this.effectLayer.add(shard);
    this.fadingTrail(x1, y1, x2, y2, 0x9be9ff, 0.24, 5);
    this.tweens.add({ targets: shard, x: x2, y: y2, scale: 0.82, duration: 190, ease: 'Sine.easeOut', onComplete: () => shard.destroy() });
  }

  private lightningEffect(x1: number, y1: number, x2: number, y2: number, color: number, width = 4): void {
    const graphics = this.add.graphics().setDepth(86);
    const points = 7;
    graphics.lineStyle(width + 4, 0x7cf7ff, 0.18);
    this.drawJaggedLine(graphics, x1, y1, x2, y2, points, 12);
    graphics.lineStyle(width, color, 0.95);
    this.drawJaggedLine(graphics, x1, y1, x2, y2, points, 12);
    graphics.lineStyle(1, 0xffffff, 0.8);
    this.drawJaggedLine(graphics, x1, y1, x2, y2, points, 6);
    this.effectLayer.add(graphics);
    this.tweens.add({ targets: graphics, alpha: 0, duration: 160, onComplete: () => graphics.destroy() });
  }

  private drawJaggedLine(graphics: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, points: number, jitter: number): void {
    graphics.beginPath();
    graphics.moveTo(x1, y1);
    for (let i = 1; i < points; i += 1) {
      const t = i / points;
      graphics.lineTo(
        Phaser.Math.Linear(x1, x2, t) + Phaser.Math.Between(-jitter, jitter),
        Phaser.Math.Linear(y1, y2, t) + Phaser.Math.Between(-jitter, jitter),
      );
    }
    graphics.lineTo(x2, y2);
    graphics.strokePath();
  }

  private beamEffect(x1: number, y1: number, x2: number, y2: number, color: number, width = 4): void {
    const beam = this.add.graphics().setDepth(83);
    beam.lineStyle(width + 8, color, 0.16);
    beam.lineBetween(x1, y1, x2, y2);
    beam.lineStyle(width, color, 0.9);
    beam.lineBetween(x1, y1, x2, y2);
    beam.fillStyle(color, 0.9);
    beam.fillCircle(x2, y2, width + 3);
    this.effectLayer.add(beam);
    this.tweens.add({ targets: beam, alpha: 0, duration: 230, onComplete: () => beam.destroy() });
  }

  private sniperBeamEffect(x1: number, y1: number, x2: number, y2: number): void {
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);
    const distance = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const beam = this.add.rectangle((x1 + x2) / 2, (y1 + y2) / 2, distance, 5, 0xffffff, 0.92).setRotation(angle).setDepth(86);
    const glow = this.add.rectangle((x1 + x2) / 2, (y1 + y2) / 2, distance, 18, 0xc193ff, 0.18).setRotation(angle).setDepth(85);
    this.effectLayer.add([glow, beam]);
    this.tweens.add({ targets: [beam, glow], alpha: 0, duration: 170, onComplete: () => { beam.destroy(); glow.destroy(); } });
  }

  private poisonGlobEffect(x1: number, y1: number, x2: number, y2: number): void {
    this.fadingTrail(x1, y1, x2, y2, 0x7dff5f, 0.2, 7);
    const glob = this.add.ellipse(x1, y1, 18, 14, 0x9aff5f, 0.88).setStrokeStyle(2, 0x2b5132, 0.9).setDepth(84);
    this.effectLayer.add(glob);
    this.tweens.add({ targets: glob, x: x2, y: y2, rotation: 2.2, duration: 230, ease: 'Sine.easeIn', onComplete: () => glob.destroy() });
  }

  private bulletProjectileEffect(x1: number, y1: number, x2: number, y2: number, color: number): void {
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);
    for (let i = 0; i < 3; i += 1) {
      const bullet = this.add.rectangle(x1 - i * 8, y1 + i * 4, 28, 5, color, 0.92).setRotation(angle).setDepth(84);
      this.effectLayer.add(bullet);
      this.tweens.add({
        targets: bullet,
        x: x2 - i * 5,
        y: y2 + i * 3,
        alpha: 0.15,
        delay: i * 35,
        duration: 150,
        ease: 'Sine.easeIn',
        onComplete: () => bullet.destroy(),
      });
    }
  }

  private waveProjectileEffect(x1: number, y1: number, x2: number, y2: number): void {
    for (let i = 0; i < 3; i += 1) {
      const wave = this.add.ellipse(x1, y1 + i * 4, 28, 12, 0x62e4e8, 0.2).setStrokeStyle(3, 0x62e4e8, 0.72).setDepth(82);
      this.effectLayer.add(wave);
      this.tweens.add({
        targets: wave,
        x: x2,
        y: y2 + i * 3,
        width: 88,
        height: 34,
        alpha: 0,
        delay: i * 45,
        duration: 260,
        ease: 'Sine.easeOut',
        onComplete: () => wave.destroy(),
      });
    }
  }

  private prismBeamEffect(x1: number, y1: number, x2: number, y2: number, color: number): void {
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);
    const distance = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const main = this.add.rectangle((x1 + x2) / 2, (y1 + y2) / 2, distance, 6, color, 0.86).setRotation(angle).setDepth(86);
    const offset = this.add.rectangle((x1 + x2) / 2, (y1 + y2) / 2 + 6, distance, 3, color === 0x82fff6 ? 0xff6ec7 : 0x82fff6, 0.68).setRotation(angle).setDepth(86);
    this.effectLayer.add([main, offset]);
    this.tweens.add({ targets: [main, offset], alpha: 0, duration: 210, onComplete: () => { main.destroy(); offset.destroy(); } });
  }

  private slashEffect(x: number, y: number, radius: number, color: number): void {
    const slash = this.add.arc(x, y, radius * 0.45, 205, 335, false, color, 0).setStrokeStyle(10, color, 0.82).setDepth(85);
    this.effectLayer.add(slash);
    this.tweens.add({ targets: slash, scaleX: 1.28, scaleY: 1.12, alpha: 0, duration: 180, onComplete: () => slash.destroy() });
  }

  private fadingTrail(x1: number, y1: number, x2: number, y2: number, color: number, alpha: number, width: number): void {
    const trail = this.add.graphics().setDepth(81);
    trail.lineStyle(width, color, alpha);
    trail.lineBetween(x1, y1, x2, y2);
    this.effectLayer.add(trail);
    this.tweens.add({ targets: trail, alpha: 0, duration: 240, onComplete: () => trail.destroy() });
  }

  private lineEffect(x1: number, y1: number, x2: number, y2: number, color: number, width: number): void {
    const line = this.add.graphics().setDepth(80);
    line.lineStyle(width, color, 0.9);
    line.beginPath();
    line.moveTo(x1, y1);
    line.lineTo(x2, y2);
    line.strokePath();
    this.effectLayer.add(line);
    this.tweens.add({ targets: line, alpha: 0, duration: 180, onComplete: () => line.destroy() });
  }

  private circleEffect(x: number, y: number, radius: number, color: number, duration: number): void {
    const circle = this.add.ellipse(x, y, 24, 14, color, 0.16).setStrokeStyle(4, color, 0.8).setDepth(78);
    this.effectLayer.add(circle);
    this.tweens.add({
      targets: circle,
      width: radius * 2,
      height: radius,
      alpha: 0,
      duration,
      ease: 'Sine.easeOut',
      onComplete: () => circle.destroy(),
    });
  }

  private projectileEffect(x1: number, y1: number, x2: number, y2: number, color: number, onArrive: () => void): void {
    const projectile = this.add.circle(x1, y1, 11, color, 0.95).setStrokeStyle(3, 0xfff1b8, 0.72).setDepth(84);
    const shadow = this.add.ellipse(x1, y1 + 18, 24, 8, 0x1d1208, 0.26).setDepth(79);
    this.effectLayer.add([projectile, shadow]);
    const controlX = (x1 + x2) / 2;
    const controlY = Math.min(y1, y2) - 135;
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 340,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        const inv = 1 - t;
        const x = inv * inv * x1 + 2 * inv * t * controlX + t * t * x2;
        const y = inv * inv * y1 + 2 * inv * t * controlY + t * t * y2;
        projectile.setPosition(x, y);
        projectile.setScale(1 + Math.sin(t * Math.PI) * 0.55);
        shadow.setPosition(Phaser.Math.Linear(x1, x2, t), Phaser.Math.Linear(y1, y2, t) + 18);
        shadow.setScale(1 + t * 0.5, 1);
      },
      onComplete: () => {
        projectile.destroy();
        shadow.destroy();
        onArrive();
      },
    });
  }

  private flashAt(x: number, y: number, color: number, text: string): void {
    const label = this.add.text(x, y, text, this.textStyle(20, '#fff8d5', 900)).setOrigin(0.5).setDepth(160);
    label.setStroke(Phaser.Display.Color.IntegerToColor(color).rgba, 4);
    this.tweens.add({
      targets: label,
      y: y - 34,
      alpha: 0,
      duration: 760,
      ease: 'Sine.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  private showMessage(message: string): void {
    this.messageText?.setText(message);
    this.messageText?.setAlpha(1);
    this.tweens.killTweensOf(this.messageText);
    this.tweens.add({ targets: this.messageText, alpha: 0, delay: 2400, duration: 500 });
  }

  private endGame(victory: boolean): void {
    this.gameEnded = true;
    const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x050706, 0.72).setDepth(500);
    const title = this.add.text(WIDTH / 2, HEIGHT / 2 - 58, victory ? '通关成功' : '晶核破碎', this.textStyle(48, victory ? '#fff1a6' : '#ff9b8c', 900)).setOrigin(0.5).setDepth(501);
    const subtitle = this.add.text(WIDTH / 2, HEIGHT / 2 + 4, victory ? '20 波进攻已全部击退' : '调整阵容后重新挑战', this.textStyle(24, '#e7fff1', 800)).setOrigin(0.5).setDepth(501);
    const restart = this.createButton(WIDTH / 2, HEIGHT / 2 + 86, 210, 58, '重新开始', 0x4fb591, () => this.scene.restart({ difficulty: this.difficulty } satisfies SceneInitData));
    restart.setDepth(502);
    this.uiLayer.add([overlay, title, subtitle, restart]);
  }

  private textStyle(size: number, color: string, weight: number): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: '"Trebuchet MS", "Microsoft YaHei", "Noto Sans SC", sans-serif',
      fontSize: `${size}px`,
      color,
      fontStyle: weight >= 800 ? 'bold' : 'normal',
    };
  }
}
