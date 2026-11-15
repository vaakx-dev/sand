import type { ToolViews } from '@sand/transcript/contract'
import type { Kit, MenuSpec } from '@sand/ui-kit/contract'
import type { Row, Subject } from '@sand/ui-shell/contract'
import { derive, div, list, type Sig } from '@vaakx-dev/vrui'
import type { ScriptRun } from '../contract'
import { callViews } from './calls'
import type { Store } from './store'

interface DetailsParts {
  kit: Kit
  store: Store
  views(): ToolViews | undefined
}

const captionOf = (runs: ScriptRun[]) => {
  const running = runs.filter(run => run.status === 'running').length
  return running ? `Scripts · ${running} running` : 'Scripts'
}

const rowOf = (run: ScriptRun): Row => ({ id: run.id, label: run.title || 'Script', status: run.status, at: run.ended ?? run.started })

const scriptDetails = ({ kit, store, views }: DetailsParts) => {
  const menuOf = (run: ScriptRun): MenuSpec => ({
    title: run.title || 'Script',
    actions: [
      { id: 'copy-code', group: 'copy', label: 'Copy script', icon: 'copy', run: () => kit.copyText(run.code) },
      ...(run.status === 'running' ? [{ id: 'stop', group: 'run', label: 'Stop', icon: 'stop', danger: true, run: () => void store.stop(run.id) }] : []),
    ],
  })

  const callsOf = (run: Sig<ScriptRun>) => {
    const found = views()
    return found && div({ class: 'flex max-h-80 min-w-0 flex-col overflow-y-auto px-2' }, found.steps(derive(() => callViews(run.get()))))
  }

  const runView = (run: Sig<ScriptRun>) => {
    const actions = kit.contextMenu()
    const menu = () => menuOf(run.get())
    return div(
      { class: 'flex min-w-0 flex-col' },
      div(
        { class: 'flex min-w-0 items-center gap-1' },
        kit.workRow({ surface: 'raised', class: 'min-w-0 flex-1', ...actions.target(menu, event => actions.openBelow(event, menu)) }, kit.rowBody(() => rowOf(run.get()), { form: 'line' })),
        actions.button(menu, { size: 'sm' }),
        actions.view(),
      ),
      callsOf(run),
    )
  }

  const render = (subject: () => Subject) => {
    const runs = derive(() => store.inThread(subject().session))
    return div({ class: 'flex min-w-0 flex-col' }, kit.cardCaption(() => captionOf(runs.get())), list(runs, run => run.id, runView, div({ class: 'flex min-w-0 flex-col' })))
  }

  return { shows: (subject: Subject) => !subject.draft && store.inThread(subject.session).length > 0, render }
}

export { scriptDetails }
