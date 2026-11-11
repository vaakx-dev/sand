import type { Route, SavedResume } from '@sand/devices-contract'
import { newNonce } from '@sand/devices-identity'
import { proofOf } from '../engine/hello'
import type { DialContext, DialRun } from './context'
import type { Opened } from './open'
import { identityOf, provesPc } from './proof'
import { claimedSocketPath, openSocket } from './socket'

export interface Resumable {
  route: Route
  saved: SavedResume
}

export const resumable = (routes: Route[], context: DialContext): Resumable | undefined => {
  const pc = context.expected().id
  const saved = context.resume.load(pc)
  const route = saved && saved.expires > Date.now() ? routes.find(found => found.key === saved.route && found.via === undefined) : undefined
  if (!saved || !route) return undefined
  context.resume.forget(pc)
  return { route, saved }
}

const greeted = async ({ route, saved }: Resumable, context: DialContext, run: DialRun): Promise<Opened | undefined> => {
  const expected = context.expected()
  const challenge = newNonce()
  const path = claimedSocketPath({ key: context.signer.publicKey, nonce: saved.nonce, signature: saved.signature }, challenge)
  const { link, hello, ms } = await openSocket(route, path, context, run)
  const proof = proofOf(hello)
  if (proof && (await provesPc(proof, expected, challenge))) return { link, hello, route, identity: identityOf(proof), ms }
  link.close()
  return undefined
}

export const resumeRoute = (resume: Resumable, context: DialContext, run: DialRun) => greeted(resume, context, run).catch(() => undefined)
