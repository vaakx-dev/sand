import type { NetworkScope } from '@sand/devices-contract'
import { devicesFile, readRecord, writeRecord } from '../store'

const file = (home: string) => devicesFile(home, 'network.json')

export const loadScope = async (home: string): Promise<NetworkScope> => ((await readRecord(file(home))).scope === 'local' ? 'local' : 'network')

export const saveScope = (home: string, scope: NetworkScope) => writeRecord(file(home), { scope })
