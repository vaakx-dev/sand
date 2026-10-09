import { controlButton, div, dot, duration, dynamicChild, keys, list, quietButton, show, sig, span, stopThen, type Sig } from '@sand/dom'
import type { AgentRow, ChildRow } from './rows'

export interface RowActions {
  open(session: string): void
  cancel(row: AgentRow): Promise<boolean>
}

const statusWords: Record<AgentRow['status'], string> = { running: 'Running', done: 'Done', failed: 'Failed', cancelled: 'Stopped' }

const statusDot = (status: AgentRow['status']) =>
  span({ class: 'inline-flex', title: statusWords[status] }, status === 'running' ? dot('accent') : dot(status === 'failed' ? 'danger' : 'neutral'))

const childRow = (child: Sig<ChildRow>, now: Sig<number>, open: (id: string) => void) =>
  quietButton(
    { size: 'sm', class: 'w-full', onClick: stopThen(() => open(child.get().id)) },
    dynamicChild(
      child.map(value => value.running),
      running => statusDot(running ? 'running' : 'done'),
    ),
    span({ class: 'min-w-0 flex-1 truncate text-left', title: child.map(value => value.title) }, child.map(value => value.title)),
    span({ class: 'shrink-0 text-neutral-500' }, child.map(value => value.model ?? '')),
    span({ class: 'shrink-0 tabular-nums text-neutral-500' }, () => duration((child.get().ended ?? now.get()) - child.get().started)),
  )

const detail = (row: AgentRow, now: number) => {
  const state = row.status === 'running' || row.status === 'done' ? undefined : statusWords[row.status]
  const time = row.ended || row.status === 'running' ? duration((row.ended ?? now) - row.started) : undefined
  return [row.name, row.model, state, time].filter(Boolean).join(' · ')
}

const stopButton = (row: Sig<AgentRow>, cancel: RowActions['cancel']) => {
  const stopping = sig(false)
  return controlButton(
    'bg-neutral-800 text-neutral-300 hover:bg-danger-950 hover:text-danger-400',
    {
      size: 'sm',
      disabled: stopping,
      onClick: stopThen(() => {
        stopping.set(true)
        void cancel(row.get()).then(stopped => {
          if (!stopped) stopping.set(false)
        })
      }),
    },
    () => (stopping.get() ? 'Stopping…' : 'Stop'),
  )
}

export const agentRow = (row: Sig<AgentRow>, now: Sig<number>, actions: RowActions) => {
  const running = row.map(value => value.status === 'running')
  const clickable = row.map(value => Boolean(value.session))
  const open = () => {
    const session = row.get().session
    if (session) actions.open(session)
  }
  return div(
    {
      role: () => (clickable.get() ? 'button' : undefined),
      tabIndex: () => (clickable.get() ? 0 : -1),
      class: [
        'flex w-full items-start gap-3 rounded-lg px-3 py-2 outline-none transition-colors',
        () => (clickable.get() ? 'cursor-pointer hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-accent-500' : ''),
      ],
      onClick: open,
      onKeyDown: keys({ Enter: open, ' ': open }, { self: true }),
    },
    div(
      { class: 'flex h-5 shrink-0 items-center' },
      dynamicChild(
        row.map(value => value.status),
        statusDot,
      ),
    ),
    div(
      { class: 'min-w-0 flex-1' },
      div({ class: 'truncate text-sm text-neutral-100', title: row.map(value => value.title) }, row.map(value => value.title)),
      div(
        { class: () => ['truncate text-xs tabular-nums', row.get().status === 'failed' ? 'text-danger-400' : 'text-neutral-500'] },
        () => detail(row.get(), now.get()),
      ),
      show(
        row.map(value => Boolean(value.note)),
        () => div({ class: 'mt-1 truncate text-xs text-accent-400', title: row.map(value => value.note ?? '') }, row.map(value => value.note ?? '')),
      ),
      show(
        row.map(value => value.children.length > 0),
        () =>
          list(
            row.map(value => value.children),
            child => child.id,
            child => childRow(child, now, actions.open),
            div({ class: 'mt-2 flex flex-col gap-1' }),
          ),
      ),
    ),
    show(running, () => stopButton(row, actions.cancel)),
  )
}
