import { div, type Child, type Props } from '@vaakx-dev/vrui'
import { layer } from '../layer'
import { modal } from '../layers/stack'

export type ScrimProps = Props<HTMLDivElement> & {
  close: () => void
  from: Element | null
}

export const scrim = ({ close, from, class: extra, ...props }: ScrimProps, ...children: Child[]) =>
  div({ ...props, class: [layer.dialog, 'fixed inset-0 flex bg-black/60 animate-fade', extra], onMount: node => modal(node, close, from) }, ...children)
