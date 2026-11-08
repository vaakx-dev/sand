import { wire } from '@sand/devices-contract'
import { modelPicker } from '@sand/model-picker/contract'
import { kit } from '@sand/ui-kit/contract'
import type { Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import type { SubModelState } from '../contract'

export const inject = { wire, kit, modelPicker }

export interface Rows {
  ctx: Context<typeof inject>
  state: Sig<SubModelState | undefined>
}
