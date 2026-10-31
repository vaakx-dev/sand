import { pcHello, type Wire } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { sig, type Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { type GitHubAuth, githubAuth, githubAuthChange, githubLogin, githubLogout } from '../contract'

const failed = (error: unknown): GitHubAuth => ({ state: 'error', message: errorMessage(error) })

export const authBook = (ctx: Context, wire: Wire) => {
  const auths = new Map<string, Sig<GitHubAuth | undefined>>()
  const checking = new Map<string, Promise<GitHubAuth>>()

  const slot = (device: string) => {
    const found = auths.get(device)
    if (found) return found
    const made = sig<GitHubAuth | undefined>(undefined)
    auths.set(device, made)
    return made
  }

  const keep = (device: string, auth: GitHubAuth) => {
    slot(device).set(auth)
    return auth
  }

  const check = (device: string) => {
    const running = checking.get(device)
    if (running) return running
    const next = wire
      .call(githubAuth, {}, device)
      .catch(failed)
      .then(auth => keep(device, auth))
      .finally(() => checking.delete(device))
    checking.set(device, next)
    return next
  }

  const authOf = (device: string) => {
    if (!auths.has(device)) void check(device)
    return slot(device).get()
  }

  ctx.effect(() => wire.on(githubAuthChange, (auth, device) => keep(device, auth), { from: 'all' }))
  ctx.on(pcHello, device => {
    if (auths.has(device)) void check(device)
  })

  return {
    authOf,
    auth: check,
    login: (device: string) => wire.call(githubLogin, {}, device).then(auth => keep(device, auth)),
    logout: (device: string) => wire.call(githubLogout, {}, device).then(auth => keep(device, auth)),
  }
}
