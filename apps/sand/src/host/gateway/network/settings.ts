import { join } from 'node:path'
import { writePrivateJson } from '../../private'

const file = (home: string) => join(home, 'network.json')

export const hostnameFor = (lan: boolean) => (lan ? '0.0.0.0' : '127.0.0.1')

export const loadLan = async (home: string) => {
  try {
    const { lan } = (await Bun.file(file(home)).json()) as { lan?: unknown }
    return typeof lan === 'boolean' ? lan : true
  } catch {
    return true
  }
}

export const saveLan = (home: string, lan: boolean) => writePrivateJson(file(home), { lan })
