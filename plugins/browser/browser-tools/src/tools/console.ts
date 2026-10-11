import type { Logs } from '@sand/browser-engine/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Tabs } from '../tabs'

const input = z.object({ errors_only: z.boolean().optional() })

const shown = 40

const consoleText = ({ console }: Logs, errorsOnly: boolean) =>
  console
    .filter(entry => !errorsOnly || entry.level === 'error')
    .slice(-shown)
    .map(entry => `[${entry.level}] ${entry.text}${entry.source ? ` (${entry.source})` : ''}`)

const networkText = ({ network }: Logs) =>
  network
    .filter(entry => entry.failed || (entry.status ?? 0) >= 400)
    .slice(-shown)
    .map(entry => `${entry.method} ${entry.url} → ${entry.failed ?? entry.status}`)

const section = (title: string, lines: string[], empty: string) => `${title}:\n${lines.length ? lines.join('\n') : empty}`

export const consoleTool = (tabs: Tabs): Tool<typeof input> => ({
  name: 'browser_console',
  description: 'Read recent console messages and failed network requests.',
  input,
  run: ({ errors_only = false }, { session }) =>
    tabs.current(session, tab => {
      const logs = tab.logs()
      return `${section('Console', consoleText(logs, errors_only), 'Nothing logged.')}\n\n${section('Failed requests', networkText(logs), 'None.')}`
    }),
})
