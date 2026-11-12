import { botName, type BotSummary } from '@sand/bots/contract'
import { derive, div, dynamicChild, show, type Derive, type Sig } from '@vaakx-dev/vrui'
import type { Login } from '../../contract'
import { task } from '../task'
import type { LoginPatch, PageParts } from './model'
import { rowProblem } from './parts'

const toggled = (list: string[], id: string) => (list.includes(id) ? list.filter(other => other !== id) : [...list, id])

const botRows = ({ kit, bots }: PageParts, login: Derive<Login>, change: (patch: LoginPatch) => void) => {
  const roster = bots()
  if (!roster) return kit.settingsRow({ title: 'Bots are off', detail: 'Turn on Bots in Settings → Features to choose which bots can use this login.' })
  const listed = derive(() => roster.list())
  const botRow = (bot: Sig<BotSummary>) =>
    kit.checkRow({
      title: () => botName(bot.get()),
      checked: () => login.get().bots.includes(bot.get().id),
      onToggle: () => change({ bots: toggled(login.get().bots, bot.get().id) }),
    })
  return dynamicChild(
    derive(() => listed.get().length > 0),
    some => (some ? kit.rowList(listed, bot => bot.id, botRow) : kit.emptyState({ flush: true, text: 'No bots yet. Make one in the Bots space, then choose it here.' })),
  )
}

const threadRows = ({ kit, threads }: PageParts, login: Derive<Login>, change: (patch: LoginPatch) => void) => {
  const { quietButton, rowList, settingsRow, settingsSection } = kit
  const given = derive(() => login.get().threads)
  const threadRow = (thread: Sig<string>) =>
    settingsRow(
      { title: () => threads()?.get(thread.get())?.info.title || 'Untitled thread' },
      quietButton(
        { size: 'sm', onClick: () => change({ threads: login.get().threads.filter(other => other !== thread.get()) }) },
        'Remove',
      ),
    )
  return show(
    () => given.get().length > 0,
    () => settingsSection({ title: 'Threads it was given to' }, rowList(given, thread => thread, threadRow)),
  )
}

export const accessSections = (parts: PageParts, login: Derive<Login>) => {
  const { settingsRow, settingsSection, toggleSwitch } = parts.kit
  const work = task()
  const change = (patch: LoginPatch) => void work.run(() => parts.model.change(login.get().id, patch))
  return div(
    { class: 'contents' },
    settingsSection(
      { title: 'Bots that can use it' },
      settingsRow(
        { title: 'Ask me every time', detail: 'Agents can’t use it, not even the bots below; they tell you when they need it.' },
        toggleSwitch({ on: () => login.get().ask, 'aria-label': 'Ask me every time', disabled: work.busy, onClick: () => change({ ask: !login.get().ask }) }),
      ),
      botRows(parts, login, change),
      rowProblem(parts.kit, work),
    ),
    threadRows(parts, login, change),
  )
}
