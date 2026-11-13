import type { LimitWindow } from '@sand/accounts/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { modelShades, swatch, TONE_TEXT, toneOf } from '@sand/usage-page/contract'
import { type ThreadAccount, type ThreadModel, type ThreadUsage, tokensOf, usageCost } from '@sand/usage/contract'
import { leftOf, percent, tokens } from '@sand/util'
import { div, dynamicChild, span, type Sig } from '@vaakx-dev/vrui'

const count = new Intl.NumberFormat('en')

const modelName = ({ label, subagents }: ThreadModel) => (subagents ? `${label}, ${subagents} ${subagents === 1 ? 'subagent' : 'subagents'}` : label)

const shareBar = (models: ThreadModel[], shade: ReturnType<typeof modelShades<ThreadModel>>) => {
  const total = models.reduce((sum, model) => sum + model.cost, 0)
  if (!total) return null
  return div(
    { class: 'mx-2 mb-1.5 flex overflow-hidden rounded-full', style: { height: '2px' } },
    models.map(model => div({ class: 'h-full', style: { width: `${(model.cost / total) * 100}%`, backgroundColor: shade(model).color, opacity: shade(model).opacity } })),
  )
}

const totalsLine = ({ total }: ThreadUsage) =>
  [`${tokens(tokensOf(total.usage))} tokens`, total.usage.cacheRead ? `${tokens(total.usage.cacheRead)} from cache` : '', `${count.format(total.turns)} ${total.turns === 1 ? 'turn' : 'turns'}`]
    .filter(Boolean)
    .join(' · ')

const threadPart = (kit: Kit, usage: ThreadUsage) => {
  const shade = modelShades(kit, usage.models)
  return div(
    { class: 'flex flex-col pb-1' },
    kit.cardCaption(span({ class: 'flex-1' }, 'This thread'), span({ class: 'text-neutral-200 tabular-nums' }, usageCost(usage.total))),
    shareBar(usage.models, shade),
    div(
      { class: 'flex flex-col gap-px px-2 text-xs' },
      usage.models.map(model =>
        div(
          { class: 'flex items-center gap-2' },
          swatch(shade(model)),
          span({ class: 'min-w-0 truncate text-neutral-200' }, modelName(model)),
          span({ class: 'ml-auto text-neutral-500 tabular-nums' }, usageCost(model)),
        ),
      ),
      div({ class: 'pt-1 text-neutral-500' }, totalsLine(usage)),
    ),
  )
}

const limitRow = (window: LimitWindow, now: number) => {
  const tone = toneOf(window, now)
  const left = leftOf(window)
  return div(
    { class: 'flex items-center gap-3 px-2 py-1 text-xs' },
    span({ class: 'w-24 shrink-0 truncate text-neutral-400' }, window.label),
    div(
      { class: 'min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-700', style: { height: '2px' } },
      div({ class: ['h-full rounded-full', tone === 'even' ? 'bg-neutral-100' : 'bg-current', TONE_TEXT[tone]], style: { width: `${left * 100}%` } }),
    ),
    span({ class: ['w-10 shrink-0 text-right font-medium tabular-nums', tone === 'even' ? 'text-neutral-200' : TONE_TEXT[tone]] }, tone === 'out' ? 'Out' : percent(left)),
  )
}

const planPart = (kit: Kit, { label, pcName, limits }: ThreadAccount, now: Sig<number>) =>
  limits?.windows.length
    ? div(
        { class: 'flex flex-col pb-1' },
        kit.cardRule(),
        kit.cardCaption(span({ class: 'flex-1' }, 'Plan'), span({ class: 'truncate' }, pcName ? `${label} · ${pcName}` : label)),
        dynamicChild(now, at => div({ class: 'flex flex-col' }, limits.windows.map(window => limitRow(window, at)))),
      )
    : null

export const usageCard = (kit: Kit, usage: ThreadUsage, now: Sig<number>) =>
  div({ class: 'flex min-w-0 flex-col' }, threadPart(kit, usage), usage.account ? planPart(kit, usage.account, now) : null)
