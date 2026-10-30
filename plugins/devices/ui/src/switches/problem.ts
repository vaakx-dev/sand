import type { TailscaleState } from '@sand/devices-contract'

export interface TailscaleFix {
  label: string
  url: string
}

export interface TailscaleProblem {
  text: string
  fix?: TailscaleFix
}

const consentLink = (error: string | undefined) => error?.match(/https:\/\/login\.tailscale\.com\/[^\s"'<>]+/)?.[0]?.replace(/[.,)]+$/, '')

export const tailscaleProblem = (state: TailscaleState, name: string): TailscaleProblem | undefined => {
  if (!state.installed) return { text: `Tailscale isn’t installed on ${name}.`, fix: { label: 'Get Tailscale', url: 'https://tailscale.com/download' } }
  if (!state.running) return { text: `Tailscale is signed out on ${name}.`, fix: { label: 'Open Tailscale', url: 'https://login.tailscale.com/admin/machines' } }
  const consent = consentLink(state.error)
  if (consent) return { text: 'Your Tailscale account doesn’t allow secure addresses yet. Turn them on, then try again.', fix: { label: 'Turn them on', url: consent } }
  return state.error ? { text: state.error } : undefined
}
