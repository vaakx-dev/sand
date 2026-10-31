import { samePull } from '@sand/github/contract'
import type { InboxPull, InboxView } from '@sand/pull-inbox/contract'
import { errorMessage } from '@sand/util'
import { derive, effect, onTimeout, sig, untrack, type Derive } from '@vaakx-dev/vrui'
import type { QueryState } from '../address/state'
import { type PageContext, toastId } from '../inject'
import { reposFor, type RepoChoice } from '../projects/repos'

type Phase = 'loading' | 'ready' | 'failed'

const searchDelay = 300

export const listModel = (ctx: PageContext, query: QueryState, choices: Derive<RepoChoice[]>) => {
  const pulls = sig<InboxPull[]>([])
  const phase = sig<Phase>('loading')
  const failure = sig('')
  const cursor = sig<string | undefined>(undefined)
  const capped = sig(false)
  const more = sig(false)
  const searched = sig(query.q.get())
  const shown = sig<InboxView>(query.view.get())
  let token = 0
  let extended = false

  const request = derive(() => ({
    view: query.view.get(),
    state: query.state.get(),
    q: searched.get().trim() || undefined,
    repos: reposFor(choices.get(), query.project.get()),
  }))
  const signature = derive(() => JSON.stringify(request.get()))

  const load = (fresh = false, quiet = false) => {
    const mine = ++token
    if (!quiet) phase.set('loading')
    more.set(false)
    extended = false
    const input = untrack(() => request.get())
    ctx.inbox
      .page({ ...input, ...(fresh && { fresh }) })
      .then(page => {
        if (mine !== token) return
        shown.set(input.view)
        pulls.set(page.pulls)
        cursor.set(page.cursor)
        capped.set(Boolean(page.capped))
        phase.set('ready')
      })
      .catch(error => {
        if (mine !== token) return
        if (quiet) return ctx.report(error)
        failure.set(errorMessage(error))
        phase.set('failed')
      })
  }

  const loadMore = () => {
    const after = cursor.get()
    if (!after || more.get() || phase.get() !== 'ready') return
    const mine = token
    more.set(true)
    ctx.inbox
      .page({ ...untrack(() => request.get()), cursor: after })
      .then(page => {
        if (mine !== token) return
        const known = pulls.get()
        pulls.set([...known, ...page.pulls.filter(pull => !known.some(each => samePull(each, pull)))])
        cursor.set(page.cursor)
        extended = true
      })
      .catch(error => {
        if (mine === token) ctx.toasts.error(toastId, "Couldn't load more pull requests", error)
      })
      .finally(() => {
        if (mine === token) more.set(false)
      })
  }

  const patch = (row: InboxPull) => {
    if (pulls.get().some(pull => samePull(pull, row))) pulls.update(list => list.map(pull => (samePull(pull, row) ? row : pull)))
  }

  effect(() => {
    const text = query.q.get()
    onTimeout(() => searched.set(text), text ? searchDelay : 0)
  })
  effect(() => {
    signature.get()
    untrack(() => load())
  })

  return {
    pulls,
    phase,
    failure,
    cursor,
    capped,
    more,
    view: shown,
    load,
    loadMore,
    patch,
    refresh: () => load(true),
    quietReload: () => {
      if (!extended) load(false, true)
    },
  }
}

export type ListModel = ReturnType<typeof listModel>
