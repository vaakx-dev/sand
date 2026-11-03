export interface Hit {
  title: string
  url: string
  snippet: string
}

export interface Query {
  text: string
  count: number
}

export interface Provider {
  name: string
  find: (query: Query, signal: AbortSignal) => Promise<Hit[]>
}

export class Fatal extends Error {}
