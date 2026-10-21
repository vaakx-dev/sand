import type { RemoteRecord } from '@sand/host-remotes/contract'
import { callPeer } from '@sand/host-remotes/peers'
import { PeerError, type WireSocket } from '@sand/util/boot'
import { projectsSync, type Project } from '../contract'
import { cleanProjects } from './clean'

export type Outcome = { state: 'ok'; projects: Project[] } | { state: PeerError['state']; detail: string }

const answer = (result: unknown): Outcome => {
  try {
    return { state: 'ok', projects: cleanProjects(result) }
  } catch {
    return { state: 'failed', detail: 'it did not answer with a project list' }
  }
}

export const exchange = async (record: RemoteRecord, projects: Project[], sockets: Set<WireSocket>): Promise<Outcome> => {
  try {
    return answer(await callPeer(record, projectsSync, { projects }, sockets))
  } catch (error) {
    if (!(error instanceof PeerError)) throw error
    return { state: error.state, detail: error.message }
  }
}
