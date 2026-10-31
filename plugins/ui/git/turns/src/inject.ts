import { snapshotsClient } from '@sand/git-snapshots/contract'
import { gitStatusClient } from '@sand/git/contract'
import { picker } from '@sand/picker/contract'
import { toasts } from '@sand/toasts/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { kit, threads, picker, toasts, snapshots: snapshotsClient, gitStatus: gitStatusClient }

export type TurnsContext = Context<typeof inject>
