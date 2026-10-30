import { devicesFile, readRecord, writeRecord } from '../store'

export interface TailscaleSettings {
  https: boolean
  target?: string
}

const file = (home: string) => devicesFile(home, 'tailscale.json')

export const loadSettings = async (home: string): Promise<TailscaleSettings> => {
  const { https, target } = await readRecord(file(home))
  return { https: https === true, ...(typeof target === 'string' ? { target } : {}) }
}

export const saveSettings = (home: string, settings: TailscaleSettings) => writeRecord(file(home), { ...settings })
