import { div, sheet, sheetHead } from '@sand/dom'
import { linksBody } from './links'
import type { DeviceLinks } from './source'

export const devicesView = (source: DeviceLinks, close: () => void) =>
  sheet(
    { 'aria-label': 'Connect a device', class: 'max-w-lg' },
    sheetHead('Connect a device', close),
    div({ class: 'flex min-h-0 flex-col overflow-auto px-5 pt-1 pb-5' }, linksBody(source)),
  )
