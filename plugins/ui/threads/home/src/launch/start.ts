import { composer } from '@sand/composer/contract'
import { homeRoute, type Shell } from '@sand/ui-shell/contract'
import type { Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { chosen } from '../integrations/chosen'

export interface StartParts {
  ctx: Context
  shell: Shell
  threads: Threads
}

export const openNewThread = ({ shell }: StartParts) => shell.open({ kind: homeRoute })

export const startChat = (parts: StartParts, path: string, device: string) => {
  chosen.set({ path, device })
  openNewThread(parts)
  parts.ctx.get(composer)?.focus()
}
