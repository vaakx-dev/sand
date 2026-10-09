import type { ContextUsage } from '@sand/compaction/contract'
import { circle, div, dropdown, errorMessage, icon, iconButton, secondaryAction, show, svg, type Derive } from '@sand/dom'
import { percent, tokens } from '@sand/kit'
import type { Context } from 'drydock'
import { runCommand } from '../send/submit'

const radius = 8
const around = 2 * Math.PI * radius

const share = (usage: ContextUsage) => Math.min(1, usage.used / usage.window)

const full = (usage: ContextUsage | undefined) => Boolean(usage && usage.used >= usage.limit)

const ringIcon = (usage: Derive<ContextUsage | undefined>) =>
  svg(
    { width: 20, height: 20, viewBox: '0 0 20 20', class: '-rotate-90' },
    circle({ cx: 10, cy: 10, r: radius, fill: 'none', stroke: 'currentColor', strokeWidth: 3, class: 'text-neutral-600' }),
    circle({
      cx: 10,
      cy: 10,
      r: radius,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 3,
      strokeLinecap: 'round',
      class: () => (full(usage.get()) ? 'text-danger-400' : 'text-neutral-400'),
      style: { transition: 'stroke-dasharray .3s' },
      strokeDasharray: () => `${around * (usage.get() ? share(usage.get()!) : 0)} ${around}`,
    }),
  )

const usageLine = (usage: Derive<ContextUsage | undefined>) => () => {
  const value = usage.get()
  if (!value) return ''
  const line = `${percent(share(value))} · ${tokens(value.used)} of ${tokens(value.window)}`
  return value.compacting ? `Compacting · ${line}` : line
}

export const contextDetails = (ctx: Context<'threads'>, usage: Derive<ContextUsage | undefined>, done: () => void, fail: (text: string) => void) => {
  const compact = () => {
    done()
    runCommand(ctx, 'compact').catch(error => (ctx.notify ? ctx.notify.push(errorMessage(error), { level: 'error' }) : fail(errorMessage(error))))
  }
  return div(
    { class: 'flex flex-col gap-2 p-2' },
    div({ class: 'px-1 text-sm text-neutral-300' }, usageLine(usage)),
    secondaryAction({ size: 'sm', disabled: usage.map(value => Boolean(value?.compacting)), onClick: compact }, icon('compact', 13), 'Compact now'),
  )
}

export const contextRing = (ctx: Context<'threads'>, usage: Derive<ContextUsage | undefined>, fail: (text: string) => void) =>
  show(usage.map(Boolean), () =>
    dropdown({
      placement: 'above-right',
      keepFocus: true,
      menuClass: 'w-48',
      trigger: (toggle, open) => iconButton({ title: usageLine(usage), 'aria-label': 'Context window', active: open, onClick: toggle }, ringIcon(usage)),
      items: close => [contextDetails(ctx, usage, close, fail)],
    }),
  )
