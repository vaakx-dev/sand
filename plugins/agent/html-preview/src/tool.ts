import type { HtmlPages, Tool, UserContent } from '@sand/protocol'
import { z } from 'zod'
import { capture, type Capture } from './capture'
import type { ConsoleMessage } from './console'
import { consoleHeading } from './output'

const inputFor = (pages: HtmlPages) =>
  z.object({
    path: z.string().describe('The .html file you will pass to html_render'),
    width: z
      .number()
      .int()
      .min(240)
      .max(1600)
      .optional()
      .describe(`Viewport width, default ${pages.columnWidth}; ~390 for phones.`),
    script: z.string().max(20_000).optional().describe('Async JS run before the screenshot, e.g. clicks and waits'),
    selector: z.string().optional().describe('Screenshot only this element, at 2x'),
  })

const consoleText = (messages: ConsoleMessage[]) =>
  messages.length ? messages.map(message => `[${message.level}] ${message.text}`).join('\n') : 'No console output.'

const missingNote = (missing: string[]) => (missing.length ? `\nImage paths that are not files, left as is: ${missing.join(', ')}.` : '')

const shotNotes = (shot: Capture, selector: string | undefined) => {
  const { region, shownHeight, images, contentHeight } = shot
  const total = selector ? region.height : contentHeight
  const notes = [
    selector && `${selector}: ${region.width}×${region.height}px at ${region.x},${region.y}, 2x`,
    images.length > 1 && `${images.length} images, top to bottom`,
    shownHeight < total && `first ${shownHeight} of ${total}px shown`,
  ].filter(Boolean)
  return notes.length ? `\n${notes.join('; ')}.` : ''
}

export const previewTool = (executable: string, pages: HtmlPages, timeoutMs: number): Tool<ReturnType<typeof inputFor>> => ({
  name: 'html_preview',
  description: "Check a page before html_render: returns a screenshot, contentHeight and console output. Not shown to the user.",
  input: inputFor(pages),
  async run({ path, width = pages.columnWidth, script, selector }, { signal, cwd }): Promise<UserContent[]> {
    const { html, missing } = await pages.load(path, cwd)
    const options = { width, maxHeight: pages.maxHeight, scale: selector ? 2 : 1, script, selector }
    const shot = await capture(executable, html, options, AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]))
    const text = `Width ${width}px, contentHeight ${shot.contentHeight}px.${shotNotes(shot, selector)}${missingNote(missing)}${consoleHeading}${consoleText(shot.messages)}`
    return [
      { type: 'text', text },
      ...shot.images.map((data, index): UserContent => ({ type: 'image', mediaType: 'image/png', data, name: `preview-${index + 1}.png` })),
    ]
  },
})
