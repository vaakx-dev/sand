import type { Bar, PcReport, Use } from './contract'

const MB = 1024 * 1024
const GB = 1024 * MB
const SHARE_STEPS = 1000
const BAR_STEPS = 100

const bytesStep = (bytes: number) => (bytes >= 100 * GB ? GB : bytes >= GB ? GB / 10 : MB)

const shownBytes = (bytes: number) => Math.round(Math.round(bytes / bytesStep(bytes)) * bytesStep(bytes))

const stepped = (fraction: number, steps: number) => Math.round(fraction * steps) / steps

const shownUse = <T extends Use>(use: T): T => ({ ...use, bytes: shownBytes(use.bytes), cpu: stepped(use.cpu, SHARE_STEPS) })

const shownBar = (bar: Bar | null) => bar && { cpu: stepped(bar.cpu, BAR_STEPS), memory: stepped(bar.memory, BAR_STEPS) }

const shown = (report: PcReport): PcReport => ({
  ...report,
  totalBytes: shownBytes(report.totalBytes),
  freeBytes: shownBytes(report.freeBytes),
  cpu: stepped(report.cpu, SHARE_STEPS),
  bars: { ...report.bars, values: report.bars.values.map(shownBar) },
  chats: report.chats.map(chat => ({ ...shownUse(chat), trees: chat.trees.map(shownUse) })),
  sand: { ...shownUse(report.sand), parts: report.sand.parts.map(shownUse) },
  other: shownUse(report.other),
})

export { GB, MB, shown }
