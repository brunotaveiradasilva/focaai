import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';

import { Area, SubjectId } from '@/data/catalog';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export const SUBJECT_ICON: Record<SubjectId, IconName> = {
  mat: 'calculator',
  por: 'book',
  red: 'create',
  fis: 'magnet',
  qui: 'flask',
  bio: 'leaf',
  his: 'hourglass',
  geo: 'earth',
};

export const AREA_STYLE: Record<Area, { color: string; icon: IconName }> = {
  linguagens: { color: '#7C8CF8', icon: 'chatbubbles' },
  humanas: { color: '#E8B34D', icon: 'earth' },
  natureza: { color: '#6FD49A', icon: 'flask' },
  matematica: { color: '#3FE0F0', icon: 'calculator' },
};

const channels = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// Darker tone of a subject color, used for the "3D" base under roadmap buttons.
export const shade = (hex: string, factor = 0.62) =>
  `#${channels(hex)
    .map((c) => Math.round(c * factor).toString(16).padStart(2, '0'))
    .join('')}`;

// Dark ink on bright subject colors, white on the dim ones (e.g. Geografia's slate).
export const onColor = (hex: string) => {
  const [r, g, b] = channels(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 140 ? '#05080D' : '#FFFFFF';
};
