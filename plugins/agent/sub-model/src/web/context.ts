import { wire } from '@sand/devices-contract'
import { modelPicker } from '@sand/model-picker/contract'
import { kit } from '@sand/ui-kit/contract'
import { skillIndex } from '@sand/web-client/contract'
import type { Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import type { SubModelState } from '../contract'

export const inject = { wire, kit, modelPicker, skillIndex }

export interface Rows {
  ctx: Context<typeof inject>
  state: Sig<SubModelState | undefined>
}
