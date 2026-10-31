import { type Child, div } from '@vaakx-dev/vrui'

export const panelLine = (row: Child) => div({ class: 'flex min-h-6 flex-col justify-center' }, row)
