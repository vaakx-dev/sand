import { shell, type Aside, type Route, type Screen } from '@sand/ui-shell/contract'
import { div, h2, p, span, table, td, textarea, tr } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'

const unbroken = 'x'.repeat(300)

const titles: Record<string, string> = { plain: 'Plain screen', split: 'Split screen' }

const lines = Array.from({ length: 40 }, (_, line) => p({ class: 'py-2' }, `Line ${line} of a long screen.`))

const body = (id: string) =>
  div(
    { class: 'flex min-h-0 flex-1 flex-col' },
    div(
      { class: 'min-h-0 flex-1 overflow-y-auto px-4' },
      p(`Fixture ${id}`),
      div({ class: 'overflow-x-auto' }, table(tr(td('Wide'), td(unbroken), td('table cell content')))),
      ...lines,
    ),
    div({ class: 'shrink-0 p-2' }, textarea({ class: 'w-full rounded-md bg-neutral-800 p-2', 'aria-label': 'Message', placeholder: 'Message' })),
  )

const screen = (route: () => Route): Screen => {
  const id = route().id ?? 'plain'
  return {
    head: () => h2({ class: 'ml-2 truncate text-sm font-medium' }, titles[id] ?? id, span({ class: 'ml-2 text-neutral-500' }, () => route().tab ?? '')),
    main: () => body(id),
    split: id === 'split',
  }
}

const aside: Aside = {
  id: 'fixture-aside',
  kind: 'card',
  label: 'Fixture details',
  icon: 'eye',
  shows: route => route.kind === 'fixture',
  render: route => div({ class: 'p-2' }, div({}, () => `Details of ${route().kind}/${route().id ?? ''}`), div({ class: 'mt-2' }, 'Details content')),
}

const drawer: Aside = {
  id: 'fixture-drawer',
  kind: 'drawer',
  label: 'Fixture terminal',
  icon: 'term',
  shows: route => route.kind === 'fixture',
  render: () => div({ class: 'p-2' }, 'Terminal content'),
}

export default definePlugin({
  name: 'shell-fixture',
  description: 'Routes, rows and a sheet for testing the shell',
  inject: { shell },
  apply(ctx) {
    const frame = ctx.shell
    const sheet = () =>
      frame.sheet({
        label: 'Fixture sheet',
        head: () => h2({ class: 'text-sm font-medium' }, 'Fixture sheet'),
        body: () => p('Sheet body'),
      })
    ctx.effect(() => frame.nav({ id: 'fixture-sheet', label: 'Open sheet', icon: 'eye', order: 50, run: sheet }))
    ctx.effect(() =>
      frame.section({
        id: 'fixture',
        groups: () => [
          {
            id: 'screens',
            label: 'Fixtures',
            rows: [
              { id: 'plain', label: 'Plain screen', status: 'running', at: Date.now() - 4 * 60_000, to: { kind: 'fixture', id: 'plain' } },
              { id: 'split', label: 'Split screen', status: 'waiting', to: { kind: 'fixture', id: 'split' } },
            ],
          },
        ],
      }),
    )
    ctx.effect(() => frame.route({ kind: 'fixture', render: screen }))
    ctx.effect(() => frame.aside(aside))
    ctx.effect(() => frame.aside(drawer))
  },
})
