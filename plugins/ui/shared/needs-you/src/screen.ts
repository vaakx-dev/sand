import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { div, dynamicChild, list, show, sig, type Derive } from '@vaakx-dev/vrui'
import type { Need, NeedAction, NeedKind } from './contract'

type State = 'unknown' | 'some' | 'none'

interface Group {
  kind: NeedKind
  label: string
}

const groups: Group[] = [
  { kind: 'permission', label: 'Allow' },
  { kind: 'secret', label: 'Sign-ins' },
  { kind: 'conflict', label: 'Merge' },
  { kind: 'review', label: 'Review' },
]

const actions = (kit: Kit, need: Need) => {
  const busy = sig(false)
  const failure = sig('')
  const run = async (action: NeedAction) => {
    busy.set(true)
    failure.set('')
    try {
      await action.run()
    } catch (error) {
      failure.set(errorMessage(error))
    } finally {
      busy.set(false)
    }
  }
  const buttons = need.actions.map((action, index) => kit.quietButton({ size: 'sm', strong: index === 0, disabled: busy, onClick: () => void run(action) }, action.label))
  return { buttons, failure: dynamicChild(failure, text => (text ? kit.errorText(text) : null)) }
}

const item = (kit: Kit, need: Need) => {
  const { buttons, failure } = actions(kit, need)
  return kit.actionItem({ title: need.head?.() ?? need.who, lead: need.mark(), at: need.at, actions: buttons }, need.text?.() ?? need.title, failure)
}

const group = (kit: Kit, items: Derive<Need[]>, { kind, label }: Group) => {
  const shown = items.map(all => all.filter(need => need.kind === kind))
  return show(
    () => shown.get().length > 0,
    () => div({ class: 'flex min-w-0 flex-col' }, kit.sectionHeading(label), list(shown, need => need.id, need => item(kit, need.get()), div({ class: 'flex min-w-0 flex-col' }))),
  )
}

const empty = (kit: Kit) => kit.emptyPage({ title: 'Nothing needs you', text: 'Sign-ins, clashes and finished work show up here.' })

const stateOf = (all: Need[] | undefined): State => {
  if (!all) return 'unknown'
  return all.length ? 'some' : 'none'
}

const content = (kit: Kit, items: Derive<Need[] | undefined>, state: State) => {
  switch (state) {
    case 'unknown':
      return null
    case 'some': {
      const known = items.map(all => all ?? [])
      return div({ class: 'flex min-w-0 flex-col' }, ...groups.map(found => group(kit, known, found)))
    }
    case 'none':
      return empty(kit)
  }
}

export const needsScreen = (kit: Kit, items: Derive<Need[] | undefined>) => kit.pageBody({}, dynamicChild(items.map(stateOf), state => content(kit, items, state)))
