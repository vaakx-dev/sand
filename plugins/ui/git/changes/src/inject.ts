import { wire } from '@sand/devices-contract'
import { gitStatusClient } from '@sand/git/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { kit, threads, wire, gitStatus: gitStatusClient }

export type ChangesContext = Context<typeof inject>
