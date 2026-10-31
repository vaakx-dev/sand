import type { PullSummary } from '@sand/github/contract'
import { div, dynamicChild, show, span } from '@vaakx-dev/vrui'
import type { PullsContext } from '../inject'
import { baseOf, dirtyNote, repoOf, writtenFrom } from './facts'
import type { CreateModel } from './model'
import { submitPull } from './submit'

const branchLine = ({ kit }: PullsContext, model: CreateModel) => {
  const head = () => repoOf(model.status.get())?.branch ?? ''
  const base = () => baseOf(model.status.get()) ?? 'the default branch'
  return kit.statusLine({
    mark: kit.icon('pull-request', 16),
    text: span({ class: 'font-mono text-neutral-100' }, () => `${head()} → ${base()}`),
    title: () => `${head()} into ${base()}`,
  })
}

const writtenLine = ({ kit }: PullsContext, model: CreateModel) => {
  const writing = model.writing
  return div(
    { class: 'flex items-center gap-2' },
    kit.statusLine({
      mark: dynamicChild(writing, on => (on ? kit.spinner(12) : kit.icon('sparkles', 14))),
      text: () => (writing.get() ? 'Writing the title and description…' : writtenFrom(model.status.get())),
      title: 'Sand writes these from the commits and this thread',
    }),
    kit.quietButton({ size: 'sm', surface: 'raised', class: 'ml-auto', disabled: writing, onClick: () => void model.write() }, 'Rewrite'),
  )
}

const notes = ({ kit }: PullsContext, model: CreateModel) => {
  const dirty = model.status.map(dirtyNote)
  return [
    show(model.blocked.map(Boolean), () => kit.callout('warning', span(() => model.blocked.get() ?? ''))),
    show(dirty.map(Boolean), () => kit.callout({ tone: 'neutral', icon: 'info' }, span(() => dirty.get() ?? ''))),
    show(model.writeError.map(Boolean), () => kit.errorText(() => model.writeError.get())),
  ]
}

export const createSheet = (ctx: PullsContext, model: CreateModel, close: () => void, opened: (pull: PullSummary) => void) => {
  const { kit } = ctx
  const { draft, writing, busy } = model
  const submit = () => void submitPull(ctx, model, opened)
  return kit.overlay(
    close,
    kit.sheet(
      { 'aria-label': 'Create pull request', size: 'md' },
      kit.sheetHead({ title: 'Create pull request', close }),
      kit.sheetBody(
        {},
        branchLine(ctx, model),
        ...notes(ctx, model),
        kit.textInput({ bindValue: draft.title, placeholder: 'Title', 'aria-label': 'Title', disabled: writing }),
        kit.textArea({ bindValue: draft.body, placeholder: 'Description', 'aria-label': 'Description', rows: 10, disabled: writing }),
        writtenLine(ctx, model),
        kit.checkRow({ checked: draft.draft, onToggle: () => draft.draft.update(on => !on), title: 'Open as draft', surface: 'raised' }),
      ),
      kit.sheetFoot(
        kit.quietButton({ surface: 'raised', onClick: close }, 'Cancel'),
        kit.primaryAction(
          { disabled: () => !model.canCreate(), onClick: submit },
          dynamicChild(busy, on => (on ? kit.spinner(14) : null)),
          () => (busy.get() ? 'Creating…' : 'Create PR'),
        ),
      ),
    ),
  )
}
