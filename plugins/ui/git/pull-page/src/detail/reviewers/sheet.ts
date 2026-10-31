import { pullRef } from '@sand/github/look'
import { place } from '@sand/layout/place'
import { errorMessage } from '@sand/util'
import { derive, div, effect, list, onTimeout, show, sig, untrack } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import type { Shown } from '../shown'

const searchDelay = 250

const candidateModel = (shown: Shown) => {
  const { ctx } = shown.parts
  const query = sig('')
  const found = sig<string[]>([])
  const failure = sig('')
  const loading = sig(true)
  let token = 0

  const load = (q: string) => {
    const mine = ++token
    loading.set(true)
    ctx.pullDetail
      .candidates({ ...pullRef(shown.model.ref), ...(q.trim() && { q: q.trim() }) })
      .then(names => {
        if (mine !== token) return
        failure.set('')
        found.set(names)
      })
      .catch(error => {
        if (mine === token) failure.set(errorMessage(error))
      })
      .finally(() => {
        if (mine === token) loading.set(false)
      })
  }

  effect(() => {
    const q = query.get()
    onTimeout(() => untrack(() => load(q)), q ? searchDelay : 0)
  })

  return { query, found, failure, loading }
}

export const reviewersSheet = (shown: Shown) => {
  const { kit, ctx } = shown.parts
  const chosen = sig<string[]>([])
  let unplace: Dispose | undefined
  const close = () => {
    void unplace?.()
    unplace = undefined
  }
  const toggle = (login: string) => chosen.update(list => (list.includes(login) ? list.filter(each => each !== login) : [...list, login]))
  const submit = async () => {
    await shown.actions.requestReview(chosen.get())
    close()
  }
  unplace = place(
    ctx,
    'overlay',
    () => {
      const model = candidateModel(shown)
      const shownNames = () => [...new Set([...chosen.get(), ...model.found.get()])]
      return kit.overlay(
        close,
        kit.sheet(
          { 'aria-label': 'Request reviewers', size: 'sm' },
          kit.sheetHead({ title: 'Request reviewers', close }),
          kit.sheetBody(
            {},
            kit.searchField({ placeholder: 'Find people', 'aria-label': 'Find people', bindValue: model.query }),
            show(model.failure.map(Boolean), () => kit.errorText(() => model.failure.get())),
            show(
              () => !model.loading.get() && !shownNames().length && !model.failure.get(),
              () => kit.emptyState({ text: 'Nobody found.', flush: true }),
            ),
            list(
              derive(shownNames),
              login => login,
              login =>
                kit.checkRow({ checked: () => chosen.get().includes(login.get()), onToggle: () => toggle(login.get()), title: () => login.get(), surface: 'raised' }),
              div({ class: 'flex flex-col' }),
            ),
          ),
          kit.sheetFoot(
            kit.quietButton({ surface: 'raised', onClick: close }, 'Cancel'),
            kit.primaryAction(
              { disabled: () => !chosen.get().length || shown.model.busy.get(), onClick: () => void submit() },
              () => (chosen.get().length > 1 ? `Request ${chosen.get().length} reviews` : 'Request review'),
            ),
          ),
        ),
      )
    },
    100,
  )
}
