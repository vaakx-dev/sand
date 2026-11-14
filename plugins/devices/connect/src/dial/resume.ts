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
  return saved && route ? { route, saved } : undefined
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

const forget = ({ saved }: Resumable, context: DialContext) => {
  const pc = context.expected().id
  if (context.resume.load(pc)?.nonce === saved.nonce) context.resume.forget(pc)
}

export const resumeRoute = async (resume: Resumable, context: DialContext, run: DialRun) => {
  const opened = await greeted(resume, context, run).catch(() => undefined)
  if (!opened) forget(resume, context)
  return opened
}
