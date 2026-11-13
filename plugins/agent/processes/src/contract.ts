import { type Dispose, event, service } from 'drydock'

export type TreeKind = 'command' | 'app' | 'sand' | 'browser'

export interface Tracked {
  conversation: string
  pid: number
  label: string
  kind: TreeKind
}

export interface Use {
  bytes: number
  cpu: number
}

export interface TreeUse extends Use {
  label: string
  kind: TreeKind
}

export interface ChatUse extends Use {
  conversation: string
  trees: TreeUse[]
}

export interface ChatMemory {
  conversation: string
  bytes: number
  pids: number[]
}

export interface MachineReading {
  at: number
  totalBytes: number
  freeBytes: number
  cpu: number
  cores: number
}

export interface Bar {
  cpu: number
  memory: number
}

export const ranges = ['5m', '15m', '1h'] as const

export type Range = (typeof ranges)[number]

export interface PcPerformance {
  totalBytes: number
  freeBytes: number
  cpu: number
  cores: number
  bars: (Bar | null)[]
  chats: ChatUse[]
  sand: Use & { parts: TreeUse[] }
  other: Use
}

export interface Processes {
  track(tracked: Tracked): Dispose
  chats(): Promise<ChatMemory[]>
  performance(range: Range): Promise<PcPerformance>
}

export const processes = service<Processes>('processes')

export const machineRead = event<(reading: MachineReading) => void>('machine.read')
