import type { AppStatus } from '@sand/accounts/contract'
import { fieldsOf, pasteSignIn } from '@sand/app-plan'
import { capital } from '@sand/util'
import { claudeEnv } from '../cli/args'
import { claude } from '../cli/binary'

const AUTHORIZE_URL = /https:\/\/[^\s\x07\x1b]+\/oauth\/authorize[^\s\x07\x1b]*/

const planOf = (subscription: unknown, method: unknown) => {
  if (typeof subscription === 'string' && subscription) return capital(subscription.replace(/^claude\s+/i, ''))
  return method === 'claude.ai' ? undefined : 'API'
}

const statusOf = (text: string): AppStatus => {
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

export const readStatus = async (config?: string): Promise<AppStatus> => {
  const child = Bun.spawn([await claude.require(), 'auth', 'status', '--json'], { env: claudeEnv(config), stdout: 'pipe', stderr: 'pipe', windowsHide: true })
  const [text] = await Promise.all([new Response(child.stdout).text(), child.exited])
  return statusOf(text)
}

export const signIn = async (signal: AbortSignal, config?: string) =>
  pasteSignIn({
    app: claude.app,
    command: [await claude.require(), 'auth', 'login', '--claudeai'],
    env: claudeEnv(config),
    link: AUTHORIZE_URL,
    signal,
    signedIn: async () => (await readStatus(config)).signedIn,
  })

export const signOut = async (config?: string) => {
  await Bun.spawn([await claude.require(), 'auth', 'logout'], { env: claudeEnv(config), stdout: 'ignore', stderr: 'ignore', windowsHide: true }).exited
}
