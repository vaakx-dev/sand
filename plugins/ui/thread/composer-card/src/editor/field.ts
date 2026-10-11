import { textarea } from '@sand/dom'
import { autosize } from '../integrations/autosize'
import type { TextSegment } from './segments'

export interface FieldProps {
  placeholder: () => string
  hidden: () => boolean
  keydown(event: KeyboardEvent): void
  paste(event: ClipboardEvent): void
  focus(): void
  blur(): void
  moved(field: HTMLTextAreaElement): void
}

export const segmentField = (part: TextSegment, props: FieldProps) => {
  const moved = () => props.moved(field)
  const field = textarea({
    rows: 1,
    enterKeyHint: 'enter',
    bindValue: part.value,
    placeholder: props.placeholder,
    hidden: props.hidden,
    class: 'block max-h-48 min-h-8 w-full resize-none bg-transparent px-1 text-base text-neutral-100 outline-none placeholder:text-neutral-500 md:text-sm',
    style: { lineHeight: '1.65' },
    onKeyDown: props.keydown,
    onPaste: props.paste,
    onFocus: props.focus,
    onBlur: props.blur,
    onInput: moved,
    onKeyUp: moved,
    onPointerUp: moved,
  })
  autosize(field, part.value)
  return field
}
