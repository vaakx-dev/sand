import { rename } from 'node:fs/promises'
import { errorMessage } from '../text/error'
import { isMissing } from './errors'
import { retryLocked } from './locked'

type Parse<T> = (data: unknown) => T | undefined

type Unread = { kind: 'missing' } | { kind: 'damaged'; problem: string }

type Text = Unread | { kind: 'text'; text: string }

type Read<T> = Unread | { kind: 'read'; value: T }

const damagedPath = (file: string) => `${file}.damaged-${new Date().toISOString().replace(/[:.]/g, '-')}`

const setAside = async (file: string, problem: string) => {
  const target = damagedPath(file)
  try {
    await retryLocked(() => rename(file, target))
    console.error(`${file} ${problem}, so sand moved it to ${target} and starts from defaults`)
  } catch (error) {
    console.error(`${file} ${problem}, and sand could not move it to ${target} (${errorMessage(error)}), so it starts from defaults`)
  }
}

const decoded = (text: string): { data: unknown } | { problem: string } => {
  try {
    return { data: JSON.parse(text) }
  } catch (error) {
    return { problem: `is not valid JSON (${errorMessage(error)})` }
  }
}

const parsed = <T>(text: string, parse: Parse<T>): Read<T> => {
  const json = decoded(text)
  if ('problem' in json) return { kind: 'damaged', problem: json.problem }
  const value = parse(json.data)
  return value === undefined ? { kind: 'damaged', problem: 'holds data sand does not understand' } : { kind: 'read', value }
}

const textOf = async (file: string): Promise<Text> => {
  try {
    return { kind: 'text', text: await Bun.file(file).text() }
  } catch (error) {
    return isMissing(error) ? { kind: 'missing' } : { kind: 'damaged', problem: `could not be read (${errorMessage(error)})` }
  }
}

const stateOf = async <T>(file: string, parse: Parse<T>): Promise<Read<T>> => {
  const read = await textOf(file)
  return read.kind === 'text' ? parsed(read.text, parse) : read
}

const readState = async <T>(file: string, parse: Parse<T>): Promise<T | undefined> => {
  const state = await stateOf(file, parse)
  if (state.kind === 'damaged') await setAside(file, state.problem)
  return state.kind === 'read' ? state.value : undefined
}

export { readState, setAside }
