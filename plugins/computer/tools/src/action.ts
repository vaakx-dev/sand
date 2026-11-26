import { center, parseKeys, type Action, type Box, type Key, type Point } from '@sand/computers/contract'
import { z } from 'zod'

const fraction = z.number().min(0).max(1)

const target = z
  .union([z.object({ x: fraction, y: fraction }), z.object({ ref: z.string().describe('An element ref from computer_elements.') })])
  .describe('Where: x and y as fractions 0..1 of the screenshot from the left and top, or the ref of an element.')

const held = z
  .string()
  .optional()
  .describe('Modifier keys held during the action, like ctrl, shift or ctrl+shift')

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
      .describe('Milliseconds to rest at to before dropping, so a folder springs open or a list auto-scrolls'),
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

export type Locate = (ref: string) => Promise<Box>

const pointOf = async (at: Target, locate: Locate): Promise<Point> => ('ref' in at ? center(await locate(at.ref)) : at)

const modifiersOf = (combo: string | undefined): Key[] => {
  if (!combo) return []
  const keys = parseKeys(combo)
  const other = keys.find(key => !key.modifier)
  if (other) throw new Error(`Only ctrl, shift, alt and meta can be held during a mouse action, not ${other.name}.`)
  return keys
}

export const resolveAction = async (input: ActionInput, locate: Locate): Promise<Action> => {
  switch (input.type) {
    case 'move':
      return { type: 'move', at: await pointOf(input.at, locate) }
    case 'drag':
      return { ...input, keys: modifiersOf(input.keys), from: await pointOf(input.from, locate), to: await pointOf(input.to, locate) }
    case 'scroll':
      return { ...input, at: await pointOf(input.at, locate) }
    case 'key':
      return { type: 'key', keys: parseKeys(input.keys) }
    case 'type':
    case 'wait':
    case 'open':
      return input
    default:
      return { ...input, keys: modifiersOf(input.keys), at: await pointOf(input.at, locate) }
  }
}
