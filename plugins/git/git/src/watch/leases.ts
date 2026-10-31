const leaseMs = 3 * 60_000

interface Lease {
  timer?: Timer
  root?: string
}

export interface LeaseDeps {
  holding(cwd: string): boolean
  detach(cwd: string, root: string): void
}

export const createLeases = ({ holding, detach }: LeaseDeps) => {
  const leases = new Map<string, Lease>()

  const release = (cwd: string) => {
    const lease = leases.get(cwd)
    if (!lease) return
    clearTimeout(lease.timer)
    if (holding(cwd)) {
      leases.set(cwd, lease.root ? { root: lease.root } : {})
      return
    }
    leases.delete(cwd)
    if (lease.root) detach(cwd, lease.root)
  }

  const place = (cwd: string, root: string | undefined, timer: Timer | undefined) => {
    const held = leases.get(cwd)
    if (held?.root && held.root !== root) detach(cwd, held.root)
    leases.set(cwd, { ...(timer ? { timer } : {}), ...(root ? { root } : {}) })
    return held?.root === root
  }

  return {
    renew(cwd: string, root: string | undefined) {
      clearTimeout(leases.get(cwd)?.timer)
      return place(cwd, root, setTimeout(() => release(cwd), leaseMs))
    },
    keep(cwd: string, root: string) {
      place(cwd, root, leases.get(cwd)?.timer)
    },
    releaseUntimed(cwd: string) {
      if (!leases.get(cwd)?.timer) release(cwd)
    },
    clear() {
      for (const lease of leases.values()) clearTimeout(lease.timer)
      leases.clear()
    },
  }
}
