import type { DetectedServer } from '../contract'
import { getJson } from './http'
import { modelIds } from './server'

const probes: Omit<DetectedServer, 'models'>[] = [
  { name: 'Ollama', provider: 'ollama', url: 'http://localhost:11434/v1' },
  { name: 'LM Studio', provider: 'lmstudio', url: 'http://localhost:1234/v1' },
]

const probe = async (server: Omit<DetectedServer, 'models'>): Promise<DetectedServer | undefined> => {
  try {
    const ids = modelIds(await getJson(server.name, `${server.url}/models`, {}, 1_500))
    return ids ? { ...server, models: ids.length } : undefined
  } catch {
    return undefined
  }
}

export const detectServers = async (): Promise<DetectedServer[]> => {
  const found = await Promise.all(probes.map(probe))
  return found.filter((server): server is DetectedServer => !!server)
}
