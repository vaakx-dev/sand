import type { TextBlock } from '@sand/protocol'
import { noteBlock } from '@sand/kit'

export const moveNote = (from: string, pc: string, cwd: string, notes: string[]): TextBlock =>
  noteBlock(
    'sand',
    [
      [`Moved from ${from} to ${pc}.`, `Working directory: ${cwd}.`, `Platform: ${process.platform}.`, ...notes.map(note => `${note}.`)].join(' '),
      `Earlier tool results came from ${from}; files, processes and tools here may differ.`,
    ].join('\n'),
  )
