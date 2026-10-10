import type { Thread } from '../contract'

export const listKey = ({ info, device, running, started, unread, entries }: Thread) =>
  JSON.stringify([
    info.title,
    running ? 0 : info.updated,
    info.position,
    info.pinned,
    info.settled,
    info.snoozed,
    info.project,
    info.kind,
    info.parent,
    info.origin,
    info.named,
    info.messages,
    info.cwd,
    device,
    running,
    started,
    unread,
    entries.size > 0,
  ])
