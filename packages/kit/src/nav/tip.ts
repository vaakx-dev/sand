import type { NavItem } from '@sand/protocol'
import { tildeHome } from '../text/paths'
import { plurals } from '../text/plural'

const marks: Partial<Record<NavItem['state'], string>> = { running: 'Working', background: 'Background agents running', waiting: 'Needs you', draft: 'Draft' }

export const navJobs = ({ agents = 0, shells = 0 }: NavItem) => plurals({ agent: agents, shell: shells })

const backgroundStatus = (item: NavItem) => {
  const { workflow } = item
  if (!workflow) return `${navJobs(item)} running in the background`
  return workflow.total ? `Workflow running, ${workflow.done} of ${workflow.total} agents finished` : 'Workflow running'
}

const runningStatus = (item: NavItem) => {
  const jobs = navJobs(item)
  return jobs ? `Working, with ${jobs} running` : 'Working'
}

export const navStatus = (item: NavItem) => {
  if (item.state === 'background') return backgroundStatus(item)
  if (item.state === 'running') return runningStatus(item)
  return marks[item.state] ?? (item.unread ? 'New since you last looked' : '')
}

export const navTip = (item: NavItem) =>
  [item.title, [item.path ? tildeHome(item.path) : item.project, navStatus(item)].filter(Boolean).join(' · ')].filter(Boolean).join('\n')
