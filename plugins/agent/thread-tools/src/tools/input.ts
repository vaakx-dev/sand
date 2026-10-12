import { z } from 'zod'

export const threadInput = {
  thread: z.string().describe('Thread id or name'),
  pc: z.string().optional().describe("The thread's PC, by name or id. Found by itself when left out"),
}
