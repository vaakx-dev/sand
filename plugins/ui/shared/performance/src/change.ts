import type { Bar, Bars, ChatRow, ChatsChange, PcChange, PcReport } from './contract'

const same = (first: unknown, second: unknown) => JSON.stringify(first) === JSON.stringify(second)

const startOf = (bars: Bars) => bars.end - bars.values.length + 1

const barAt = (bars: Bars, window: number): Bar | null | undefined => (window < startOf(bars) || window > bars.end ? undefined : bars.values[window - startOf(bars)])

const barsChange = (old: Bars, now: Bars) => {
  const first = now.values.findIndex((bar, offset) => !same(barAt(old, startOf(now) + offset), bar))
  return first === -1 ? undefined : { end: now.end, values: now.values.slice(first) }
}

const mergedBars = (old: Bars, recent: Bars): Bars => {
  const start = recent.end - old.values.length + 1
  const barOf = (window: number) => {
    const fresh = barAt(recent, window)
    return fresh === undefined ? (barAt(old, window) ?? null) : fresh
  }
  return { end: recent.end, values: old.values.map((_, offset) => barOf(start + offset)) }
}

const byBytes = (first: ChatRow, second: ChatRow) => second.bytes - first.bytes

const chatsChange = (old: ChatRow[], now: ChatRow[]): ChatsChange | undefined => {
  const before = new Map(old.map(chat => [chat.conversation, chat]))
  const after = new Set(now.map(chat => chat.conversation))
  const changed = now.filter(chat => !same(before.get(chat.conversation), chat))
  const gone = old.filter(chat => !after.has(chat.conversation)).map(chat => chat.conversation)
  return changed.length || gone.length ? { changed, gone } : undefined
}

const mergedChats = (old: ChatRow[], { changed, gone }: ChatsChange) => {
  const replaced = new Set([...gone, ...changed.map(chat => chat.conversation)])
  return [...old.filter(chat => !replaced.has(chat.conversation)), ...changed].toSorted(byBytes)
}

const changeOf = (old: PcReport, now: PcReport): PcChange | undefined => {
  const bars = barsChange(old.bars, now.bars)
  const chats = chatsChange(old.chats, now.chats)
  const change: PcChange = {
    ...(!same(old.totalBytes, now.totalBytes) && { totalBytes: now.totalBytes }),
    ...(!same(old.freeBytes, now.freeBytes) && { freeBytes: now.freeBytes }),
    ...(!same(old.cpu, now.cpu) && { cpu: now.cpu }),
    ...(!same(old.cores, now.cores) && { cores: now.cores }),
    ...(bars && { bars }),
    ...(chats && { chats }),
    ...(!same(old.sand, now.sand) && { sand: now.sand }),
    ...(!same(old.other, now.other) && { other: now.other }),
  }
  return Object.keys(change).length ? change : undefined
}

const applied = (report: PcReport, change: PcChange): PcReport => {
  const { bars, chats, ...simple } = change
  return { ...report, ...simple, bars: bars ? mergedBars(report.bars, bars) : report.bars, chats: chats ? mergedChats(report.chats, chats) : report.chats }
}

export { applied, changeOf }
