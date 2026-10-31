import type { PullSummary } from '@sand/github/contract'
import type { Kit } from '@sand/ui-kit/contract'
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
    text: () => `${base()} ← ${head()}`,
    title: () => `${head()} into ${base()}`,
  })
}

const writtenLine = ({ kit }: PullsContext, model: CreateModel) => {
  const { writing, writeError } = model
  return div(
    { class: 'flex items-start gap-2' },
    dynamicChild(
      () => Boolean(writeError.get()),
      failed =>
        failed
          ? div({ class: 'min-w-0 flex-1' }, kit.errorText(() => writeError.get()))
          : kit.statusLine({
              mark: dynamicChild(writing, on => (on ? kit.spinner(14) : kit.icon('sparkles', 14))),
              text: () => (writing.get() ? 'Writing the title and description…' : writtenFrom(model.status.get())),
              title: 'Sand writes these from the commits and this thread',
            }),
    ),
    kit.quietButton({ size: 'sm', surface: 'raised', class: 'ml-auto', disabled: writing, onClick: () => void model.write() }, 'Rewrite'),
  )
}

const form = (ctx: PullsContext, model: CreateModel) => {
  const { kit } = ctx
  const { draft, writing } = model
  const dirty = model.status.map(dirtyNote)
  return div(
    { class: 'flex flex-col gap-4' },
    branchLine(ctx, model),
    show(dirty.map(Boolean), () => kit.sheetText(() => dirty.get() ?? '')),
    kit.textInput({ bindValue: draft.title, placeholder: 'Title', 'aria-label': 'Title', disabled: writing }),
    kit.textArea({ bindValue: draft.body, placeholder: 'Description', 'aria-label': 'Description', rows: 10, disabled: writing }),
    writtenLine(ctx, model),
    kit.checkRow({ checked: draft.draft, onToggle: () => draft.draft.update(on => !on), title: 'Open as draft', surface: 'raised' }),
  )
}

const fixButton = (kit: Kit, model: CreateModel, close: () => void, label: string) => {
  const run = () => {
    const fix = model.fix.get()
    close()
    fix?.run()
  }
  return kit.quietButton({ size: 'sm', surface: 'raised', title: () => model.fix.get()?.title ?? label, onClick: run }, label)
}

const blockedNote = ({ kit }: PullsContext, model: CreateModel, close: () => void) =>
  kit.callout(
    'warning',
    span({ class: 'min-w-0 flex-1' }, () => model.blocked.get()?.text ?? ''),
    dynamicChild(model.fix.map(fix => fix?.label), label => (label ? fixButton(kit, model, close, label) : null)),
  )

const createButton = ({ kit }: PullsContext, model: CreateModel, submit: () => void) =>
  kit.primaryAction(
    { disabled: () => !model.canCreate(), onClick: submit },
    dynamicChild(model.busy, on => (on ? kit.spinner(14) : null)),
    () => (model.busy.get() ? 'Creating…' : 'Create PR'),
  )

export const createSheet = (ctx: PullsContext, model: CreateModel, close: () => void, opened: (pull: PullSummary) => void) => {
  const { kit } = ctx
  const blocked = model.blocked.map(Boolean)
  const submit = () => void submitPull(ctx, model, opened)
  return kit.overlay(
    close,
    kit.sheet(
      { 'aria-label': 'Create pull request', size: 'md' },
      kit.sheetHead({ title: 'Create pull request', close }),
      kit.sheetBody(
        {},
        dynamicChild(blocked, on => (on ? blockedNote(ctx, model, close) : form(ctx, model))),
      ),
      kit.sheetFoot(
        kit.quietButton({ surface: 'raised', onClick: close }, 'Cancel'),
        show(
          () => !blocked.get(),
          () => createButton(ctx, model, submit),
        ),
      ),
    ),
  )
}
