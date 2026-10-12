export interface Notice {
  push(text: string, options: { level: 'info' | 'error' }): void
}
