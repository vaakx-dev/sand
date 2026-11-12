import { sandPalette } from '@sand/ui-theme/contract'
import * as vrui from '@vaakx-dev/vrui'
import { kit } from '../kit'

vrui.theme(sandPalette)
Object.assign(window, { sandKit: { kit, vrui } })
