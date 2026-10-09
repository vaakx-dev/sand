import { delayed, derive, div, dynamicChild, settingsRow, settingsSection, show, spinner } from '@sand/dom'
import { usageModel, type UsageDeps, type UsageModel } from '../model'
import { limitsView } from './limits'
import { spendView } from './spend'
import { toolbar } from './toolbar'

const note = (text: string) => settingsSection({}, settingsRow(text))

const pending = (failure: string) =>
  failure ? note(failure) : div({ class: 'flex h-24 items-center justify-center text-neutral-500' }, show(delayed(true), () => spinner(16)))

const body = (model: UsageModel, openThread?: (id: string) => void) =>
  dynamicChild(
    derive(() => ({ view: model.view.get(), summary: model.loader.summary.get(), failure: model.loader.failure.get() })),
    ({ view, summary, failure }) => {
      if (!summary) return pending(failure)
      const content =
        view === 'limits'
          ? dynamicChild(model.providers, providers => limitsView(providers, model.now))
          : !summary.total.turns
            ? note('No usage in this range')
            : spendView(summary, view, model.breakdown, openThread)
      return failure ? div({ class: 'flex flex-col gap-4' }, note(failure), content) : content
    },
  )

export const usagePage = (deps: UsageDeps) => {
  const model = usageModel(deps)
  return div(
    { class: 'flex w-full flex-col gap-8' },
    toolbar({ view: model.view, range: model.range, busy: model.busy, caption: model.caption, refresh: model.refresh }),
    div(
      { class: ['transition', () => (model.loader.busy.get() && model.loader.summary.get() ? 'opacity-75' : '')] },
      body(model, deps.openThread),
    ),
  )
}
