export interface Typed {
  char: string
  query: string
  from: number
}

export const commandChar = '/'

const escaped = (char: string) => char.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')

const command = (before: string): Typed | undefined => {
  const query = /^\/(\S*)$/.exec(before)?.[1]
  return query === undefined ? undefined : { char: commandChar, query, from: 0 }
}

const mention = (before: string, chars: string[]): Typed | undefined => {
  if (!chars.length) return undefined
  const line = before.lastIndexOf('\n') + 1
  const pattern = new RegExp(`(?:^|\\s)([${chars.map(escaped).join('')}])("[^"]*|[^\\s"]*)$`)
  const found = pattern.exec(before.slice(line))
  if (!found) return undefined
  const [whole, char, typed] = found
  return { char: char!, query: typed!.replace(/^"/, ''), from: before.length - whole.length + whole.indexOf(char!) }
}

export const typedTrigger = (before: string, chars: string[]) =>
  (chars.includes(commandChar) ? command(before) : undefined) ?? mention(before, chars.filter(char => char !== commandChar))
