import type { ImageBlock } from '@sand/chats/contract'
import type { Computers, UiElement } from '@sand/computers/contract'
import type { Media } from '@sand/media/contract'
import type { Tool, ToolContext } from '@sand/tools/contract'
import { z } from 'zod'
import { actionInput, resolveAction } from './action'

export type Chosen = (conversation: ToolContext['conversation']) => string

export const group = 'computer'

const maxElements = 400

const screenshotFit = { width: 1568, height: 1568 }

const nothing = z.object({})

const which = z.object({
  computer: z.string().optional().describe('The id of a computer from computer_list. As a bot, leave it out to use the computer chosen for you.'),
})

const round = (value: number) => value.toFixed(3)

const elementLine = ({ ref, role, name, box }: UiElement) =>
  `${ref} ${role}${name ? ` "${name}"` : ''} [${round(box.left)}, ${round(box.top)}, ${round(box.right)}, ${round(box.bottom)}]`

export const computerTools = (computers: Computers, media: Media, chosen: Chosen) => {
  const listed = new Map<string, Map<string, UiElement>>()

  const idOf = (given: string | undefined, { conversation }: ToolContext) => given ?? chosen(conversation)

  const need = (id: string) => {
    const computer = computers.get(id)
    if (!computer) throw new Error(`No computer "${id}". Call computer_list for the ids.`)
    return computer
  }

  const list: Tool<typeof nothing> = {
    name: 'computer_list',
    group,
    description: 'List the computers you can see and use, browsers and desktops, with their ids.',
    input: nothing,
    effect: 'read',
    needs: ['computer'],
    run: () =>
      computers
        .list()
        .map(({ id, label, kind, os }) => `${id}: ${label} (${kind}, ${os})`)
        .join('\n') || 'No computers are available.',
  }

  const screenshot: Tool<typeof which> = {
    name: 'computer_screenshot',
    group,
    description: 'Take a screenshot of a computer. Every position you pass to computer_act is a fraction 0..1 of this image: x from the left, y from the top.',
    input: which,
    effect: 'read',
    needs: ['computer'],
    async run({ computer }, context) {
      const id = idOf(computer, context)
      const shot = await need(id).screenshot(screenshotFit)
      const image: ImageBlock = { ...media.put(shot.png, 'image/png'), type: 'image', mediaType: 'image/png', name: `${id}.png` }
      return [{ type: 'text' as const, text: `${shot.width}×${shot.height} pixels.` }, image]
    },
  }

  const elements: Tool<typeof which> = {
    name: 'computer_elements',
    group,
    description:
      'List the UI elements on a computer screen: ref, role, name and box [left, top, right, bottom] as fractions 0..1 of the screenshot. Only what is on screen is listed; scroll to reach the rest. Pass a ref to computer_act to act on its center.',
    input: which,
    effect: 'read',
    needs: ['computer'],
    async run({ computer }, context) {
      const id = idOf(computer, context)
      const found = await need(id).elements()
      listed.set(id, new Map(found.map(element => [element.ref, element])))
      const shown = found.slice(0, maxElements).map(elementLine)
      const more = found.length > maxElements ? `\n…and ${found.length - maxElements} more.` : ''
      return shown.length ? `${shown.join('\n')}${more}` : 'No elements found.'
    },
  }

  const actInput = which.extend({ action: actionInput })

  const act: Tool<typeof actInput> = {
    name: 'computer_act',
    group,
    description:
      'Act on a computer: click, double_click, right_click, hold (press and keep the left button down for ms, for press-and-hold buttons and long-press), move, drag, scroll, type, key, wait or open a link. Positions are x and y fractions 0..1 of the screenshot, or an element ref. Take a new screenshot to see the result.',
    input: actInput,
    needs: ['computer'],
    async run({ computer, action }, context) {
      const id = idOf(computer, context)
      await need(id).act(resolveAction(action, ref => listed.get(id)?.get(ref)))
      return `Done: ${action.type}.`
    },
  }

  return [list, screenshot, elements, act]
}
