export interface LinkStatus {
  online: boolean
  checked: boolean
  refused: boolean
  lastSeen?: number
  url?: string
  error?: string
}

const same = (a: LinkStatus | undefined, b: LinkStatus) =>
  !!a && a.online === b.online && a.refused === b.refused && a.url === b.url && a.error === b.error

export const createStatus = (changed: () => void) => {
  const states = new Map<string, LinkStatus>()
  const set = (id: string, next: LinkStatus) => {
    const before = states.get(id)
    states.set(id, next)
    if (!same(before, next)) changed()
  }
  return {
    get: (id: string) => states.get(id),
    refused: (id: string) => states.get(id)?.refused === true,
    reached: (id: string, url: string) => set(id, { online: true, checked: true, refused: false, lastSeen: Date.now(), url }),
    refuse: (id: string, error: string) => set(id, { ...states.get(id), online: true, checked: true, refused: true, lastSeen: Date.now(), error }),
    lost: (id: string, error: string) => set(id, { ...states.get(id), online: false, checked: true, refused: states.get(id)?.refused ?? false, error }),
    accepted: (id: string) => {
      const before = states.get(id)
      if (before?.refused) set(id, { ...before, refused: false, error: undefined })
    },
    forget: (id: string) => void states.delete(id),
  }
}

export type Status = ReturnType<typeof createStatus>
