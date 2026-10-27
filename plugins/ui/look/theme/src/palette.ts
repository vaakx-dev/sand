import type { ThemePalette } from './contract'

const neutral = {
  '50': '#fafafa',
  '100': '#f2f2f3',
  '200': '#dcdcdf',
  '300': '#c9c9cc',
  '400': '#a3a3a9',
  '500': '#7c7c82',
  '600': '#2c2c30',
  '700': '#202023',
  '800': '#18181a',
  '900': '#0e0e0f',
  '950': '#050506',
}

const accent = {
  '50': '#fbf8f1',
  '100': '#f5eedd',
  '200': '#ecdcbc',
  '300': '#e2c897',
  '400': '#d8b47a',
  '500': '#c89d5e',
  '600': '#ad8148',
  '700': '#8c663a',
  '800': '#6c4f30',
  '900': '#4d3a26',
  '950': '#1e1913',
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

export const sandPalette = { accent, neutral, success, warning, danger, orange, sky } satisfies ThemePalette
