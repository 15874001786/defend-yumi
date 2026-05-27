import Phaser from 'phaser';
import './styles.css';
import { BattleScene } from './game/scenes/BattleScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: 900,
  height: 1600,
  backgroundColor: '#111714',
  pixelArt: false,
  roundPixels: false,
  antialias: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 3,
  },
  scene: [BattleScene],
};

new Phaser.Game(config);
