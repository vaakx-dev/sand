import type { Props } from '@vaakx-dev/vrui'
import { icon } from '../icons/lucide'
import { iconButton } from './button'

export type CloseProps = Omit<Props<HTMLButtonElement>, 'title'> & { title?: string; size?: 'sm' | 'md' }

export const closeButton = ({ title = 'Close', size = 'md', ...props }: CloseProps) =>
  iconButton({ ...props, size, title, 'aria-label': title }, icon('x', size === 'sm' ? 14 : 16))
