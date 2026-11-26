import type { ImageBlock } from '@sand/chats/contract'
import { matchesText, type Box, type Computer, type Computers, type Found, type Outcome, type UiElement } from '@sand/computers/contract'
import type { Media } from '@sand/media/contract'
import type { Tool, ToolContext } from '@sand/tools/contract'
import { z } from 'zod'
import { actionInput, resolveAction } from './action'
import type { Chooser } from './chosen'
import { Listed, type Owner } from './listed'

export const group = 'computer'

const MAX_ELEMENTS = 400

const VALUE_PREVIEW_CHARS = 120

const READ_CHARS = 20_000

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

const preview = (value: string) => (value.length > VALUE_PREVIEW_CHARS ? `${value.slice(0, VALUE_PREVIEW_CHARS)}…` : value)

const elementLine = ({ ref, role, name, value, href, box }: UiElement) =>
  [ref, role, name && `"${name}"`, value && `= ${JSON.stringify(preview(value))}`, href && `→ ${href}`, boxText(box)].filter(Boolean).join(' ')

const elementLines = (elements: UiElement[]) => {
  const more = elements.length > MAX_ELEMENTS ? [`…and ${elements.length - MAX_ELEMENTS} more.`] : []
  return [...elements.slice(0, MAX_ELEMENTS).map(elementLine), ...more]
}

const matches = (count: number) => `${count} match${count === 1 ? '' : 'es'}`

interface Search {
  text: string
  match: number
}

const searchNote = (computer: Computer, { text, match }: Search, found: Found | undefined, hit: UiElement | undefined) => {
  if (!found) return `This ${computer.info.kind} cannot find text, so nothing was scrolled. Scroll to look for "${text}".`
  if (match > found.count) return `${matches(found.count)} for "${text}"${found.count ? `; there is no match ${match}` : ''}.`
  return `Match ${match} of ${found.count} for "${text}", scrolled into view${hit ? ` as ${hit.ref}` : ''}.`
}

const sameRow = (box: Box, other: Box) => box.top < other.bottom && box.bottom > other.top

const searchLines = (computer: Computer, search: Search, found: Found | undefined, elements: UiElement[]) => {
  const hit = elements.find(element => element.ref === found?.ref)
  const shown = elements.filter(element => matchesText(element, search.text) || (hit && sameRow(element.box, hit.box)))
  const summary = `${shown.length} of ${elements.length} elements on screen match "${search.text}" or share a row with the match; leave out find to list them all.`
  return [searchNote(computer, search, found, hit), summary, ...elementLines(shown)]
}

const textPage = (text: string, offset: number) => {
  if (!text) return 'No text.'
  const end = Math.min(text.length, offset + READ_CHARS)
  if (offset === 0 && end === text.length) return text
  const more = end < text.length ? ` Pass offset ${end} for more.` : ''
  return `${text.slice(offset, end)}\n\n[Characters ${offset}–${end} of ${text.length}.${more}]`
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
  const listed = new Listed()

  const ownerOf = (computer: string, { conversation }: ToolContext): Owner => ({ computer, chat: conversation.id })

  const locate = (computer: Computer, owner: Owner) => async (ref: string) => {
    const element = listed.element(owner, ref)
    return computer.locate ? computer.locate(element) : element.box
  }

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
      .describe(
        'Browsers only: text to find in element names, labels, values and page text, even off screen or in frames; the best match, main content first, is scrolled into view and only elements that match or share its row are listed',
      ),
    match: z.number().int().min(1).default(1).describe('Which match of find: 1 is the first'),
  })

  const elements: Tool<typeof elementsInput> = {
    name: 'computer_elements',
    group,
    description:
      'List the UI elements on screen with refs, field values, link URLs and boxes as fractions of the screenshot. On a browser, pass find instead of scrolling to reach an element or off-screen text; a desktop has no find, so scroll there. Pass a ref to computer_act to act on its center, or to computer_read for its full text; in browsers a ref follows its element when the page moves or scrolls.',
    input: elementsInput,
    effect: 'read',
    needs: ['computer'],
    async run({ computer, find, match }, context) {
      const { id, computer: target } = targetOf(computer, context)
      const list = async () => {
        const found = await target.elements()
        listed.remember(ownerOf(id, context), found)
        return found
      }
      if (find === undefined) {
        const found = await list()
        return found.length ? elementLines(found).join('\n') : 'No elements found.'
      }
      const found = await target.find?.(find, match)
      return searchLines(target, { text: find, match }, found, await list()).join('\n')
    },
  }

  const readInput = which.extend({
    ref: z.string().optional().describe('An element ref from computer_elements, like a long text field or a rich-text editor or its frame (default: the main text of the page)'),
    offset: z.number().int().min(0).default(0).describe('Characters to skip, to read on where the last read stopped'),
  })

  const read: Tool<typeof readInput> = {
    name: 'computer_read',
    group,
    description:
      'Read text without screenshots: the main text of the page, or the full value or text of one element by ref, like a long field, a rich-text editor or its frame. Long text comes in pages.',
    input: readInput,
    effect: 'read',
    needs: ['computer'],
    async run({ computer, ref, offset }, context) {
      const { computer: target } = targetOf(computer, context)
      if (!target.read) return `This ${target.info.kind} cannot read text. Take a screenshot instead.`
      return textPage(await target.read(ref), offset)
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
      const outcome = await target.act(await resolveAction(action, locate(target, ownerOf(id, context))))
      const done = `Done: ${action.type}.${outcomeText(outcome)}`
      if (!screenshot) return done
      return [{ type: 'text' as const, text: done }, ...(await look(id, target))]
    },
  }

  return [list, screenshot, elements, read, act]
}
