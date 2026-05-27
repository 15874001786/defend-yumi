import type { WaveConfig } from '../types';

export const WAVES: WaveConfig[] = Array.from({ length: 20 }, (_, index) => {
  const wave = index + 1;
  const eliteStep = Math.floor(index / 5);
  const types: WaveConfig['types'] = wave < 4
    ? ['scout']
    : wave < 8
      ? ['scout', 'runner']
      : wave < 13
        ? ['scout', 'runner', 'brute']
        : ['scout', 'runner', 'brute', 'shield'];

  return {
    wave,
    count: 10 + wave * 2 + eliteStep * 2,
    hp: Math.round(80 * Math.pow(1.18, index) + wave * 14),
    speed: 42 + wave * 1.8,
    damage: 18 + wave * 2.6,
    reward: 14 + wave * 4,
    spawnEveryMs: Math.max(330, 820 - wave * 18),
    directions: ['left'],
    types,
  };
});
