import { wire } from '@sand/devices-contract'
import { gitStatusClient } from '@sand/git/contract'
import { picker } from '@sand/picker/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { kit, picker, gitStatus: gitStatusClient, threads, wire }

export type ControlContext = Context<typeof inject>
