import { z } from 'zod'

const defaultTimeout = 300_000
const maxTimeout = 1_800_000
const settleGrace = 30_000

export const toolTimeout = maxTimeout + settleGrace

export const timeoutInput = z
  .number()
  .int()
  .positive()
  .max(maxTimeout)
  .optional()
  .describe(`Stop waiting after this long (default ${defaultTimeout}, max ${maxTimeout}) and get a handle instead; the work goes on`)

export const replyWaitInput = z
  .number()
  .int()
  .positive()
  .max(maxTimeout)
  .optional()
  .describe(`Wait up to this long for its reply (max ${maxTimeout}); leave it out to get the thread back at once`)

export const waitSignal = (signal: AbortSignal, timeout = defaultTimeout) => AbortSignal.any([signal, AbortSignal.timeout(timeout)])
