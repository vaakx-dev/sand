import { pathToFileURL } from 'node:url'
import { sampleRate } from '../../audio'
import type { Ask, Reply } from './messages'
import { pcmOf } from './wav'

interface Device {
  deviceType: string
  description: string
}

interface Model {
  transcribe(pcm: Float32Array): Promise<{ text: string }>
  dispose(): void
}

interface Engine {
  getAvailableBackendsAsync(): Promise<Device[]>
  TranscribeModel: { load(path: string, options: { device: Device }): Promise<Model> }
}

interface Loaded {
  model: Model
  device: Device
}

const [entry = '', modelFile = ''] = process.argv.slice(2)

const send = (reply: Reply) => process.send?.(reply)

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error))

const isAsk = (message: unknown): message is Ask =>
  typeof message === 'object' && message !== null && 'id' in message && typeof message.id === 'number' && 'file' in message && typeof message.file === 'string'

const preferred = (devices: Device[]) => [...devices.filter(device => device.deviceType === 'gpu'), ...devices.filter(device => device.deviceType === 'cpu')]

const loadOn = async (engine: Engine, device: Device): Promise<Loaded> => {
  const model = await engine.TranscribeModel.load(modelFile, { device })
  await model.transcribe(new Float32Array(sampleRate))
  return { model, device }
}

const loadFirst = async (engine: Engine, devices: Device[]): Promise<Loaded> => {
  const [first, ...rest] = devices
  if (!first) throw new Error('The speech engine found no device to run on')
  if (!rest.length) return loadOn(engine, first)
  return loadOn(engine, first).catch(() => loadFirst(engine, rest))
}

const start = async () => {
  const engine: Engine = await import(pathToFileURL(entry).href)
  const devices = preferred(await engine.getAvailableBackendsAsync())
  let loaded = await loadFirst(engine, devices)

  const cpu = devices.find(device => device.deviceType === 'cpu')

  const againOnCpu = async (pcm: Float32Array, error: unknown) => {
    if (!cpu || loaded.device === cpu) throw error
    loaded.model.dispose()
    loaded = await loadOn(engine, cpu)
    send({ kind: 'loaded', device: cpu.description })
    return loaded.model.transcribe(pcm)
  }

  const transcribe = async (pcm: Float32Array) => {
    const result = await loaded.model.transcribe(pcm).catch((error: unknown) => againOnCpu(pcm, error))
    return result.text.trim()
  }

  const answer = async ({ id, file }: Ask) => {
    try {
      send({ kind: 'text', id, text: await transcribe(pcmOf(await Bun.file(file).bytes())) })
    } catch (error) {
      send({ kind: 'error', id, error: messageOf(error) })
    }
  }

  process.on('message', message => {
    if (isAsk(message)) void answer(message)
  })
  send({ kind: 'loaded', device: loaded.device.description })
}

process.on('disconnect', () => process.exit(0))
start().catch(error => send({ kind: 'failed', error: messageOf(error) }))
