import { draftRoute } from '@sand/chat/contract'
import { composer } from '@sand/composer/contract'
import type { Shell } from '@sand/ui-shell/contract'
import type { Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { readChosen, writeChosen } from '../integrations/chosen'

export interface StartParts {
  ctx: Context
  shell: Shell
  threads: Threads
}

export const lastChosen = (threads: Threads) => readChosen() ?? { path: '', device: threads.device() }

export const startChat = ({ ctx, shell, threads }: StartParts, path: string, device: string) => {
  writeChosen({ path, device })
  const drafting = threads.drafting()
  return threads.draft(path, device, drafting?.id, { replace: Boolean(drafting) }).then(() => {
    const draft = threads.drafting()
    const now = shell.current()
    if (draft && (now.kind !== draftRoute || now.id !== draft.id)) shell.open({ kind: draftRoute, id: draft.id })
    ctx.get(composer)?.focus()
  })
}
