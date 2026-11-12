import type { Props } from '@vaakx-dev/vrui'
import type { Surface } from '../surface'
import { icon } from '../icons/lucide'
import { iconButton } from './button'

export type BackProps = Omit<Props<HTMLButtonElement>, 'title'> & { title?: string; surface?: Surface }

export const backButton = ({ title = 'Back', ...props }: BackProps) => iconButton({ ...props, title, 'aria-label': title }, icon('back', 'md'))
