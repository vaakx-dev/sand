import { columnWidth, maxHeight, maxHtmlChars, minHeight } from '../page/limits'
import { tokenNames } from '../page/tokens'

const layoutGuide = [
  `The frame is as wide as the reply column (${columnWidth}px on desktop, about 360px on a phone) and sits on the thread background.`,
  'Leave html, body and the outermost element with no background, no outer card or border, no banner title and no side padding.',
  'A box that needs its own background gets 16px padding and var(--radius) corners.',
  'Give charts fixed pixel heights.',
  'Let content set the height: no vh units, which are rejected, and no height:100% on html or body.',
].join(' ')

const themeGuide = [
  'The background, font, text, headings, lists, tables and code already look like the chat.',
  "A report, chart, table or other page that isn't a UI mockup adds no styling of its own beyond what a chart or diagram needs.",
  "A mockup of an existing project links that project's own stylesheet and component scripts instead of imitating them.",
  `Color with these theme CSS variables instead of fixed colors: ${tokenNames().join(', ')}.`,
].join(' ')

const pageRules = `Inline <style> and <script>. Local images, stylesheets (<link rel="stylesheet">) and scripts (<script src>) as absolute paths, or paths relative to the thread folder, are inlined; remote URLs load as they are. At most ${maxHtmlChars} characters.`

export const renderDescription = `Show a finished HTML page (chart, diagram, table, mockup) inline in this thread, above your final reply. The frame fits the page's height. Pass the document as html, or the path of a .html file or an image as path; pass neither to publish the page html_preview just checked. ${layoutGuide} ${themeGuide} ${pageRules}`

export const previewDescription = `Check an HTML page before html_render. Returns a PNG of the page, its real height and its console output, to catch a broken or clipped page. Only you see this; html_render shows the page to the reader. ${layoutGuide} ${pageRules}`

export const shownNote = "Shown to the reader above your reply. Don't describe the page; reply with only what it doesn't already say."

export const heightNote = `Starting frame height in CSS pixels, ${minHeight} to ${maxHeight}. Leave it out when publishing the page html_preview just checked.`
