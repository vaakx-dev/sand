import { join } from 'node:path'

export type Choices = Record<string, boolean>

const file = (home: string) => join(home, 'web.json')

const booleans = (value: unknown): Choices =>
  typeof value === 'object' && value !== null
    ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'))
    : {}

export const readChoices = async (home: string): Promise<Choices> => {
  try {
    return booleans((await Bun.file(file(home)).json())?.extensions)
  } catch {
    return {}
  }
}

export const writeChoices = (home: string, choices: Choices) =>
  Bun.write(file(home), `${JSON.stringify({ extensions: choices }, null, 2)}\n`)
