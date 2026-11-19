import { duration } from '@sand/util'
import { AccountError, rawMessage } from '../errors'
import { Refused } from './refused'

const RESTARTING = new Set([502, 503, 504])

const refusedText = (error: Refused, pc: string, provider: string) => {
  if (error.status === 401) return `${pc} no longer accepts this PC — pair it again`
  if (error.status === 403) return `${pc} doesn't share ${provider} anymore`
  return `${pc} couldn't use ${provider}`
}

export const transient = (error: unknown) => !(error instanceof Refused) || RESTARTING.has(error.status)

export const refused = (pc: string, provider: string, error: Refused) => new AccountError(refusedText(error, pc, provider), `HTTP ${error.status} · ${error.message}`)

export const goneText = (pc: string, provider: string, waitedMs: number) => `${pc} has been out of reach for ${duration(waitedMs)}, so ${provider} isn't available`

export const gone = (text: string, error: unknown) => new AccountError(text, rawMessage(error), { cause: error })
