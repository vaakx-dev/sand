import type { ProjectGroup } from '@sand/web-client/contract'
import { derive, div, dynamicChild, type Derive } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../../context'
import { keepNew, type FolderForm } from './form'
import type { Matches, Plan } from './plan'

const choicesOf = (groups: ProjectGroup[]) => {
  const [only] = groups
  if (only && groups.length === 1) return { heading: `Same git remote as ${only.name}`, copies: [{ value: only.id, label: 'Add as a copy of it' }] }
  return { heading: `Same git remote as ${groups.length} projects`, copies: groups.map(group => ({ value: group.id, label: `Add as a copy of ${group.name}` })) }
}

const matchList = (ctx: ProjectsContext, form: FolderForm, matches: Derive<Matches | undefined>, { target, groups }: Matches) => {
  const { choiceList, sectionHeading } = ctx.kit
  const { heading, copies } = choicesOf(groups)
  const choices = [...copies, { value: keepNew, label: 'Keep it as its own project' }]
  return div(
    { class: 'flex flex-col gap-1' },
    sectionHeading(heading),
    choiceList(choices, () => matches.get()?.chosen, project => form.match.set({ target, project }), heading),
  )
}

export const matchChoice = (ctx: ProjectsContext, form: FolderForm, plan: Derive<Plan>) => {
  const matches = derive(() => plan.get().matches)
  return dynamicChild(
    derive(() => matches.get()?.target),
    () => {
      const shown = matches.get()
      return shown ? matchList(ctx, form, matches, shown) : null
    },
  )
}
