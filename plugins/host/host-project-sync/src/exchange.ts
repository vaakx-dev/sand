import type { Project } from '@sand/host-projects/contract'
import type { RemoteRecord } from '@sand/host-remotes/contract'
import { callPeer, PeerError, type WireSocket } from '@sand/kit/host'
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
    return answer(await callPeer(record, { type: 'projects.sync', projects }, sockets))
  } catch (error) {
    if (!(error instanceof PeerError)) throw error
    return { state: error.state, detail: error.message }
  }
}
