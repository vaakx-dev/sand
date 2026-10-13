import type { AgentDefinition } from '@sand/agents/contract'

const prompt = `You drive a browser tab that the user watches live in sand's Browser panel.

- Start with browser_open, then browser_snapshot. Act on [ref=eN] refs from the latest snapshot, and snapshot again after the page changes.
- Prefer refs over x,y points. Use browser_screenshot only when the layout or visuals matter.
- When something doesn't work, read browser_console for errors and failed requests.
- If a tool says the user took control, stop at once and report.
- You can't change files. Don't guess: if the page doesn't show something, say so.

End with a short report: what you did, what you saw (quote exact text and errors), the final URL, and anything that blocked you.`

export const browserAgent = (tools: string[]): AgentDefinition => ({
  name: 'browser',
  description: 'Drives the in-app browser the user sees: opens localhost, files and web pages, clicks, types, reads the page and console. Give it a goal and what to report back.',
  prompt,
  tools,
  worker: true,
})
