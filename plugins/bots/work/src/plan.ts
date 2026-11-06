import { planChangeWire, planLimit, planRead, planWrite } from '@sand/bot-plan/contract'
import type { Markdown } from '@sand/markdown/contract'
import { errorMessage } from '@sand/util'
import { derive, div, dynamicChild, show, sig, span, type Derive } from '@vaakx-dev/vrui'
import type { WorkContext } from './context'

const emptyText = 'No plan yet. The bot writes it here as it takes on work.'

export const createPlan = (ctx: WorkContext, bot: string) => {
  const saved = sig<string | undefined>(undefined)
  const latest = sig<string | undefined>(undefined)
  const draft = sig('')
  const editing = sig(false)
  const saving = sig(false)
  const failure = sig<string | undefined>(undefined)

  const attempt = (work: () => Promise<unknown>) => {
    failure.set(undefined)
    return work().catch(error => failure.set(errorMessage(error)))
  }
  const take = (text: string) => {
    latest.set(text)
    saved.set(text)
    draft.set(text)
  }
  const listen = () => {
    void attempt(() => ctx.wire.call(planRead, { bot }).then(take))
    return ctx.wire.on(planChangeWire, ([changed, text]) => {
      if (changed !== bot) return
      if (draft.get() === saved.get()) take(text)
      else latest.set(text)
    })
  }

  return {
    saved,
    draft,
    editing,
    saving,
    failure,
    listen,
    filled: derive(() => Boolean(saved.get()?.trim())),
    outdated: derive(() => latest.get() !== saved.get()),
    reload: () => take(latest.get() ?? ''),
    edit: () => editing.set(true),
    cancel() {
      take(latest.get() ?? '')
      editing.set(false)
    },
    save() {
      const text = draft.get()
      saving.set(true)
      void attempt(() =>
        ctx.wire.call(planWrite, { bot, text }).then(() => {
          take(text)
          editing.set(false)
        }),
      ).finally(() => saving.set(false))
    },
  }
}

export type Plan = ReturnType<typeof createPlan>

const rendered = (markdown: Markdown | undefined, text: string) =>
  markdown
    ? div({ class: 'text-sm leading-relaxed text-neutral-100 wrap-anywhere' }, ...markdown.nodes(text))
    : div({ class: 'whitespace-pre-wrap text-sm text-neutral-100 wrap-anywhere' }, text)

const reader = ({ kit }: WorkContext, plan: Plan, markdown: Derive<Markdown | undefined>) => {
  const editButton = () => kit.quietButton({ size: 'sm', onClick: plan.edit }, kit.icon('pencil', 'sm'), 'Edit')
  const shown = derive(() => ({ text: plan.saved.get() ?? '', markdown: markdown.get() }))
  return dynamicChild(shown, ({ text, markdown: found }) =>
    text.trim()
      ? div({ class: 'flex flex-col gap-2' }, div({ class: 'flex justify-end' }, editButton()), rendered(found, text))
      : kit.emptyState({ text: emptyText, action: editButton() }),
  )
}

const changedNote = ({ kit }: WorkContext, plan: Plan) =>
  div({ class: 'flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400' }, span('The bot changed the plan.'), kit.linkButton({ onClick: plan.reload }, 'Load its version'))

const editor = (ctx: WorkContext, plan: Plan) => {
  const { primaryAction, quietButton, textArea } = ctx.kit
  return div(
    { class: 'flex flex-col gap-2' },
    textArea({ bindValue: plan.draft, rows: 16, placeholder: 'What is ready, in progress, waiting and next.', 'aria-label': 'Plan', class: 'font-mono' }),
    show(plan.outdated, () => changedNote(ctx, plan)),
    div(
      { class: 'flex flex-wrap items-center justify-end gap-2' },
      span({ class: 'mr-auto text-xs text-neutral-400' }, () => `${plan.draft.get().length.toLocaleString()} of ${planLimit.toLocaleString()}`),
      quietButton({ size: 'sm', onClick: plan.cancel }, 'Cancel'),
      primaryAction({ size: 'sm', disabled: () => plan.saving.get() || plan.draft.get() === plan.saved.get(), onClick: plan.save }, 'Save'),
    ),
  )
}

export const planView = (ctx: WorkContext, plan: Plan, markdown: Derive<Markdown | undefined>) => {
  const mode = derive(() => {
    if (plan.saved.get() === undefined) return 'loading'
    return plan.editing.get() ? 'editing' : 'reading'
  })
  return div(
    { class: 'flex flex-col gap-3 px-2 py-2' },
    dynamicChild(mode, shown => {
      if (shown === 'loading') return ctx.kit.loadingState()
      return shown === 'editing' ? editor(ctx, plan) : reader(ctx, plan, markdown)
    }),
    show(
      () => Boolean(plan.failure.get()),
      () => ctx.kit.errorText(() => plan.failure.get() ?? ''),
    ),
  )
}
