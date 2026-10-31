import { div } from '@vaakx-dev/vrui'

const bar = (width: string) => div({ class: ['h-3 max-w-full rounded-md bg-neutral-800', width] })

const ghostRow = () => div({ class: 'flex flex-col gap-2 px-2 py-3' }, bar('w-64'), bar('w-40'))

export const listSkeleton = () => div({ role: 'status', 'aria-label': 'Loading pull requests', class: 'flex flex-col' }, ...Array.from({ length: 6 }, ghostRow))
