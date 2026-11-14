import { div } from '@vaakx-dev/vrui'
import type { Picture } from '../contract'

const pictureStage = ({ actual, toggle, element }: Picture) =>
  div(
    { class: () => ['flex flex-1 p-3', actual() ? 'items-start overflow-auto' : 'items-center justify-center'] },
    element({
      class: () => ['h-auto rounded-md', actual() ? 'cursor-zoom-out' : 'max-w-full cursor-zoom-in'],
      style: () => (actual() ? { maxWidth: 'none' } : {}),
      onClick: toggle,
    }),
  )

export { pictureStage }
