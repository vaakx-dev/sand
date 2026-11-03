import { columnWidth, maxHeight, maxHtmlChars, minHeight } from '../page/limits'
import { tokenNames } from '../page/tokens'

const layoutGuide = [
  `The frame is as wide as the reply column (${columnWidth}px on desktop, about 360px on a phone) and sits on the thread background.`,
  'Leave html, body and the outermost element with no background, no outer card or border, no banner title and no side padding.',
  'A box that needs its own background gets 16px padding and var(--radius) corners.',
  'Give charts fixed pixel heights.',
  'Let content set the height: no vh units and no height:100% on html or body. vh is rejected, and 100% loops as the frame grows.',
].join(' ')

const themeGuide = [
  `Use these theme CSS variables instead of fixed colors: ${tokenNames().join(', ')}.`,
  'The page follows the app theme as the reader switches it. The base sheet already sets the background, text color and font.',
].join(' ')

const pageRules = `Inline <style> and <script>. Local images as absolute paths, or paths relative to the thread folder, are inlined; remote URLs load as they are. At most ${maxHtmlChars} characters.`

export const renderDescription = `Show a finished HTML page (chart, diagram, table, mockup) inline in this thread, above your final reply. The frame fits the page's height. Pass the document as html, or write it to a file and pass path; pass neither to publish the page html_preview just checked. ${layoutGuide} ${themeGuide} ${pageRules}`

export const previewDescription = `Check an HTML page before html_render. Returns a PNG of the page, its real height and its console output, so a broken or clipped page is caught before the reader sees it. The reader sees nothing of this; html_render shows the page. ${layoutGuide} ${pageRules}`

export const shownNote = "Shown to the reader above your reply. Don't describe the page; reply with only what it doesn't already say."

export const heightNote = `Frame height in CSS pixels, ${minHeight} to ${maxHeight}, until the page reports its own. Leave it out when publishing the page html_preview just checked.`
