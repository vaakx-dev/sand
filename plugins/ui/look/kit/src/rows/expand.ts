import { div, type Child, type Props, type Sig } from '@vaakx-dev/vrui'
import { quietButton } from '../buttons/button'
import { chevron } from '../marks/marks'

export const expandRow = ({ class: extra, ...props }: Props<HTMLDivElement>, ...children: Child[]) =>
  div({ ...props, class: ['flex flex-col bg-neutral-800', extra] }, ...children)

export const expandToggle = (open: Sig<boolean>, label: Child) =>
  quietButton(
    { size: 'sm', surface: 'group', 'aria-expanded': () => String(open.get()), onClick: open.toggle() },
    label,
    chevron(() => open.get()),
  )
