import type { ThreadItem, ThreadRow, ThreadState, ThreadStatus } from '@sand/orchestrator/contract'

const exits: Record<ThreadStatus, number> = { idle: 0, running: 0, completed: 0, waiting: 3, interrupted: 130, failed: 1, lost: 1 }

const notes: Partial<Record<ThreadStatus, (state: ThreadState) => string>> = {
  waiting: state => `${state.thread} is waiting on you: ${state.waiting?.title ?? 'answer it in sand'}`,
  interrupted: state => `${state.thread} was interrupted`,
  failed: state => state.error ?? `${state.thread} failed`,
  lost: state => `${state.thread} lost its turn when sand stopped`,
}

const speakers: Record<ThreadItem['role'], string> = { user: 'you', assistant: 'sand' }

export const printState = (state: ThreadState, json: boolean) => {
  if (json) console.log(JSON.stringify(state))
  else if (state.status === 'running') console.log(state.thread)
  else {
    if (state.reply) console.log(state.reply)
    const note = notes[state.status]?.(state)
    if (note) console.error(note)
  }
  return exits[state.status]
}

export const printItems = (items: ThreadItem[], json: boolean) => {
  if (json) return console.log(JSON.stringify(items))
  console.log(items.map(item => `${speakers[item.role]}:\n${item.text}`).join('\n\n'))
}

export const printRows = (rows: ThreadRow[], json: boolean) => {
  if (json) return console.log(JSON.stringify(rows))
  const cells = rows.map(row => [row.thread, row.status, row.title, row.cwd])
  const widths = [0, 1, 2].map(column => Math.max(0, ...cells.map(cell => cell[column]!.length)))
  for (const cell of cells) console.log(cell.map((text, column) => text.padEnd(widths[column] ?? 0)).join('  ').trimEnd())
}

export const printStop = (thread: string, stopped: boolean, json: boolean) => {
  if (json) console.log(JSON.stringify({ thread, stopped }))
  else console.log(stopped ? `stopped ${thread}` : `${thread} was not running`)
}
