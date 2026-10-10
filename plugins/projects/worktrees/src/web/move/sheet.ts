import type { WorktreeState } from '../../contract'
import { div, errorMessage, overlay, primaryAction, quietButton, selectMenu, sheet, sheetHead, sig } from '@sand/dom'
import { plural } from '@sand/kit'
import type { Thread } from '@sand/web-client/contract'
import type { WebContext, WorktreeClient } from '../client'
import { branchInput, checkRow, field, setupLine } from './parts'

export interface MoveForm {
  thread: Thread
  state: WorktreeState
  branch: string
}

const baseChoices = (state: WorktreeState) => {
  const names = [...new Set([state.branch, ...state.branches].filter((name): name is string => Boolean(name)))]
  return names.map(name => ({ value: name, label: name }))
}

const move = async (ctx: WebContext, client: WorktreeClient, form: MoveForm, request: { branch: string; base: string; carry: boolean; setup: boolean }) => {
  try {
    const moved = await client.move({ session: form.thread.id, ...request })
    ctx.notify?.push(`This thread now works in ${moved.path}`)
  } catch (error) {
    ctx.notify?.push(`Could not move the thread: ${errorMessage(error)}`, { level: 'error' })
  }
}

export const moveSheet = (ctx: WebContext, client: WorktreeClient, form: MoveForm, close: () => void) => {
  const { state } = form
  const branch = sig(form.branch)
  const base = sig(state.branch ?? state.branches[0] ?? 'HEAD')
  const carry = sig(state.changed > 0)
  const setup = sig(true)
  const hasSetup = state.setup.copy.length + state.setup.run.length > 0
  const submit = () => {
    const name = branch.get().trim()
    if (!name) return
    close()
    void move(ctx, client, form, { branch: name, base: base.get(), carry: carry.get(), setup: hasSetup && setup.get() })
  }
  return overlay(
    close,
    sheet(
      { 'aria-label': 'Move this thread to a worktree', class: 'max-w-lg' },
      sheetHead('Move this thread to a worktree', close),
      div(
        { class: 'flex min-h-0 flex-col gap-3 overflow-auto px-5 pt-2 pb-5' },
        field('Branch', branchInput(branch, submit)),
        field('Based on', div({ class: 'flex rounded-lg ring-1 ring-neutral-700' }, selectMenu(baseChoices(state), base, value => base.set(value)))),
        state.changed > 0 ? checkRow(carry, `Take the ${plural(state.changed, 'changed file')} with it`, `Your folder goes back to a clean ${state.branch ?? 'checkout'}`) : null,
        hasSetup ? checkRow(setup, 'Set it up', ...setupLine(state.setup)) : null,
      ),
      div(
        { class: 'flex shrink-0 items-center justify-end gap-2 border-t border-neutral-700 px-5 py-3' },
        quietButton({ onClick: close }, 'Cancel'),
        primaryAction({ disabled: () => !branch.get().trim(), onClick: submit }, 'Move'),
      ),
    ),
  )
}
