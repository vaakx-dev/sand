export interface ChunkedFile {
  transfer: string
  size: number
  chunks: number
}

export type PcFetch = (path: string, init?: RequestInit) => Promise<Response>

export const transferPath = '/transfer'

export const chunkBytes = 1024 ** 2

const inFlight = 4

export const chunkCount = (size: number) => Math.ceil(size / chunkBytes)

export const chunkFits = (size: number, index: number, length: number) =>
  Number.isSafeInteger(size) && Number.isSafeInteger(index) && index >= 0 && index < chunkCount(size) && length === Math.min(chunkBytes, size - index * chunkBytes)

export const chunkUrl = ({ transfer, size }: Pick<ChunkedFile, 'transfer' | 'size'>, index: number) =>
  `${transferPath}?${new URLSearchParams({ transfer, size: String(size), index: String(index) })}`

export const checked = async (response: Response) => {
  if (!response.ok) throw new Error((await response.text()) || `the PC answered ${response.status}`)
  return response
}

export const fetchChunk = async (from: PcFetch, file: ChunkedFile, index: number) => (await checked(await from(chunkUrl(file, index)))).bytes()

export const eachChunk = async (chunks: number, work: (index: number) => Promise<void>) => {
  let next = 0
  const worker = async () => {
    for (let index = next++; index < chunks; index = next++) await work(index)
  }
  await Promise.all(Array.from({ length: inFlight }, worker))
}
