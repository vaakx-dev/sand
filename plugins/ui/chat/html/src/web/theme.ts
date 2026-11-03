import type { Theme } from '@sand/ui-theme/contract'
import { theme } from '@vaakx-dev/vrui'
import { rootRule } from '../page/tokens'

export const themeCss = ({ palette, mode }: Theme) => rootRule(theme(palette).colors, mode)
