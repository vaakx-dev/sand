import { toolViews } from '@sand/chat/contract'
import { wire } from '@sand/devices-contract'
import { kit } from '@sand/ui-kit/contract'
import type { Context } from 'drydock'

export const inject = { kit, wire, toolViews }

export type FrameContext = Context<typeof inject>
