import { tildeHome } from '@sand/kit'
import type { NavItem } from './types'

const marks: Partial<Record<NavItem['state'], string>> = { running: 'Working', background: 'Background agents running', waiting: 'Needs you', draft: 'Draft' }

const agents = (count: number) => `${count} agent${count === 1 ? '' : 's'}`

const backgroundStatus = ({ jobs = 1, workflow }: NavItem) =>
  workflow?.total
    ? `Workflow running, ${workflow.done} of ${workflow.total} agents finished`
    : workflow
      ? 'Workflow running'
      : `${agents(jobs)} running in the background`

const runningStatus = ({ jobs }: NavItem) => (jobs ? `Working, with ${agents(jobs)} running` : 'Working')

export const navStatus = (item: NavItem) => {
  if (item.state === 'background') return backgroundStatus(item)
  if (item.state === 'running') return runningStatus(item)
  return marks[item.state] ?? (item.unread ? 'New since you last looked' : '')
}

export const navTip = (item: NavItem) =>
  [item.title, [item.path ? tildeHome(item.path) : item.project, navStatus(item)].filter(Boolean).join(' · ')].filter(Boolean).join('\n')
