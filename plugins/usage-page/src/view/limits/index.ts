import type { Billing, Limits, ProviderInfo } from '@sand/protocol'
import { ago, div, exactTime, providerColor, providerIcon, section, span, type Sig } from '@sand/dom'
import { heading, muted } from '../parts'
import { statusBadge, windowCard } from './card'

export interface ProviderLimits extends ProviderInfo {
  order: number
  limits?: Limits
}

const billingLabels: Record<Billing, string> = { plan: 'Plan', api: 'API key', credits: 'Credits', local: 'Local' }

const emptyNotes: Record<Billing, string> = {
  plan: 'Limits show here after the next reply, or check now.',
  api: 'Billed per token. This provider reports no plan limits.',
  credits: 'Prepaid credits. This provider reports no limits.',
  local: 'Runs on this machine, with no limits or cost.',
}

const checked = (limits: Limits, now: Sig<number>) =>
  span({ class: 'text-xs text-neutral-500 tabular-nums', title: `Checked ${exactTime(limits.updated)}` }, () => {
    now.get()
    const since = ago(limits.updated)
    return since === 'now' ? 'Checked just now' : `Checked ${since} ago`
  })

const providerSection = (provider: ProviderLimits, now: Sig<number>) => {
  const windows = provider.limits?.windows ?? []
  const color = providerColor(provider.id, provider.order)
  return section(
    { class: 'flex flex-col gap-3' },
    div(
      { class: 'flex flex-wrap items-center gap-x-3 gap-y-1' },
      heading(providerIcon(provider.id, 16), provider.label, muted(billingLabels[provider.billing])),
      statusBadge(provider.limits?.status),
      provider.limits ? div({ class: 'ml-auto' }, checked(provider.limits, now)) : null,
    ),
    windows.length
      ? windows.map(window => windowCard(window, color, now))
      : div({ class: 'rounded-xl border border-neutral-800 p-4 text-xs text-neutral-500' }, emptyNotes[provider.billing]),
  )
}

export const limitsView = (providers: ProviderLimits[], now: Sig<number>) =>
  div(
    { class: 'flex flex-col gap-8' },
    providers.length ? providers.map(provider => providerSection(provider, now)) : muted('No provider is loaded.'),
  )
