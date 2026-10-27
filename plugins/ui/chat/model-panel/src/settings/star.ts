import type { Kit } from '@sand/ui-kit/contract'
import { read, type MaybeReactive } from '@vaakx-dev/vrui'

export const starButton = ({ iconButton, starMark }: Kit, label: string, on: MaybeReactive<boolean>, toggle: () => void) => {
  const text = () => (read(on) ? `Remove ${label} from favourites` : `Add ${label} to favourites`)
  return iconButton({ surface: 'raised', title: text, 'aria-label': text, onClick: toggle }, starMark(on))
}
