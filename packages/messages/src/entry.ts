export interface Entry {
  id: string
  session: string
  parent: string | null
  at: number
  type: string
  data: unknown
}
