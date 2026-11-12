import { draftRoute } from '@sand/chat/contract'
import { composer } from '@sand/composer/contract'
import type { Shell } from '@sand/ui-shell/contract'
import type { Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { chosen } from '../integrations/chosen'

export interface StartParts {
  ctx: Context
  shell: Shell
  threads: Threads
}

export type Start = (path: string, device: string) => void

const remember = (parts: StartParts, path: string, device: string) => {
  chosen.set({ path, device })
  parts.ctx.get(composer)?.focus()
}

export const startChat = (parts: StartParts): Start => (path, device) => {
  const { id } = parts.threads.plan({ cwd: path, device })
  parts.shell.open({ kind: draftRoute, id })
  remember(parts, path, device)
}

export const moveDraft = (parts: StartParts, draft: string): Start => (path, device) => {
  parts.threads.plan({ id: draft, cwd: path, device })
  remember(parts, path, device)
}
