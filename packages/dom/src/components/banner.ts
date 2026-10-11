import { div, type Child, type Props } from '@vaakx-dev/vrui'

export const statusBanner = (props: Props<HTMLDivElement>, ...children: Child[]) =>
  div(
    { role: 'status', ...props, class: 'flex min-h-10 w-full items-center gap-3 rounded-lg bg-neutral-800 px-3 py-1 text-sm text-neutral-300 animate-fade' },
    ...children,
  )
