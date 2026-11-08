import type { Answers } from '../askpass/answers'
import type { SshResult } from './run'
import { sshErrorText } from './text'

export class NeedsYou extends Error {}

export const cancelled = () => new Error('Cancelled')

export const sshFailure = (result: SshResult, answers: Answers, signal?: AbortSignal) => {
  if (signal?.aborted) return cancelled()
  const prompt = answers.needsYou()
  if (prompt) return new NeedsYou(`SSH asks “${prompt}”, which sand doesn't keep; reconnect to answer it`)
  const text = sshErrorText(result.stderr || result.stdout, Object.values(answers.kept()))
  return new Error(text || `ssh stopped with code ${result.code}`)
}

export const succeeded = async (exited: Promise<SshResult>, answers: Answers, signal?: AbortSignal) => {
  const result = await exited
  if (result.code !== 0) throw sshFailure(result, answers, signal)
  return result
}
