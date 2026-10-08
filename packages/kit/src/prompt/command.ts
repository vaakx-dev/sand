const pattern = /^\/([a-z][\w-]*)(?:\s+([\s\S]*))?$/

export const parseCommand = (text: string) => {
  const found = pattern.exec(text)
  return found ? { name: found[1]!, args: found[2]?.trim() ?? '' } : undefined
}
