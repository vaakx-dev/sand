import { forestOf, type ProcessInfo } from '@sand/machine'
import type { ChatMemory, ChatUse, PcPerformance, Range, Tracked, TreeUse, Use } from './contract'
import type { Measured, Meter } from './meter'
import type { Registry } from './registry'
import type { Sampler } from './sampler'

const BROWSERS = /chrom|msedge|headless_shell/i

type Tree = (roots: number[]) => ProcessInfo[]

const useOf = (entries: ProcessInfo[], { cpuOf }: Measured): Use => ({
  bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
  cpu: entries.reduce((sum, entry) => sum + cpuOf(entry), 0),
})

const byBytes = (first: Pick<Use, 'bytes'>, second: Pick<Use, 'bytes'>) => second.bytes - first.bytes

const chatUse = (conversation: string, tracked: Tracked[], treeOf: Tree, measured: Measured): ChatUse => {
  const trees = tracked.map(({ pid, label, kind }): TreeUse => ({ label, kind, ...useOf(treeOf([pid]), measured) }))
  return { conversation, ...useOf(treeOf(tracked.map(entry => entry.pid)), measured), trees: trees.toSorted(byBytes) }
}

const sandUse = (sandProcesses: ProcessInfo[], measured: Measured) => {
  const browser = sandProcesses.filter(entry => BROWSERS.test(entry.name))
  const own = sandProcesses.filter(entry => !BROWSERS.test(entry.name))
  const parts: TreeUse[] = [{ label: 'sand', kind: 'sand', ...useOf(own, measured) }]
  if (browser.length) parts.push({ label: 'Headless browser', kind: 'browser', ...useOf(browser, measured) })
  return { ...useOf(sandProcesses, measured), parts }
}

const remainder = (whole: Use, parts: Use[]): Use => ({
  bytes: Math.max(0, whole.bytes - parts.reduce((sum, part) => sum + part.bytes, 0)),
  cpu: Math.max(0, whole.cpu - parts.reduce((sum, part) => sum + part.cpu, 0)),
})

export const chatMemory = (registry: Registry, all: ProcessInfo[]): ChatMemory[] => {
  const treeOf = forestOf(all)
  return [...registry.byChat()]
    .map(([conversation, tracked]) => {
      const tree = treeOf(tracked.map(entry => entry.pid))
      return { conversation, bytes: tree.reduce((sum, entry) => sum + entry.bytes, 0), pids: tree.map(entry => entry.pid) }
    })
    .toSorted(byBytes)
}

export const performanceOf = async ({ registry, meter, sampler }: { registry: Registry; meter: Meter; sampler: Sampler }, range: Range): Promise<PcPerformance> => {
  const [reading, measured] = await Promise.all([sampler.latest(), meter.measureWarm()])
  const treeOf = forestOf(measured.all)
  const byChat = registry.byChat()
  const chats = [...byChat].map(([conversation, tracked]) => chatUse(conversation, tracked, treeOf, measured)).toSorted(byBytes)
  const inChats = new Set(treeOf([...byChat.values()].flat().map(entry => entry.pid)).map(entry => entry.pid))
  const sand = sandUse(
    treeOf([process.ppid, process.pid]).filter(entry => !inChats.has(entry.pid)),
    measured,
  )
  const used = { bytes: reading.totalBytes - reading.freeBytes, cpu: reading.cpu }
  return { totalBytes: reading.totalBytes, freeBytes: reading.freeBytes, cpu: reading.cpu, cores: reading.cores, bars: sampler.bars(range), chats, sand, other: remainder(used, [sand, ...chats]) }
}
