import { isPcUnavailable, type Peers, type PeerView } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { projectsSync, type Project } from '../contract'
import { cleanProjects } from './clean'

export type Outcome = { state: 'ok'; projects: Project[] } | { state: 'offline' | 'failed'; detail: string }

const answer = (result: unknown): Outcome => {
  try {
    return { state: 'ok', projects: cleanProjects(result) }
  } catch {
    return { state: 'failed', detail: 'it did not answer with a project list' }
  }
}

export const exchange = async (peers: Peers, pc: PeerView, projects: Project[]): Promise<Outcome> => {
  try {
    return answer(await peers.call(pc.id, projectsSync, { projects }))
  } catch (error) {
    if (isPcUnavailable(error)) return { state: 'offline', detail: `${pc.name} isn't connected` }
    return { state: 'failed', detail: errorMessage(error) }
  }
}
