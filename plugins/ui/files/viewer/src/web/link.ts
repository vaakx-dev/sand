import type { Kit } from '@sand/ui-kit/contract'

const LOOK = 'inline cursor-pointer rounded-md underline hover:text-neutral-400'

const linkFor = (kit: Kit, label: (Node | string)[], mention: string, open: () => void) =>
  kit.plainButton({ class: LOOK, title: `Open ${mention}`, 'data-file': mention, onClick: open }, ...label)

export { linkFor }
