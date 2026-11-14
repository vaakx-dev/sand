interface Ask {
  id: number
  file: string
}

type Reply =
  | { kind: 'loaded'; device: string }
  | { kind: 'failed'; error: string }
  | { kind: 'text'; id: number; text: string }
  | { kind: 'error'; id: number; error: string }

export type { Ask, Reply }
