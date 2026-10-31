import { type PullRef, samePull } from '@sand/github/contract'
import type { ReviewFiles, ViewedState } from '@sand/pull-review/contract'
import { errorMessage } from '@sand/util'
import { effect, onTimeout, sig, untrack } from '@vaakx-dev/vrui'
import { type ReviewContext, toastId } from '../inject'

export type FilesState = { kind: 'loading' } | { kind: 'ready'; files: ReviewFiles } | { kind: 'error'; message: string }

const settleFor = 250

const withViewed = (files: ReviewFiles, path: string, viewed: ViewedState): ReviewFiles => {
  const next = files.files.map(file => (file.path === path ? { ...file, viewed } : file))
  return { ...files, files: next, viewed: next.filter(file => file.viewed === 'viewed').length }
}

export const filesModel = (ctx: ReviewContext, ref: PullRef) => {
  const commit = sig<string | undefined>(undefined)
  const state = sig<FilesState>({ kind: 'loading' })
  let ticket = 0
  let waiting: (() => void) | undefined

  const load = () => {
    const mine = ++ticket
    const chosen = commit.get()
    ctx.review
      .files({ ...ref, ...(chosen ? { commit: chosen } : {}) })
      .then(found => {
        if (mine === ticket) state.set({ kind: 'ready', files: found })
      })
      .catch(error => {
        if (mine === ticket && state.get().kind !== 'ready') state.set({ kind: 'error', message: errorMessage(error) })
      })
  }

  const soon = () => {
    waiting?.()
    waiting = onTimeout(load, settleFor)
  }

  const markViewed = async (path: string, viewed: boolean) => {
    const now = state.get()
    if (now.kind !== 'ready') return
    ticket++
    state.set({ kind: 'ready', files: withViewed(now.files, path, viewed ? 'viewed' : 'unviewed') })
    try {
      await ctx.review.viewed({ ...ref, path, viewed })
    } catch (error) {
      ctx.toasts.error(toastId, viewed ? "Couldn't mark the file viewed" : "Couldn't clear the viewed mark", error)
      load()
    }
  }

  effect(() => {
    commit.get()
    untrack(() => {
      state.set({ kind: 'loading' })
      load()
    })
  })
  effect(() =>
    ctx.pullDetail.onChange(changed => {
      if (samePull(changed, ref)) soon()
    }),
  )
  effect(() => () => waiting?.())

  return { commit, state, retry: load, markViewed }
}

export type FilesModel = ReturnType<typeof filesModel>
