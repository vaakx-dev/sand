import type { ThemePalette } from './contract'

const neutral = {
  '50': '#fafafa',
  '100': '#f5f5f5',
  '200': '#e5e5e5',
  '300': '#d4d4d4',
  '400': '#a3a3a3',
  '500': '#858585',
  '600': '#2b2b2b',
  '700': '#202020',
  '800': '#151515',
  '900': '#000000',
  '950': '#000000',
}

const accent = {
  '50': '#ffffff',
  '100': '#fdfdfd',
  '200': '#fbfbfb',
  '300': '#f8f8f8',
  '400': '#f5f5f5',
  '500': '#e5e5e5',
  '600': '#c4c4c4',
  '700': '#8f8f8f',
  '800': '#5c5c5c',
  '900': '#333333',
  '950': '#0a0a0a',
}

const success = {
  '50': '#f0fdf4',
  '100': '#dcfce7',
  '200': '#bbf7d0',
  '300': '#86efac',
  '400': '#4ade80',
  '500': '#22c55e',
  '600': '#16a34a',
  '700': '#15803d',
  '800': '#166534',
  '900': '#14532d',
  '950': '#0e1f16',
}

const warning = {
  '50': '#fffbeb',
  '100': '#fef3c7',
  '200': '#fde68a',
  '300': '#fcd34d',
  '400': '#fbbf24',
  '500': '#f59e0b',
  '600': '#d97706',
  '700': '#b45309',
  '800': '#92400e',
  '900': '#78350f',
  '950': '#211b0c',
}

const danger = {
  '50': '#fef2f2',
  '100': '#fee2e2',
  '200': '#fecaca',
  '300': '#fca5a5',
  '400': '#f87171',
  '500': '#ef4444',
  '600': '#dc2626',
  '700': '#b91c1c',
  '800': '#991b1b',
  '900': '#7f1d1d',
  '950': '#221112',
}

const orange = {
  '300': '#fdba74',
  '400': '#f08a3c',
  '500': '#f97316',
}

const sky = {
  '300': '#7dd3fc',
  '400': '#38bdf8',
  '500': '#0ea5e9',
}

const info = {
  '300': '#93c5fd',
  '400': '#60a5fa',
  '500': '#3b82f6',
}

export const sandPalette = { accent, neutral, success, warning, danger, info, orange, sky } satisfies ThemePalette
