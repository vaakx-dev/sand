import { composer } from '@sand/composer/contract'
import { wire } from '@sand/devices-contract'
import { shownChats } from '@sand/transcript/contract'
import { kit } from '@sand/ui-kit/contract'
import { shell } from '@sand/ui-shell/contract'
import { projects, threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { kit, wire, shell, projects, threads, shownChats, composer }

export type BotsContext = Context<typeof inject>
