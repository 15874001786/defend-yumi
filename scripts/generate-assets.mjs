import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const heroDir = join(root, 'public', 'assets', 'heroes');
const monsterDir = join(root, 'public', 'assets', 'monsters');
const uiDir = join(root, 'public', 'assets', 'ui');

mkdirSync(heroDir, { recursive: true });
mkdirSync(monsterDir, { recursive: true });
mkdirSync(uiDir, { recursive: true });

const heroes = [
  ['ember-warden', '#f06a3a', '#ffc15f', '#351513', '火', 'M42 24 C56 34 67 48 64 67 C61 86 47 96 32 93 C46 76 28 66 40 48 C45 40 38 34 42 24 Z'],
  ['frost-marshal', '#7bd6ff', '#e8fbff', '#12314a', '霜', 'M32 20 L58 31 L62 61 L42 94 L21 61 L24 31 Z'],
  ['storm-caller', '#ffdf47', '#7cf7ff', '#2c2342', '雷', 'M46 16 L30 49 L48 49 L36 90 L68 41 L50 42 Z'],
  ['blade-dancer', '#d34c5f', '#f5d8bf', '#291719', '刃', 'M23 74 C33 52 48 31 70 17 C63 40 49 66 31 91 Z'],
  ['sun-chanter', '#ffb84d', '#fff1a6', '#3b2611', '日', 'M45 17 L54 35 L74 35 L59 49 L64 69 L45 59 L26 69 L31 49 L16 35 L36 35 Z'],
  ['arc-sniper', '#c193ff', '#ffffff', '#1d1530', '弧', 'M23 58 L70 25 L76 32 L35 78 L23 82 Z'],
  ['bomb-chef', '#f2a23a', '#7a3320', '#26150d', '爆', 'M45 20 C64 20 76 35 76 53 C76 75 63 92 45 92 C27 92 14 75 14 53 C14 35 26 20 45 20 Z'],
  ['venom-alchemist', '#7ac943', '#d7ff73', '#172916', '毒', 'M23 24 H67 L58 48 C69 61 62 91 45 91 C28 91 20 61 32 48 Z'],
  ['gear-tinkerer', '#aec3c0', '#ffb347', '#202323', '齿', 'M45 18 L53 28 L66 25 L68 39 L80 45 L70 56 L72 70 L58 72 L51 83 L39 83 L32 72 L18 70 L20 56 L10 45 L22 39 L24 25 L37 28 Z'],
  ['tide-monk', '#3bb3b8', '#e4fff8', '#10292d', '潮', 'M17 67 C34 25 62 25 78 67 C63 55 55 91 33 91 C22 91 14 81 17 67 Z'],
  ['void-weaver', '#6d5bd0', '#b7a5ff', '#10091d', '虚', 'M45 14 C66 14 80 29 80 50 C80 75 62 94 45 94 C27 94 10 75 10 50 C10 29 25 14 45 14 Z'],
  ['prism-oracle', '#ff6ec7', '#82fff6', '#26112d', '棱', 'M45 12 L78 50 L45 96 L12 50 Z'],
];

function heroSvg([id, main, accent, dark, mark, silhouette]) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 112">
  <defs>
    <radialGradient id="a" cx="34%" cy="22%" r="80%">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="62%" stop-color="${main}"/>
      <stop offset="100%" stop-color="${dark}"/>
    </radialGradient>
    <filter id="s" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000" flood-opacity=".45"/>
    </filter>
  </defs>
  <ellipse cx="48" cy="100" rx="32" ry="8" fill="#050706" opacity=".42"/>
  <g filter="url(#s)">
    <path d="${silhouette}" fill="url(#a)" stroke="${accent}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="45" cy="50" r="15" fill="${dark}" opacity=".72"/>
    <circle cx="39" cy="48" r="3" fill="${accent}"/>
    <circle cx="51" cy="48" r="3" fill="${accent}"/>
    <path d="M33 69 C39 76 53 76 59 69" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round" opacity=".88"/>
    <text x="48" y="107" text-anchor="middle" font-size="15" font-family="Microsoft YaHei, sans-serif" font-weight="800" fill="${accent}">${mark}</text>
  </g>
</svg>`;
}

for (const hero of heroes) {
  writeFileSync(join(heroDir, `${hero[0]}.svg`), heroSvg(hero), 'utf8');
}

const monsters = [
  ['scout', '#9a6b4f', '#f0cf8b', 'M15 60 C15 34 31 18 50 18 C69 18 85 34 85 60 C85 83 72 98 50 98 C28 98 15 83 15 60 Z'],
  ['runner', '#c76a40', '#ffd16a', 'M19 79 C25 42 42 16 70 19 C61 38 79 54 70 82 C55 101 32 99 19 79 Z'],
  ['brute', '#5f6b4c', '#d5e388', 'M10 59 C10 30 30 13 51 13 C72 13 90 30 90 59 C90 87 71 104 51 104 C30 104 10 87 10 59 Z'],
  ['shield', '#53606d', '#d7edf1', 'M50 10 L86 28 L80 73 C75 94 62 104 50 107 C38 104 25 94 20 73 L14 28 Z'],
];

function monsterSvg([id, main, accent, shape]) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 112">
  <defs>
    <linearGradient id="m" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="${main}"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="5" flood-color="#000" flood-opacity=".5"/>
    </filter>
  </defs>
  <ellipse cx="50" cy="101" rx="31" ry="7" fill="#050706" opacity=".45"/>
  <g filter="url(#shadow)">
    <path d="${shape}" fill="url(#m)" stroke="#231816" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="38" cy="53" r="5" fill="#211211"/>
    <circle cx="63" cy="53" r="5" fill="#211211"/>
    <path d="M35 75 C45 68 55 68 66 75" fill="none" stroke="#211211" stroke-width="4" stroke-linecap="round"/>
  </g>
</svg>`;
}

for (const monster of monsters) {
  writeFileSync(join(monsterDir, `${monster[0]}.svg`), monsterSvg(monster), 'utf8');
}

writeFileSync(join(uiDir, 'crystal.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 170">
  <defs>
    <linearGradient id="c" x1="25%" y1="0%" x2="75%" y2="100%">
      <stop offset="0%" stop-color="#fff7bf"/>
      <stop offset="45%" stop-color="#62ffe5"/>
      <stop offset="100%" stop-color="#3c68ff"/>
    </linearGradient>
    <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="7" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <ellipse cx="70" cy="150" rx="48" ry="11" fill="#050706" opacity=".45"/>
  <path d="M70 8 L116 55 L95 132 L70 160 L45 132 L24 55 Z" fill="url(#c)" stroke="#e8fff8" stroke-width="5" filter="url(#glow)"/>
  <path d="M70 8 L70 160 M24 55 L116 55 M45 132 L95 132" stroke="#ffffff" stroke-opacity=".45" stroke-width="3"/>
</svg>`, 'utf8');

console.log(`Generated ${heroes.length} hero assets, ${monsters.length} monster assets, and crystal asset.`);
