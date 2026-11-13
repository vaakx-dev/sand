import type { Thread } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import type { WaitLine, WaitLines } from './contract'

export interface ShownWait {
  key: string
  render(): HTMLElement
}

export const createWaitLines = (): WaitLines => {
  const lines = sig<WaitLine[]>([])
  return {
    add(line) {
      lines.update(all => [...all, line])
      return () => lines.update(all => all.filter(other => other !== line))
    },
    of: kind => lines.get().find(line => line.kind === kind),
  }
}

export const shownWait = (lines: WaitLines | undefined, { id, device, waiting }: Thread): ShownWait | undefined => {
  const line = waiting && lines?.of(waiting.kind)
  if (!line || !waiting) return undefined
  return { key: waiting.call, render: () => line.render({ thread: id, device, reason: waiting }) }
}
