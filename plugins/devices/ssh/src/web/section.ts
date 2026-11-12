import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, form, preventThen, type Sig, sig, span } from '@vaakx-dev/vrui'
import type { SshConnectOptions, SshHost, SshLinkState, SshMachine, SshMachines, SshState } from '../contract'

interface Run {
  text: string
  failed: boolean
}

const stateWords: Record<SshLinkState, string> = {
  connected: 'Connected',
  connecting: 'Connecting…',
  'needs-you': 'Needs you',
  failed: 'Can’t connect',
}

const aborted = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error))

export const sshSection = (kit: Kit, ssh: SshMachines, state: Sig<SshState>) => {
  const { icon, quietButton, rowList, secondaryAction, settingsRow, settingsSection, spinner, statusLine, textInput } = kit
  const runs = sig<Record<string, Run>>({})
  const typed = sig('')

  const setRun = (key: string, run?: Run) =>
    runs.update(all => {
      const { [key]: _, ...rest } = all
      return run ? { ...rest, [key]: run } : rest
    })

  const start = async (key: string, task: (options: SshConnectOptions) => Promise<unknown>) => {
    setRun(key, { text: 'Starting…', failed: false })
    try {
      await task({ progress: text => setRun(key, { text, failed: false }) })
      setRun(key)
      return true
    } catch (error) {
      setRun(key, aborted(error) ? undefined : { text: messageOf(error), failed: true })
      return false
    }
  }

  const running = (key: string) => derive(() => runs.get()[key]?.failed === false)

  const alertLine = (text: string) => statusLine({ mark: span({ class: 'inline-flex text-danger-400' }, icon('alert', 'xs')), text, title: text })

  const runLine = (key: string, idle: () => HTMLElement | null) =>
    dynamicChild(
      derive(() => runs.get()[key]),
      run => {
        if (!run) return idle()
        if (run.failed) return alertLine(run.text)
        return statusLine({ mark: spinner('xs'), text: run.text, title: run.text })
      },
    )

  const machineLine = (machine: Sig<SshMachine>) =>
    dynamicChild(machine, ({ state, error }) => {
      const words = stateWords[state]
      if (state === 'connected' || state === 'connecting') return statusLine({ mark: null, text: words, title: words })
      if (state === 'needs-you') {
        const text = error ? `${words} � ${error}` : words
        return statusLine({ mark: kit.statusIcon('waiting'), text, title: text })
      }
      return alertLine(error ? `${words} · ${error}` : words)
    })

  const machineRow = (machine: Sig<SshMachine>) => {
    const { pc } = machine.get()
    const broken = derive(() => machine.get().state === 'failed' || machine.get().state === 'needs-you')
    return settingsRow(
      { title: () => machine.get().name, detail: div({}, machine.get().target, runLine(pc, () => machineLine(machine))) },
      dynamicChild(broken, shown =>
        shown ? quietButton({ size: 'sm', disabled: running(pc), onClick: () => void start(pc, options => ssh.reconnect(pc, options)) }, 'Reconnect') : null,
      ),
    )
  }

  const hostRow = (host: Sig<SshHost>) => {
    const { id, name, target } = host.get()
    return settingsRow(
      { title: name, detail: div({}, target, runLine(id, () => null)) },
      quietButton({ size: 'sm', disabled: running(id), onClick: () => void start(id, options => ssh.connect(id, options)) }, 'Connect'),
    )
  }

  const connectTyped = async () => {
    const host = typed.get().trim()
    if (host && (await start('typed', options => ssh.connect(host, options)))) typed.set('')
  }

  return settingsSection(
    { title: 'SSH' },
    rowList(
      derive(() => state.get().machines),
      machine => machine.pc,
      machineRow,
    ),
    rowList(
      derive(() => state.get().hosts),
      host => host.id,
      hostRow,
    ),
    form(
      { class: 'flex flex-col gap-2 py-3', onSubmit: preventThen(() => void connectTyped()) },
      div(
        { class: 'flex items-center gap-2' },
        textInput({ bindValue: typed, placeholder: 'user@host or alias', 'aria-label': 'SSH host', class: 'min-w-0 flex-1' }),
        secondaryAction({ size: 'sm', type: 'submit', disabled: derive(() => running('typed').get() || !typed.get().trim()) }, 'Connect'),
      ),
      runLine('typed', () => null),
    ),
  )
}
