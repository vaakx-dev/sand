export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'merged' | 'run'

export const toneText: Record<Tone, string> = {
  neutral: 'text-neutral-500',
  accent: 'text-accent-400',
  success: 'text-success-400',
  warning: 'text-warning-400',
  danger: 'text-danger-400',
  merged: 'text-violet-400',
  run: 'text-info-400',
}
