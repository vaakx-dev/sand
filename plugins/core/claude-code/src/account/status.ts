import type { AppStatus } from '@sand/llm-accounts/contract'
import { capital } from '@sand/kit'
import { findClaude } from '../cli/binary'
import { claudeEnv } from '../cli/args'
import { fieldsOf } from '../cli/connection'

const planOf = (subscription: unknown, method: unknown) => {
  if (typeof subscription === 'string' && subscription) return capital(subscription.replace(/^claude\s+/i, ''))
  return method === 'claude.ai' ? undefined : 'API'
}

export const signOutClaude = async () => {
  const binary = await findClaude()
  if (!binary) return
  await Bun.spawn([binary, 'auth', 'logout'], { env: claudeEnv(), stdout: 'ignore', stderr: 'ignore', windowsHide: true }).exited
}

export const readStatus = async (): Promise<AppStatus> => {
  const binary = await findClaude()
  if (!binary) return { installed: false, signedIn: false }
  const child = Bun.spawn([binary, 'auth', 'status', '--json'], { env: claudeEnv(), stdout: 'pipe', stderr: 'pipe', windowsHide: true })
  const [text] = await Promise.all([new Response(child.stdout).text(), child.exited])
  let status
  try {
    status = fieldsOf(JSON.parse(text))
  } catch {
    return { installed: true, signedIn: false, problem: 'Claude Code gave an unreadable sign-in status' }
  }
  if (status.loggedIn !== true) return { installed: true, signedIn: false }
  const plan = planOf(status.subscriptionType, status.authMethod)
  return { installed: true, signedIn: true, ...(typeof status.email === 'string' && { email: status.email }), ...(plan && { plan }) }
}
