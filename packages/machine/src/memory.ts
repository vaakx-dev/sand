import { freemem, totalmem } from 'node:os'

interface Memory {
  totalBytes: number
  freeBytes: number
}

const memoryLevel = async () => {
  const sysctl = Bun.spawn(['sysctl', '-n', 'kern.memorystatus_level'], { stdout: 'pipe', stderr: 'ignore' })
  const percent = Number((await new Response(sysctl.stdout).text()).trim())
  return Number.isFinite(percent) ? percent / 100 : undefined
}

const macFreeBytes = async (totalBytes: number) => {
  const level = await memoryLevel()
  return level === undefined ? freemem() : Math.round(level * totalBytes)
}

const memory = async (): Promise<Memory> => {
  const totalBytes = totalmem()
  const freeBytes = process.platform === 'darwin' ? await macFreeBytes(totalBytes) : freemem()
  return { totalBytes, freeBytes }
}

export { memory, type Memory }
