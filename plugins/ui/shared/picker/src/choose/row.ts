import type { PickItem } from '../contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Sig } from '@vaakx-dev/vrui'
import type { PickModel } from './model'

export const row = <T>({ listRow, optionProps }: Kit, item: PickItem<T>, position: Sig<number>, { box }: PickModel<T>) =>
  listRow({
    ...optionProps(box, position),
    surface: 'raised',
    touch: true,
    ...(item.tone === 'error' && { tone: 'danger' as const }),
    title: item.label,
    meta: item.detail,
  })
