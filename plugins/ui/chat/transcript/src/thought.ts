import { oneLine } from '@sand/util'

interface Thought {
  title: string
  body: string
}

const TITLED = /^\s*\*\*(.+?)\*\*[ \t]*(?:\n|$)/

const unmarked = (text: string) => text.replace(/\*\*|__/g, '')

function thought(text: string): Thought {
  const found = TITLED.exec(text)
  if (found) return { title: oneLine(unmarked(found[1] ?? '')), body: unmarked(text.slice(found[0].length)).trim() }
  return { title: oneLine(unmarked(text)), body: unmarked(text).trim() }
}

export { thought, type Thought }
