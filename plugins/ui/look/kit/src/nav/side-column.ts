import { nav, type Child, type Props, type Sig } from '@vaakx-dev/vrui'

export type SideColumnProps = Props<HTMLElement> & { narrow: Sig<boolean> }

export const sideColumn = ({ narrow, class: extra, ...props }: SideColumnProps, ...children: Child[]) =>
  nav({ ...props, class: ['relative flex h-full min-h-0 flex-col bg-neutral-950', () => (narrow.get() ? 'w-full' : 'w-64'), extra] }, ...children)
