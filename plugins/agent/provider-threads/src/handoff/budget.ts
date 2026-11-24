import type { Block } from '@sand/chats/contract'

export const handoffCap = { min: 1_024, max: 64_000, default: 16_000 }

const attachmentCost: Partial<Record<Block['type'], number>> = { image: 8_192, document: 4_096, file: 4_096 }

const bytes = (text: string) => Buffer.byteLength(text)

export interface Room {
  cap: number
  window?: number
  native: number
  current: number
}

const reserveOf = (window: number) => Math.max(16_000, Math.ceil(window / 4))

const spareOf = ({ window, native, current }: Room) => (window === undefined ? Infinity : window - native - current - reserveOf(window))

export const currentOf = (content: Block[]) => {
  const text = content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('\n')
  return bytes(JSON.stringify(text)) + content.reduce((sum, block) => sum + (attachmentCost[block.type] ?? 0), 0)
}

export const nativeOf = (system: string, tools: unknown) => bytes(system) + bytes(JSON.stringify(tools))

export const budgetOf = (room: Room) => Math.max(0, Math.min(room.cap, spareOf(room)))

export const fits = (room: Room) => budgetOf(room) <= spareOf(room)
