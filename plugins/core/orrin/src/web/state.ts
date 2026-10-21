import type { ConnectionAction, ConnectionState } from '@sand/connections/contract'
import type { Tone } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import type { OrrinSetup, OrrinStep } from '../contract'

export interface SetupActions {
  install(): void
  start(): void
  restart(): void
  manage(): void
}

const stepText: Record<OrrinStep, string> = {
  downloading: 'Downloading',
  verifying: 'Checking the download',
  unpacking: 'Unpacking',
  stopping: 'Stopping Orrin',
  starting: 'Starting Orrin',
}

const placeText = ({ running, installed }: OrrinSetup) => {
  if (running) return [`Running ${running.version} on port ${running.port}`, plural(running.projects, 'project')]
  if (installed) return [`${installed.version} installed, not running`]
  return ['Not installed']
}

const newsText = (setup: OrrinSetup) => {
  if (setup.restartNeeded) return `restart to use ${setup.installed?.version}`
  if (setup.updateAvailable || (!setup.installed && setup.latest)) return `${setup.latest} available`
}

const statusText = (setup: OrrinSetup) => {
  const { task } = setup
  if (task) return `${stepText[task.step]}${task.percent === undefined ? '' : ` ${task.percent}%`}…`
  return [...placeText(setup), newsText(setup)].filter(Boolean).join(' · ')
}

const toneOf = ({ running, installed, restartNeeded }: OrrinSetup): Tone => {
  if (running) return restartNeeded ? 'warning' : 'success'
  return installed ? 'warning' : 'neutral'
}

const actionsFor = (setup: OrrinSetup, actions: SetupActions): ConnectionAction[] => {
  const { installed, running, latest } = setup
  return [
    !installed && latest ? { label: 'Install', primary: true, run: actions.install } : undefined,
    setup.updateAvailable ? { label: 'Update', primary: true, run: actions.install } : undefined,
    installed && !running ? { label: 'Start', primary: !setup.updateAvailable, run: actions.start } : undefined,
    setup.restartNeeded ? { label: 'Restart Orrin', primary: true, run: actions.restart } : undefined,
    running ? { label: 'Manage', run: actions.manage } : undefined,
  ].filter(action => action !== undefined)
}

export const connectionState = (setup: OrrinSetup | undefined, actions: SetupActions): ConnectionState => {
  if (!setup) return { tone: 'neutral', status: 'Checking…', busy: true, actions: [] }
  return {
    tone: toneOf(setup),
    status: statusText(setup),
    busy: !!setup.task,
    ...(setup.error && { error: setup.error }),
    actions: actionsFor(setup, actions),
  }
}
