import { writePrivateJson } from '@sand/kit/fs'
import { join } from 'node:path'

export interface TailscaleSettings {
  https: boolean
  target?: string
}

const file = (home: string) => join(home, 'tailscale.json')

export const loadSettings = async (home: string): Promise<TailscaleSettings> => {
  try {
    const { https, target } = (await Bun.file(file(home)).json()) as { https?: unknown; target?: unknown }
    return { https: https === true, ...(typeof target === 'string' ? { target } : {}) }
  } catch {
    return { https: false }
  }
}

export const saveSettings = (home: string, settings: TailscaleSettings) => writePrivateJson(file(home), settings)
