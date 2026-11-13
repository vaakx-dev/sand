import type { Kit } from '@sand/ui-kit/contract'
import { modelShades, swatch } from '@sand/usage-page/contract'
import { type ThreadModel, type ThreadUsage, tokensOf, usageCost } from '@sand/usage/contract'
import { tokens } from '@sand/util'
import { div, span, type Sig } from '@vaakx-dev/vrui'

type Shades = ReturnType<typeof modelShades<ThreadModel>>

const count = new Intl.NumberFormat('en')

const modelName = ({ label, subagents }: ThreadModel) => (subagents ? `${label}, ${subagents} ${subagents === 1 ? 'subagent' : 'subagents'}` : label)

const shareBar = (models: ThreadModel[], shade: Shades) => {
  const total = models.reduce((sum, model) => sum + model.cost, 0)
  if (!total) return null
  return div(
    { class: 'flex w-full overflow-hidden rounded-full', style: { height: '2px' } },
    models.map(model => div({ class: 'h-full', style: { width: `${(model.cost / total) * 100}%`, backgroundColor: shade(model).color, opacity: shade(model).opacity } })),
  )
}

const totalsLine = ({ total }: ThreadUsage) =>
  [`${tokens(tokensOf(total.usage))} tokens`, total.usage.cacheRead ? `${tokens(total.usage.cacheRead)} from cache` : '', `${count.format(total.turns)} ${total.turns === 1 ? 'turn' : 'turns'}`]
    .filter(Boolean)
    .join(' · ')

const modelList = (usage: ThreadUsage, shade: Shades) =>
  div(
    { class: 'flex flex-col gap-px px-2 pb-2 text-xs' },
    usage.models.map(model =>
      div(
        { class: 'flex items-center gap-2' },
        swatch(shade(model)),
        span({ class: 'min-w-0 truncate text-neutral-200' }, modelName(model)),
        span({ class: 'ml-auto text-neutral-500 tabular-nums' }, usageCost(model)),
      ),
    ),
    div({ class: 'pt-1 text-neutral-500' }, totalsLine(usage)),
  )

export const usageCard = (kit: Kit, usage: ThreadUsage, open: Sig<boolean>) => {
  const shade = modelShades(kit, usage.models)
  return kit.cardFold(
    { open, label: 'This thread', value: span({ class: 'font-medium text-neutral-100 tabular-nums' }, usageCost(usage.total)) },
    shareBar(usage.models, shade),
    () => modelList(usage, shade),
  )
}
