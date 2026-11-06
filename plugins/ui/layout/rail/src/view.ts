import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild } from '@vaakx-dev/vrui'
import { railColumn } from './column'
import type { RailParts } from './parts'
import { railTabs } from './tabs'

export const railView = (kit: Kit, parts: RailParts) => dynamicChild(parts.narrow, narrow => (narrow ? railTabs(kit, parts) : railColumn(kit, parts)))
