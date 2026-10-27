export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

export const toneText: Record<Tone, string> = {
  neutral: 'text-neutral-400',
  accent: 'text-accent-400',
  success: 'text-success-400',
  warning: 'text-warning-400',
  danger: 'text-danger-400',
}
