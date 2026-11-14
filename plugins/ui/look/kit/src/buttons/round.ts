import { SPACE, type Child, type Props } from '@vaakx-dev/vrui'
import { plainButton } from './button'

const circle = `calc(${SPACE['6']} + ${SPACE['1']})`

export const roundButton = ({ class: extra, ...props }: Props<HTMLButtonElement>, ...children: Child[]) =>
  plainButton(
    {
      ...props,
      class: ['inline-flex shrink-0 items-center justify-center rounded-full transition-colors', extra],
      style: { width: circle, height: circle },
    },
    ...children,
  )
