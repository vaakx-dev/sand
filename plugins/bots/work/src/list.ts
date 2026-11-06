import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, list, show, span, untrack, type Derive, type Sig } from '@vaakx-dev/vrui'
import { stageMark } from './marks'
import { statusOf, titleOf, type Task } from './tasks'

const emptyText = 'Nothing yet. Threads the bot starts show here.'

const taskMeta = (kit: Kit, task: Sig<Task>) => {
  const started = derive(() => (task.get().stage === 'run' ? task.get().thread.started : undefined))
  return span(
    () => statusOf(task.get()),
    show(
      () => started.get() !== undefined,
      () => span(' · ', kit.elapsed(() => started.get())),
    ),
  )
}

const taskRow = (kit: Kit, task: Sig<Task>, open: (thread: string) => void) =>
  kit.listRow({
    lead: dynamicChild(
      derive(() => task.get().stage),
      stage => stageMark(kit, stage),
    ),
    title: () => titleOf(task.get().thread),
    meta: taskMeta(kit, task),
    touch: true,
    onClick: () => open(untrack(() => task.get().thread.id)),
  })

const taskList = (kit: Kit, tasks: Derive<Task[]>, open: (thread: string) => void) =>
  list(
    tasks,
    task => task.thread.id,
    task => taskRow(kit, task, open),
    div({ class: 'flex flex-col' }),
  )

export const workList = (kit: Kit, tasks: Derive<Task[]>, open: (thread: string) => void) => {
  const active = derive(() => tasks.get().filter(task => task.stage !== 'done'))
  const done = derive(() => tasks.get().filter(task => task.stage === 'done'))
  return div(
    { class: 'flex flex-col' },
    show(
      () => tasks.get().length === 0,
      () => kit.emptyState({ text: emptyText }),
    ),
    taskList(kit, active, open),
    show(
      () => done.get().length > 0,
      () => kit.sectionHeading('Today'),
    ),
    taskList(kit, done, open),
  )
}
