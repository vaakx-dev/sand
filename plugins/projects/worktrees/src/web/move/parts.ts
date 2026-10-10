import type { WorktreeSetup } from '../../contract'
import { div, icon, input, rowButton, span, type Child, type Sig } from '@sand/dom'

const mono = (text: string) => span({ class: 'font-mono text-neutral-400' }, text)

const joined = (items: string[]) => items.flatMap((item, index) => (index ? [', ', mono(item)] : [mono(item)]))

export const setupLine = (setup: WorktreeSetup): Child[] => {
  const copy = setup.copy.length ? ['Copy ', ...joined(setup.copy)] : []
  const run = setup.run.length ? [copy.length ? ', then run ' : 'Run ', ...joined(setup.run)] : []
  return [...copy, ...run, ', as set in ', mono('.sand/worktree.toml')]
}

export const branchInput = (value: Sig<string>, submit: () => void) =>
  div(
    { class: 'flex w-full min-w-0 items-center gap-2 text-neutral-500' },
    icon('branch', 14),
    input({
      bindValue: value,
      autocomplete: 'off',
      spellcheck: false,
      'aria-label': 'Branch',
      class: 'h-8 min-w-0 flex-1 rounded-lg bg-neutral-900 px-3 text-sm text-neutral-100 outline-none ring-1 ring-neutral-700 focus:ring-accent-500',
      onKeyDown: event => {
        if (event.key === 'Enter') submit()
      },
    }),
  )

export const field = (label: string, control: Child) =>
  div({ class: 'flex items-center gap-3' }, span({ class: 'w-20 shrink-0 text-xs text-neutral-500' }, label), div({ class: 'flex min-w-0 flex-1' }, control))

const box = (checked: Sig<boolean>) =>
  span(
    {
      class: () =>
        ['mt-px inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md transition-colors', checked.get() ? 'bg-accent-500 text-white' : 'text-transparent ring-1 ring-neutral-600'].join(' '),
    },
    icon('check', 12),
  )

export const checkRow = (checked: Sig<boolean>, title: Child, ...detail: Child[]) =>
  rowButton(
    {
      role: 'checkbox',
      'aria-checked': () => String(checked.get()),
      class: 'items-start gap-3 rounded-xl bg-neutral-900 px-4 py-3',
      onClick: () => checked.update(value => !value),
    },
    box(checked),
    div({ class: 'flex min-w-0 flex-1 flex-col gap-1' }, span({ class: 'text-sm text-neutral-100' }, title), span({ class: 'text-xs text-neutral-500' }, ...detail)),
  )
