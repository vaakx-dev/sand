import { errorMessage } from '@sand/util'
import type { InboxCount } from '../contract'
import type { NeedsList } from '../inbox/inbox'
import { needsYou } from '../reason/reason'
import { SignedOutError } from '../viewer'

const settleMs = 3_000

export interface CountDeps {
  needs(fresh: boolean): Promise<NeedsList>
  changed(count: InboxCount): void
  report(error: unknown): void
}

export type Count = ReturnType<typeof createCount>

const signedOut: InboxCount = { count: 0 }

export const createCount = (deps: CountDeps) => {
  let known: InboxCount | undefined
  let asked = false
  let fresh = false
  let timer: Timer | undefined
  let failure: string | undefined

  const set = (next: InboxCount) => {
    const moved = known !== undefined && (known.count !== next.count || known.viewer !== next.viewer)
    known = next
    if (moved) deps.changed(next)
    return next
  }

  const read = ({ viewer, pulls }: NeedsList) => set({ count: pulls.filter(pull => needsYou(pull.reason.group)).length, viewer })

  const load = (always: boolean) =>
    deps.needs(always).then(read, (error: unknown) => {
      if (error instanceof SignedOutError) return set(signedOut)
      throw error
    })

  const refresh = () => {
    const always = fresh
    fresh = false
    timer = undefined
    load(always).then(
      () => {
        failure = undefined
      },
      (error: unknown) => {
        const message = errorMessage(error)
        if (message !== failure) deps.report(error)
        failure = message
      },
    )
  }

  return {
    get() {
      asked = true
      return load(false)
    },
    read,
    soon(always = false) {
      if (!asked) return
      fresh ||= always
      timer ??= setTimeout(refresh, settleMs)
    },
    stop() {
      clearTimeout(timer)
      timer = undefined
    },
  }
}
