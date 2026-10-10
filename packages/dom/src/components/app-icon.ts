import { img, span, type Props } from '@vaakx-dev/vrui'
import { icon } from '../icons/lucide'
import { iconButton } from './button'

export const appIconUrl = (file = '64x64.png') => `/icons/${file}`

export const appIcon = (size = 20) =>
  img({ src: appIconUrl(size > 32 ? '128x128@2x.png' : '64x64.png'), alt: '', width: size, height: size, draggable: false, class: 'shrink-0' })

export const sidebarToggle = (props: Props<HTMLButtonElement>) =>
  iconButton(
    { ...props, class: ['group', props.class] },
    span({ class: 'flex group-hover:hidden' }, appIcon(20)),
    span({ class: 'hidden group-hover:flex' }, icon('sidebar')),
  )
