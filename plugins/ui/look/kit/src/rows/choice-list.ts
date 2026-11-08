import { div, read, show, span, type MaybeReactive, type Sig } from '@vaakx-dev/vrui'
import { rowButton } from '../buttons/button'
import { textInput } from '../fields/field'
import { choiceCheck } from '../menus/menu-item'
import { placeLook } from '../surface'
import type { Choice } from './settings'

export interface ChoiceInput {
  value: Sig<string>
  placeholder: string
}

export type ListChoice<T> = Choice<T> & { input?: ChoiceInput }

const choiceRow = <T>(choice: ListChoice<T>, chosen: () => boolean, choose: (value: T) => void) =>
  rowButton(
    {
      role: 'radio',
      'aria-checked': () => String(chosen()),
      ...(choice.title && { title: choice.title }),
      ...(choice.disabled && { disabled: true }),
      class: ['h-8 gap-2 rounded-md px-2 text-sm transition-colors', placeLook(chosen)],
      onClick: () => choose(choice.value),
    },
    span({ class: 'min-w-0 flex-1 truncate' }, choice.label),
    choice.mark ?? null,
    choiceCheck(chosen),
  )

const choiceField = ({ value, placeholder }: ChoiceInput) =>
  textInput({ bindValue: value, placeholder, 'aria-label': placeholder, class: 'my-1', onMount: node => node.focus() })

export const choiceList = <T>(choices: ListChoice<T>[], active: MaybeReactive<T | undefined>, choose: (value: T) => void, label: string) =>
  div(
    { role: 'radiogroup', 'aria-label': label, class: 'flex flex-col' },
    choices.map(choice => {
      const chosen = () => read(active) === choice.value
      const field = choice.input
      return [choiceRow(choice, chosen, choose), field ? show(chosen, () => choiceField(field)) : null]
    }),
  )
