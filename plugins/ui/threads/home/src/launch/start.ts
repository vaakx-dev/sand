import { draftRoute } from '@sand/chat/contract'
import { composer } from '@sand/composer/contract'
import type { Shell } from '@sand/ui-shell/contract'
import type { DraftTarget, Projects, Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { chosen } from '../integrations/chosen'

export interface StartParts {
  ctx: Context
  shell: Shell
  threads: Threads
  projects: Projects
}

export type Start = (path: string, device: string) => void

const remember = (parts: StartParts, path: string, device: string) => {
  chosen.set({ path, device })
  parts.ctx.get(composer)?.focus()
}

export const openDraft = (parts: StartParts, path: string, device: string): DraftTarget => {
  const draft = parts.threads.plan({ cwd: path, device })
  parts.shell.open({ kind: draftRoute, id: draft.id })
  remember(parts, path, device)
  return draft
}

export const startChat = (parts: StartParts): Start => (path, device) => void openDraft(parts, path, device)

export const moveDraft = (parts: StartParts, draft: string): Start => (path, device) => {
  parts.threads.plan({ id: draft, cwd: path, device })
  remember(parts, path, device)
}
