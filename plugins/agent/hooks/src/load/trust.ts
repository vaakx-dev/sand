import { join } from 'node:path'

type TrustRecords = Record<string, { hash: string; at: number }>

export interface TrustStore {
  matches(folder: string, hash: string): Promise<boolean>
  save(folder: string, hash: string): Promise<void>
}

export const trustStore = (home: string): TrustStore => {
  const file = Bun.file(join(home, 'hooks-trust.json'))
  let records: Promise<TrustRecords> | undefined
  const read = () =>
    (records ??= file
      .json()
      .then(data => (data && typeof data === 'object' ? (data as TrustRecords) : {}))
      .catch((): TrustRecords => ({})))

  return {
    async matches(folder, hash) {
      return (await read())[folder]?.hash === hash
    },
    async save(folder, hash) {
      const all = await read()
      all[folder] = { hash, at: Date.now() }
      await Bun.write(file, JSON.stringify(all, null, 2))
    },
  }
}
