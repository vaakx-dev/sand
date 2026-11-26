import { botName, botRoute, type BotFolder, type BotSummary } from '@sand/bots/contract'
import { isBack, settles, snoozeAction, snoozedUntil } from '@sand/threads-home/contract'
import type { MenuAction, MenuAsk, MenuChoice, ShellGroup, ShellRow } from '@sand/ui-shell/contract'
import { deleteAction } from './delete'
import type { Parts } from './parts'
import { botStatus, faceStateOf, statusLine, workingSince } from './work'

const EMPTY_FOLDER = 'Long-press a bot to move it here.'

const named = (text: string) => text.trim() || undefined

const newFolderAsk = (parts: Parts, then: (folder: BotFolder) => unknown = () => {}): MenuAsk => ({
  placeholder: 'Folder name',
  tip: 'Name the new folder',
  submit: 'Create',
  preview: text => named(text) && `New folder “${named(text)}”`,
  run: text => parts.toasts.attempt('Couldn’t create the folder', () => parts.store.folders.create(text.trim()).then(then)),
})

const moveTo = (parts: Parts, bot: BotSummary, folder: string | null) =>
  parts.toasts.attempt(`Couldn’t move ${botName(bot)}`, () => parts.store.move(bot.id, folder))

const moveChoices = (parts: Parts, bot: BotSummary): MenuChoice[] => [
  ...(parts.store.folders.list.get() ?? [])
    .filter(folder => folder.id !== bot.folderId)
    .map(folder => ({ id: folder.id, label: folder.name, run: () => moveTo(parts, bot, folder.id) })),
  ...(bot.folderId ? [{ id: 'none', label: 'No folder', run: () => moveTo(parts, bot, null) }] : []),
]

const moveAction = (parts: Parts, bot: BotSummary): MenuAction => ({
  id: 'move',
  label: 'Move to folder',
  icon: 'folder',
  choices: moveChoices(parts, bot),
  ask: newFolderAsk(parts, folder => moveTo(parts, bot, folder.id)),
  run: () => {},
})

const botMenu = (parts: Parts, bot: BotSummary): MenuAction[] => {
  const chat = parts.chat(bot.id)
  return [
    { id: 'profile', label: 'Profile', icon: 'sliders', run: () => parts.profile(bot.id) },
    moveAction(parts, bot),
    {
      id: 'pause',
      label: bot.paused ? 'Resume' : 'Pause',
      run: () => parts.toasts.attempt(`Couldn’t ${bot.paused ? 'resume' : 'pause'} ${botName(bot)}`, () => parts.store.update(bot.id, { paused: !bot.paused })),
    },
    ...(chat ? [snoozeAction(parts.ctx.threads, chat)] : []),
    deleteAction(parts, bot.id, botName(bot)),
  ]
}

const folderMenu = (parts: Parts, folder: BotFolder): MenuAction[] => [
  {
    id: 'rename',
    label: 'Rename',
    icon: 'pencil',
    ask: {
      placeholder: folder.name,
      tip: 'Rename the folder',
      submit: 'Rename',
      preview: text => named(text) && `Rename to “${named(text)}”`,
      run: text => parts.toasts.attempt('Couldn’t rename the folder', () => parts.store.folders.rename(folder.id, text.trim())),
    },
    run: () => {},
  },
  {
    id: 'delete',
    label: 'Delete folder',
    icon: 'trash',
    group: 'danger',
    danger: true,
    confirm: `Delete ${folder.name}? Its bots move to the top of Bots.`,
    run: () => parts.store.folders.remove(folder.id),
  },
]

const addMenu = (parts: Parts): MenuAction[] => [
  { id: 'bot', label: 'New bot', icon: 'plus', run: parts.create },
  { id: 'folder', label: 'New folder', icon: 'folder-plus', ask: newFolderAsk(parts), run: () => {} },
]

const rowOf = (parts: Parts, bot: BotSummary): ShellRow => {
  const at = workingSince(bot) ?? bot.last?.at
  const detail = statusLine(bot)
  const status = botStatus(bot)
  return {
    id: bot.id,
    label: botName(bot),
    to: { kind: botRoute, id: bot.id },
    menu: () => botMenu(parts, bot),
    lead: () => {
      const state = faceStateOf(bot)
      return parts.ctx.kit.botFace(bot.id, bot.color, 32, state ? { state } : {})
    },
    ...(status && { status }),
    ...(detail && { detail: () => detail }),
    ...(at !== undefined && { at }),
  }
}

interface Placed {
  bot: BotSummary
  row: ShellRow
  snoozed?: number
}

const placedOf = (parts: Parts, bot: BotSummary, now: number): Placed => {
  const chat = parts.chat(bot.id)
  const snoozed = chat && !botStatus(bot) ? snoozedUntil(chat) : undefined
  const woke = chat && isBack(chat) ? (chat.info.snoozed ?? 0) : 0
  const row = rowOf(parts, bot)
  const quiet = settles({ row, talked: Math.max(bot.talked, woke) }, parts.threadRows.get()?.settleDays(), now)
  return { bot, row: quiet ? { ...row, quiet } : row, ...(snoozed && { snoozed }) }
}

const rowsIn = (placed: Placed[], folder: string | null) => placed.filter(({ bot }) => bot.folderId === folder).map(({ row }) => row)

const folderGroup = (parts: Parts, folder: BotFolder, placed: Placed[]): ShellGroup => ({
  id: `folder:${folder.id}`,
  label: folder.name,
  fold: 'open',
  icon: open => (open ? 'folder-open' : 'folder'),
  menu: () => folderMenu(parts, folder),
  rows: rowsIn(placed, folder.id),
  empty: EMPTY_FOLDER,
})

export const botsGroups = (parts: Parts, now: number): ShellGroup[] => {
  const bots = parts.store.bots.get()
  const placed = (bots ?? []).map(bot => placedOf(parts, bot, now))
  const shown = placed.filter(entry => !entry.snoozed)
  const snoozed = placed.filter(entry => entry.snoozed).map(({ row }) => row)
  return [
    {
      id: 'bots',
      label: 'Bots',
      rows: rowsIn(shown, null),
      action: { label: 'New bot or folder', icon: 'plus', menu: () => addMenu(parts) },
      ...(bots && !bots.length && { empty: 'No bots yet.' }),
    },
    ...(parts.store.folders.list.get() ?? []).map(folder => folderGroup(parts, folder, shown)),
    ...(snoozed.length ? [{ id: 'snoozed', label: 'Snoozed', fold: 'closed' as const, rows: snoozed }] : []),
  ]
}
