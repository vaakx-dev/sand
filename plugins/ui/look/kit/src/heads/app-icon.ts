import { img } from '@vaakx-dev/vrui'

export const appIcon = (size = 20) =>
  img({ src: `/icons/${size > 32 ? '128x128@2x.png' : '64x64.png'}`, alt: '', width: size, height: size, draggable: false, class: 'shrink-0' })
