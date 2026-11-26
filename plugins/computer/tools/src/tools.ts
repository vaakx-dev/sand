import type { ImageBlock } from '@sand/chats/contract'
import type { Box, Computer, Computers, Outcome, UiElement } from '@sand/computers/contract'
import type { Media } from '@sand/media/contract'
import type { Tool, ToolContext } from '@sand/tools/contract'
import { z } from 'zod'
import { actionInput, resolveAction } from './action'
import type { Chooser } from './chosen'

export const group = 'computer'

const maxElements = 400

const screenshotFit = { width: 1568, height: 1568 }

const nothing = z.object({})

const which = z.object({
  computer: z
    .string()
    .optional()
    .describe("A computer id from computer_list. Default: the last one named in this chat, else a bot's chosen one, else the only browser"),
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

const outcomeText = (outcome: Outcome | undefined) => {
  switch (outcome?.type) {
    case 'navigated':
      return ` The URL changed from ${outcome.from} to ${outcome.to}.`
    case 'unchanged':
      return ' Nothing changed: the URL, the page and the screen are as before.'
    case 'changed':
    case undefined:
      return ''
  }
}

export const computerTools = (computers: Computers, media: Media, chooser: Chooser) => {
  const listed = new Map<string, Map<string, UiElement>>()

  const targetOf = (given: string | undefined, { conversation }: ToolContext) => chooser.target(given, conversation)

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
    description: 'Take a screenshot of a computer. computer_act positions are fractions 0..1 of this image.',
    input: which,
    effect: 'read',
    needs: ['computer'],
    run({ computer }, context) {
      const { id, computer: target } = targetOf(computer, context)
      return look(id, target)
    },
  }

  const elementsInput = which.extend({
    find: z
      .string()
      .min(1)
      .optional()
      .describe('Browsers only: text to find on the page, even off screen, scrolled into view before listing'),
    match: z.number().int().min(1).default(1).describe('Which match of find: 1 is the first'),
  })

  const elements: Tool<typeof elementsInput> = {
    name: 'computer_elements',
    group,
    description:
      'List the UI elements on screen with refs and boxes as fractions of the screenshot. On a browser, pass find instead of scrolling to reach off-screen text; a desktop has no find, so scroll there. Pass a ref to computer_act to act on its center.',
    input: elementsInput,
    effect: 'read',
    needs: ['computer'],
    async run({ computer, find, match }, context) {
      const { id, computer: target } = targetOf(computer, context)
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
    screenshot: z.boolean().default(true).describe('Return a screenshot of the result; false while you chain quick actions'),
  })

  const act: Tool<typeof actInput> = {
    name: 'computer_act',
    group,
    description:
      'Act on a computer: click, hold, move, drag, scroll, type, key, wait or open a link, at x and y fractions 0..1 of the screenshot or an element ref. open on a browser loads the link in its current tab; on a desktop it hands the link to the default browser, which usually opens a new tab. Returns a screenshot once the screen settles, so there is no need to take one.',
    input: actInput,
    needs: ['computer'],
    async run({ computer, action, screenshot }, context) {
      const { id, computer: target } = targetOf(computer, context)
      const outcome = await target.act(resolveAction(action, ref => listed.get(id)?.get(ref)))
      const done = `Done: ${action.type}.${outcomeText(outcome)}`
      if (!screenshot) return done
      return [{ type: 'text' as const, text: done }, ...(await look(id, target))]
    },
  }

  return [list, screenshot, elements, act]
}
