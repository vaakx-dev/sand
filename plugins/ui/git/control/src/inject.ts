import { gitActionsClient } from '@sand/git-actions/contract'
import { gitStatusClient } from '@sand/git/contract'
import { picker } from '@sand/picker/contract'
import { toasts } from '@sand/toasts/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { kit, picker, toasts, gitStatus: gitStatusClient, gitActions: gitActionsClient, threads }

export type ControlContext = Context<typeof inject>
