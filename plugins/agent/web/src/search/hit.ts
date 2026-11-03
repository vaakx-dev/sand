export interface Hit {
  title: string
  url: string
  snippet: string
}

export type Provider = (query: string, count: number, signal: AbortSignal) => Promise<Hit[]>
