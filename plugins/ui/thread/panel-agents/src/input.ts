export const inputText = (input: unknown, key: string) => {
  const value = (input as Record<string, unknown> | undefined)?.[key]
  return typeof value === 'string' ? value : ''
}
