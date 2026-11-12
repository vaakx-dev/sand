import type { Kit } from '@sand/ui-kit/contract'
import { span } from '@vaakx-dev/vrui'

interface ProjectChoice<V> {
  value: V
  name: string
}

interface ProjectPicker<V> {
  choices(): ProjectChoice<V>[]
  selected(): V
  pick(value: V): void
  field?: boolean
  class?: string
}

const projectPicker = <V>(kit: Kit, picker: ProjectPicker<V>) => {
  const label = () => picker.choices().find(choice => choice.value === picker.selected())?.name ?? 'Project'
  const item = (close: () => void, choice: ProjectChoice<V>) =>
    kit.choiceItem(
      {
        selected: () => picker.selected() === choice.value,
        onClick: () => {
          close()
          picker.pick(choice.value)
        },
      },
      span({ class: 'flex-1 truncate' }, choice.name),
    )
  return kit.dropdown({
    placement: 'below-right',
    class: picker.class,
    trigger: press => kit.pickerButton({ ...press, 'aria-label': 'Project', field: picker.field }, label),
    items: close => picker.choices().map(choice => item(close, choice)),
  })
}

export { projectPicker, type ProjectChoice }
