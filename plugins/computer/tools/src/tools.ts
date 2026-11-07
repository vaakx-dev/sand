import type { ImageBlock } from '@sand/chats/contract'
import type { Box, Computer, Computers, UiElement } from '@sand/computers/contract'
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

const boxText = (box: Box) => `[${round(box.left)}, ${round(box.top)}, ${round(box.right)}, ${round(box.bottom)}]`

const elementLine = ({ ref, role, name, box }: UiElement) => `${ref} ${role}${name ? ` "${name}"` : ''} ${boxText(box)}`

const matches = (count: number) => `${count} match${count === 1 ? '' : 'es'}`

const search = async (computer: Computer, text: string, match: number) => {
  if (!computer.find) return `This ${computer.info.kind} cannot find text, so nothing was scrolled. Scroll to look for "${text}".`
  const { count, box } = await computer.find(text, match)
  if (match > count) return `${matches(count)} for "${text}"${count ? `; there is no match ${match}` : ''}.`
  return `Match ${match} of ${count} for "${text}", scrolled into view${box ? ` at ${boxText(box)}` : ''}.`
}

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

  const look = async (id: string, computer: Computer) => {
    const shot = await computer.screenshot(screenshotFit)
    const image: ImageBlock = { ...media.put(shot.png, 'image/png'), type: 'image', mediaType: 'image/png', name: `${id}.png` }
    return [{ type: 'text' as const, text: [`${shot.width}×${shot.height} pixels.`, shot.note].filter(Boolean).join('\n') }, image]
  }

  const screenshot: Tool<typeof which> = {
    name: 'computer_screenshot',
    group,
    description: 'Take a screenshot of a computer. Every position you pass to computer_act is a fraction 0..1 of this image: x from the left, y from the top.',
    input: which,
    effect: 'read',
    needs: ['computer'],
    run({ computer }, context) {
      const id = idOf(computer, context)
      return look(id, need(id))
    },
  }

  const elementsInput = which.extend({
    find: z
      .string()
      .min(1)
      .optional()
      .describe('Text to find anywhere on the page, ignoring case, even off screen or inside a scrolling panel. The match is scrolled into view before the list is made.'),
    match: z.number().int().min(1).default(1).describe('Which match of find to scroll into view: 1 is the first.'),
  })

  const elements: Tool<typeof elementsInput> = {
    name: 'computer_elements',
    group,
    description:
      'List the UI elements on a computer screen: ref, role, name and box [left, top, right, bottom] as fractions 0..1 of the screenshot. Only what is on screen is listed. To reach text in a long page, list, table or panel, pass find instead of scrolling: it scrolls the first match, or match n, into view and says how many there are. Only browsers can find. Pass a ref to computer_act to act on its center.',
    input: elementsInput,
    effect: 'read',
    needs: ['computer'],
    async run({ computer, find, match }, context) {
      const id = idOf(computer, context)
      const target = need(id)
      const searched = find === undefined ? [] : [await search(target, find, match)]
      const found = await target.elements()
      listed.set(id, new Map(found.map(element => [element.ref, element])))
      const shown = found.length ? found.slice(0, maxElements).map(elementLine) : ['No elements found.']
      const more = found.length > maxElements ? [`…and ${found.length - maxElements} more.`] : []
      return [...searched, ...shown, ...more].join('\n')
    },
  }

  const actInput = which.extend({
    action: actionInput,
    screenshot: z.boolean().default(true).describe('Return a screenshot of the result. Pass false while you chain quick actions, then look once at the end.'),
  })

  const act: Tool<typeof actInput> = {
    name: 'computer_act',
    group,
    description:
      'Act on a computer: click, double_click, right_click, hold (press and keep the left button down for ms, for press-and-hold buttons and long-press), move, drag (with ms to rest at the end before dropping, for spring-loaded folders and auto-scrolling lists), scroll, type, key, wait or open a link. Clicks, hold and drag take keys like ctrl or shift to keep down meanwhile, for ctrl+click and shift+click multi-select. Positions are x and y fractions 0..1 of the screenshot, or an element ref. Returns a screenshot of the result once the screen settles, so there is no need to take one; pass screenshot: false to skip it while you chain quick actions.',
    input: actInput,
    needs: ['computer'],
    async run({ computer, action, screenshot }, context) {
      const id = idOf(computer, context)
      const target = need(id)
      await target.act(resolveAction(action, ref => listed.get(id)?.get(ref)))
      const done = `Done: ${action.type}.`
      if (!screenshot) return done
      await target.settle()
      return [{ type: 'text' as const, text: done }, ...(await look(id, target))]
    },
  }

  return [list, screenshot, elements, act]
}
