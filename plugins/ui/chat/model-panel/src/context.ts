import { wire } from '@sand/devices-contract'
import { modelPicker } from '@sand/model-picker/contract'
import { kit } from '@sand/ui-kit/contract'
import { models, threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { kit, models, modelPicker, threads, wire }

export type PanelContext = Context<typeof inject>
