import { center, parseKeys, type Action, type Key, type Point, type UiElement } from '@sand/computers/contract'
import { z } from 'zod'

const fraction = z.number().min(0).max(1)

const target = z
  .union([z.object({ x: fraction, y: fraction }), z.object({ ref: z.string().describe('An element ref from computer_elements.') })])
  .describe('Where: x and y as fractions 0..1 of the screenshot from the left and top, or the ref of an element.')

const held = z
  .string()
  .optional()
  .describe('Modifier keys to keep down for the whole mouse action, like ctrl, shift or ctrl+shift: ctrl+click or shift+click to select several items.')

const holdTime = z.number().int().min(100).max(10_000)

export const actionInput = z.discriminatedUnion('type', [
  z.object({ type: z.enum(['click', 'double_click', 'right_click']), at: target, keys: held }),
  z.object({ type: z.literal('move'), at: target }),
  z.object({ type: z.literal('hold'), at: target, ms: holdTime.describe('How long to keep the left button down, in milliseconds.'), keys: held }),
  z.object({
    type: z.literal('drag'),
    from: target,
    to: target,
    ms: holdTime
      .optional()
      .describe('How long to keep the button down at to before releasing, in milliseconds, nudging the pointer so hover and dragover keep firing: lets a folder spring open or a list auto-scroll.'),
    keys: held,
  }),
  z.object({
    type: z.literal('scroll'),
    at: target,
    dx: z.number().int().min(-50).max(50).default(0).describe('Wheel notches to the right; negative scrolls left.'),
    dy: z.number().int().min(-50).max(50).default(0).describe('Wheel notches down; negative scrolls up.'),
  }),
  z.object({ type: z.literal('type'), text: z.string().min(1).describe('Text to type where the focus is. A newline presses Enter.') }),
  z.object({ type: z.literal('key'), keys: z.string().describe('A key or combo joined with +, like enter, escape, ctrl+s, alt+tab or shift+f10.') }),
  z.object({ type: z.literal('wait'), ms: z.number().int().min(0).max(10_000) }),
  z.object({ type: z.literal('open'), url: z.url({ protocol: /^https?$/ }).describe('An http or https link to open.') }),
])

type ActionInput = z.output<typeof actionInput>
type Target = z.output<typeof target>

export type FindElement = (ref: string) => UiElement | undefined

const pointOf = (at: Target, find: FindElement): Point => {
  if (!('ref' in at)) return at
  const element = find(at.ref)
  if (!element) throw new Error(`No element ${at.ref} in the last list. Call computer_elements again.`)
  return center(element.box)
}

const modifiersOf = (combo: string | undefined): Key[] => {
  if (!combo) return []
  const keys = parseKeys(combo)
  const other = keys.find(key => !key.modifier)
  if (other) throw new Error(`Only ctrl, shift, alt and meta can be held during a mouse action, not ${other.name}.`)
  return keys
}

export const resolveAction = (input: ActionInput, find: FindElement): Action => {
  switch (input.type) {
    case 'move':
      return { type: 'move', at: pointOf(input.at, find) }
    case 'drag':
      return { ...input, from: pointOf(input.from, find), to: pointOf(input.to, find), keys: modifiersOf(input.keys) }
    case 'scroll':
      return { ...input, at: pointOf(input.at, find) }
    case 'key':
      return { type: 'key', keys: parseKeys(input.keys) }
    case 'type':
    case 'wait':
    case 'open':
      return input
    default:
      return { ...input, at: pointOf(input.at, find), keys: modifiersOf(input.keys) }
  }
}
