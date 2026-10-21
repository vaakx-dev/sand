import type { DetectedServer } from '../contract'
import { getJson } from './http'
import { modelIds } from './server'

type Probe = Omit<DetectedServer, 'models'>

const probes: Probe[] = [
  { name: 'Ollama', provider: 'ollama', url: 'http://localhost:11434/v1' },
  { name: 'LM Studio', provider: 'lmstudio', url: 'http://localhost:1234/v1' },
]

const probe = async (server: Probe): Promise<DetectedServer[]> => {
  try {
    const ids = modelIds(server.name, await getJson(server.name, `${server.url}/models`, {}, 1_500))
    return [{ ...server, models: ids.length }]
  } catch {
    return []
  }
}

export const detectServers = async (): Promise<DetectedServer[]> => (await Promise.all(probes.map(probe))).flat()
