import { center, parseKeys, type Action, type Point, type UiElement } from '@sand/computers/contract'
import { z } from 'zod'

const fraction = z.number().min(0).max(1)

const target = z
  .union([z.object({ x: fraction, y: fraction }), z.object({ ref: z.string().describe('An element ref from computer_elements.') })])
  .describe('Where: x and y as fractions 0..1 of the screenshot from the left and top, or the ref of an element.')

export const actionInput = z.discriminatedUnion('type', [
  z.object({ type: z.enum(['click', 'double_click', 'right_click', 'move']), at: target }),
  z.object({ type: z.literal('drag'), from: target, to: target }),
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

export const resolveAction = (input: ActionInput, find: FindElement): Action => {
  switch (input.type) {
    case 'drag':
      return { type: 'drag', from: pointOf(input.from, find), to: pointOf(input.to, find) }
    case 'scroll':
      return { ...input, at: pointOf(input.at, find) }
    case 'key':
      return { type: 'key', keys: parseKeys(input.keys) }
    case 'type':
    case 'wait':
    case 'open':
      return input
    default:
      return { type: input.type, at: pointOf(input.at, find) }
  }
}
