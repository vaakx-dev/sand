export interface Entry {
  id: string
  session: string
  parent: string | null
  at: number
  type: string
  data: unknown
  seq: number
  turn?: string
}

export interface AppendMeta {
  id?: string
  at?: number
  turn?: string
}
