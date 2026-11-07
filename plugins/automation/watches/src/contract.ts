import { event, service, type Dispose } from 'drydock'
import type { output, ZodObject } from 'zod'

export interface Change {
  at: number
  from: string
  summary: string
  detail?: string
}

export interface KindContext {
  id: string
  state: unknown
  save(state: unknown): void
  emit(change: Change): void
  fail(error: unknown): void
  signal: AbortSignal
}

export interface Started {
  stop?: Dispose
  info?: Record<string, string>
}

export interface Kind<S extends ZodObject = ZodObject> {
  name: string
  label: string
  description: string
  input: S
  describe(input: output<S>): string
  start(input: output<S>, context: KindContext): Started | void | Promise<Started | void>
}

export interface Watch {
  id: string
  owner: string
  subject: string
  kind: string
  input: Record<string, unknown>
  label: string
  data: unknown
  target: string
  info?: Record<string, string>
  created: number
  changed?: number
  error?: string
}

export interface NewWatch {
  owner: string
  subject: string
  kind: string
  input: Record<string, unknown>
  label: string
  data?: unknown
}

export type Handler = (watch: Watch, changes: Change[], signal: AbortSignal) => Promise<void>

export interface Watches {
  kind<S extends ZodObject>(kind: Kind<S>): Dispose
  kinds(): Kind[]
  handle(owner: string, handler: Handler): Dispose
  create(spec: NewWatch): Promise<Watch>
  remove(id: string): boolean
  get(id: string): Watch | undefined
  list(owner: string, subject?: string): Watch[]
}

export const watches = service<Watches>('watches')

export const watchChange = event<(watch: Watch) => void>('watch.change')
export const watchRemove = event<(watch: Watch) => void>('watch.remove')
export const kindsChange = event<() => void>('watch.kinds')
