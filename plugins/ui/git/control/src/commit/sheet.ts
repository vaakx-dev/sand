import { repoOf } from '@sand/git/contract'
import { derive, div, dynamicChild, show, span } from '@vaakx-dev/vrui'
import { pushAfterCommitReason } from '../next/reasons'
import type { ControlParts } from '../parts'
import type { CommitDraft } from './drafts'
import { fileList } from './files'

const placeholder = 'Leave empty and Sand writes the message from the diff'

export const commitSheet = (parts: ControlParts, draft: CommitDraft, close: () => void, committed: () => void) => {
  const { kit, model, runs, actions, waiting } = parts
  const local = model.status.map(repoOf)
  const files = derive(() => local.get()?.files ?? [])
  const total = () => local.get()?.fileCount ?? 0
  const truncated = () => local.get()?.truncated ?? false
  const chosen = derive(() => files.get().filter(file => !draft.excluded.get().has(file.path)))
  const everything = () => truncated() || draft.excluded.get().size === 0
  const count = () => (everything() ? total() : chosen.get().length)
  const noPush = derive(() => {
    const now = local.get()
    return now ? pushAfterCommitReason(now, model.status.get()?.remote) : undefined
  })
  const pushable = noPush.map(reason => !reason)
  const writing = () => runs.at(model.place.get())?.action === 'message'
  const busy = () => Boolean(waiting.get())
  const blocked = () => busy() || count() === 0

  const paths = () => (everything() ? undefined : chosen.get().map(file => file.path))
  const submit = (push: boolean) => {
    const request = { paths: paths(), message: draft.message.get(), push }
    close()
    void actions.commit(request).then(done => done && committed())
  }
  const write = async () => {
    const text = await actions.writeMessage(paths())
    if (text) draft.message.set(text)
  }

  const branch = () => local.get()?.branch ?? ''
  const branchLine = kit.statusLine(
    {
      mark: kit.icon(local.get()?.worktree ? 'worktree' : 'branch', 16),
      text: span({ class: 'text-neutral-100' }, branch),
      title: branch,
    },
    span({ class: 'ml-auto shrink-0 text-neutral-500' }, () => `${count()} of ${total()} files`),
  )

  const writeButton = kit.quietButton(
    { size: 'sm', surface: 'raised', disabled: busy, onClick: () => void write() },
    dynamicChild(derive(writing), on => (on ? kit.spinner(12) : kit.icon('sparkles', 14))),
    'Write it for me',
  )

  const commitButton = (primary: boolean) => {
    const action = primary ? kit.primaryAction : kit.secondaryAction
    return action({ disabled: blocked, onClick: () => submit(false) }, 'Commit')
  }

  return kit.overlay(
    close,
    kit.sheet(
      { 'aria-label': 'Commit changes', size: 'md' },
      kit.sheetHead({ title: 'Commit changes', close }),
      kit.sheetBody(
        {},
        branchLine,
        fileList(kit, { files, draft, disabled: busy, all: truncated }),
        show(truncated, () => kit.sheetText(() => `Showing ${files.get().length} of ${total()} files. Too many to pick from, so all of them are committed.`)),
        show(
          () => !truncated() && Boolean(noPush.get()),
          () => kit.sheetText(() => noPush.get() ?? ''),
        ),
        div({ class: 'flex flex-col gap-2' }, kit.textArea({ bindValue: draft.message, placeholder, rows: 4 }), div({ class: 'flex justify-end' }, writeButton)),
      ),
      kit.sheetFoot(
        kit.quietButton({ surface: 'raised', onClick: close }, 'Cancel'),
        dynamicChild(pushable, on => commitButton(!on)),
        show(pushable, () => kit.primaryAction({ disabled: blocked, onClick: () => submit(true) }, 'Commit & push')),
      ),
    ),
  )
}
