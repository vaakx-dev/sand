import { sand, sandPalette } from '@sand/ui-theme/contract'
import type { Status } from '@sand/ui-shell/contract'
import { div, h2, mount, section, sig, span, theme, type Child } from '@vaakx-dev/vrui'
import { kit } from '../../src/kit'
import type { DiffLine } from '../../src/tools/lcs'

const block = (name: string, ...children: Child[]) =>
  section(
    { 'aria-label': name, class: 'flex flex-col gap-3' },
    h2({ class: 'text-xs font-medium text-neutral-500' }, name),
    ...children,
  )

const line = (...children: Child[]) => div({ class: 'flex flex-wrap items-center gap-2' }, ...children)

const tabs = () => {
  const open = sig('chat')
  const shown = sig(['cache', 'png'])
  const titles: Record<string, string> = { cache: 'Fix the flaky cache test', png: 'Speed up PNG encoding in the exporter' }
  return kit.tabStrip(
    'Atlas',
    kit.tab({ title: 'Chat', selected: () => open.get() === 'chat', onSelect: () => open.set('chat'), lead: kit.monogram('A', 'sky') }),
    kit.rowList(
      shown,
      id => id,
      item =>
        kit.tab({
          title: titles[item.get()]!,
          selected: () => open.get() === item.get(),
          onSelect: () => open.set(item.get()),
          lead: kit.stateIcon(item.get() === 'cache' ? 'ready' : 'running'),
          onClose: () => shown.set(shown.get().filter(other => other !== item.get())),
        }),
    ),
  )
}

const chipItem = (title: string, status: Status, detail?: string) =>
  kit.workRow({ surface: 'raised', onClick: () => {} }, kit.workRowBody({ title, detail, status, at: Date.now() - 180_000 }))

const chips = () =>
  line(
    kit.countChip({ label: 'Waiting', count: 1, lead: kit.stateIcon('waiting'), items: () => [chipItem('Add the refund webhook', 'waiting', 'partial refunds?')] }),
    kit.countChip({ label: 'Ready', count: 1, lead: kit.stateIcon('ready'), items: () => [chipItem('Fix the flaky cache test', 'ready')] }),
    kit.countChip({ label: 'Working', count: 1, lead: kit.stateIcon('running'), items: () => [chipItem('Speed up PNG encoding', 'running')] }),
  )

const choices = () => {
  const project = sig<string | undefined>('sand')
  const name = sig('')
  return kit.choiceList(
    [
      { value: 'sand', label: 'sand' },
      { value: 'new', label: 'New project', input: { value: name, placeholder: 'Project name' } },
      { value: 'none', label: 'No project' },
    ],
    project,
    value => project.set(value),
    'Project',
  )
}

const diff: DiffLine[] = [
  { kind: 'gap', text: '@@ -12,6 +12,7 @@' },
  { kind: 'ctx', text: 'export const cache = new Map()', old: 12, new: 12 },
  { kind: 'del', text: 'const ttl = 1000', old: 13 },
  { kind: 'add', text: 'const ttl = Number(process.env.TTL ?? 1000)', new: 13 },
  { kind: 'add', text: 'const clock = () => performance.now()', new: 14 },
  { kind: 'ctx', text: 'export const read = (key: string) => cache.get(key)', old: 14, new: 15 },
]

const sheetSample = () =>
  kit.sheet(
    { size: 'md', 'aria-label': 'Atlas' },
    div({ class: 'flex h-12 shrink-0 items-center gap-2 pr-2 pl-2' }, kit.backButton({ surface: 'raised' }), kit.sheetTitle('Atlas'), kit.closeButton({ surface: 'raised' })),
    kit.sheetBody(
      {},
      kit.sheetText('Keeps the exporter fast and its tests green.'),
      kit.checkRow({ title: 'Notify me', meta: 'When a thread needs you', checked: sig(true), onToggle: () => {} }),
    ),
    kit.sheetFoot(kit.secondaryAction({}, 'Pause'), kit.primaryAction({}, 'Save')),
  )

const settings = () => {
  const on = sig(true)
  return kit.settingsSection(
    { title: 'Notifications', note: 'When sand tells you that work needs you.' },
    kit.settingsRow({ title: 'Ask before merging', detail: 'Each bot asks first' }, kit.toggleSwitch({ on, onClick: () => on.set(!on.get()), 'aria-label': 'Ask before merging' })),
    kit.settingsRow({ title: 'Sound' }, kit.segmented([{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }], 'on', () => {}, { label: 'Sound' })),
    kit.settingsRow({ title: 'Project', detail: 'Where the new thread starts' }, kit.pickerButton({ 'aria-label': 'Project', lead: kit.projectIcon('harbor') }, 'harbor')),
    kit.settingsRow({ title: 'Quiet hours', detail: 'From 22:00 to 7:00', onOpen: () => {} }),
    kit.emptyState({ text: 'No devices muted.' }),
  )
}

const roles = () =>
  div(
    { class: 'flex flex-col gap-2' },
    kit.pageTitle('Page title'),
    div({ class: 'flex' }, kit.barTitle('Bar title')),
    div({ class: 'flex' }, kit.titleButton({}, 'Title with a menu')),
    kit.sectionTitle('Section title'),
    kit.sectionHeading('Group label'),
    kit.secondaryText('Secondary text for descriptions and captions.'),
    line(kit.metaLine('Meta line, 3m ago'), kit.countMark(12)),
    line(kit.projectIcon('harbor', {}, 14), kit.metaLine('harbor'), kit.monoMeta('tide-retry', ' ', kit.badge('success', '#214')), kit.monoMeta(kit.badge('merged', '#209')), kit.shortcutHint('mod+k')),
    kit.textRule('Using script'),
  )

const pageSections = () =>
  div(
    { class: 'flex flex-col gap-8' },
    kit.pageSection(
      { title: 'Accounts', action: kit.secondaryAction({ size: 'sm' }, 'Add') },
      kit.listRow({ surface: 'group', title: 'Claude', meta: 'Signed in', onClick: () => {} }),
      kit.listRow({ surface: 'group', title: 'OpenAI', meta: 'Needs sign-in', actions: kit.confirmButton({ action: { id: 'remove', label: 'Remove', danger: true, confirm: 'Remove OpenAI?', run: () => {} } }), onClick: () => {} }),
    ),
    settings(),
  )

const menuSample = () => {
  const menu = kit.contextMenu()
  const spec = () => ({
    title: 'Fix the flaky cache test',
    actions: [
      { id: 'copy', label: 'Copy link', icon: 'copy', run: () => {} },
      { id: 'delete', label: 'Delete', icon: 'trash', group: 'danger', danger: true, confirm: 'Delete this thread?', run: () => {} },
    ],
  })
  return kit.settingsRow({ ...menu.target(spec), title: 'Fix the flaky cache test' }, menu.button(spec), menu.view())
}

const gallery = () =>
  kit.pageBody(
    { intro: 'Every piece the screens draw with, on the approved roles.' },
    block('Type roles', roles()),
    block(
      'Buttons',
      line(kit.primaryAction({}, 'Save'), kit.secondaryAction({}, 'Cancel'), kit.quietButton({}, 'Quiet'), kit.primaryAction({ size: 'sm' }, 'Small')),
      line(kit.iconButton({ 'aria-label': 'Search', title: 'Search' }, kit.icon('search')), kit.closeButton({}), kit.linkButton({}, '3 files'), kit.navButton({ active: true }, kit.icon('clock'), 'Automations')),
    ),
    block('Tab strip', tabs()),
    block(
      'Monograms',
      line(...(['gold', 'sky', 'orange', 'green', 'red', 'grey'] as const).map(tint => kit.monogram(tint[0]!.toUpperCase(), tint)), kit.monogram('A', 'sky', 20)),
    ),
    block(
      'State icons',
      line(...(['running', 'waiting', 'ready', 'merged', 'settled', 'idle'] as const).map(state => span({ class: 'flex items-center gap-1 text-xs text-neutral-400' }, kit.stateIcon(state), state))),
    ),
    block('Count chips', chips()),
    block(
      'Work row',
      kit.workRow(
        { current: true },
        kit.workRowBody({
          title: 'Add retry with backoff to the tide table fetcher',
          end: kit.workStatus('ready'),
          place: { label: 'harbor', mark: kit.projectIcon('harbor', {}, 14) },
          trail: [kit.monoMeta('sand/tide-table-retry-with-backoff'), kit.badge('success', '#214')],
        }),
      ),
    ),
    block('Group heading', kit.groupHeading('Bots', { icon: 'plus', label: 'New bot', onClick: () => {} })),
    block(
      'Rows',
      kit.listRow({ title: 'Fix the flaky cache test', meta: 'tests pass, ready to merge', lead: kit.stateIcon('ready', 'sm', true), trail: '12m' }),
      kit.listRow({ title: 'How HTTP caching headers work', trail: 'Tue', current: true }),
      kit.checkRow({ title: 'Run on a schedule', meta: 'Every weekday at 9:00', checked: sig(false), onToggle: () => {} }),
    ),
    block('Choice list', choices()),
    block('Segmented', kit.segmented([{ value: 'chat', label: 'Chat' }, { value: 'project', label: 'Project' }], 'chat', () => {}, { label: 'View' })),
    block('Fields', kit.field({ label: 'Name', hint: 'Shown in the sidebar' }, kit.textInput({ placeholder: 'Optional' })), line(kit.searchField({ placeholder: 'Search bots and chats' }))),
    block(
      'Action item',
      kit.actionItem(
        {
          title: 'Fix the flaky cache test',
          lead: kit.roundMark('success', kit.icon('check', 'sm')),
          at: Date.now() - 720_000,
          actions: [kit.primaryAction({}, 'Merge'), kit.quietButton({}, 'Review')],
        },
        span({}, 'Done. ', kit.emphasis('4 files'), ', +38 −12.'),
      ),
    ),
    block('Diff block', kit.diffBlock('src/cache/store.ts', diff)),
    block('Sheet', sheetSample()),
    block('Page sections', pageSections()),
    block(
      'Notes',
      kit.banner({ tone: 'warning', title: 'This PC is offline.', detail: 'Messages wait until it’s back.', actions: [kit.secondaryAction({ size: 'sm' }, 'Retry now')] }),
      kit.banner({ icon: 'spinner', title: 'Waiting for a PC', dismiss: () => {} }),
      kit.codeBlock({ copy: () => 'bun run check' }, 'bun run check'),
      line(kit.badge('success', 'Merged'), kit.statusBadge('failed'), kit.keycap('⌘K'), kit.lineStat(12, 3)),
    ),
    block('Menus', menuSample()),
    block(
      'Tool steps',
      kit.toolCard({ icon: kit.icon('search', 'sm'), verb: 'Read', target: 'src/cache/store.ts' }),
      kit.toolCard({ icon: kit.icon('x', 'sm'), verb: 'Ran', target: 'bun test cache', failed: true }),
      line(...(['added', 'modified', 'deleted', 'renamed'] as const).map(kind => kit.fileKindMark(kind)), kit.progressSteps(4, 2), kit.spinner()),
    ),
    block('Empty', kit.emptyState({ text: 'No devices muted.', action: { label: 'Open devices', run: () => {} } })),
    block('Empty page', kit.emptyPage({ title: 'Nothing here yet', text: 'Finished work shows up here.' })),
  )

mount(
  document.body,
  { theme: theme(sandPalette), mode: sand.mode, class: sand.page },
  div({ class: 'flex h-screen flex-col' }, div({ class: 'flex h-12 shrink-0 items-center px-4' }, kit.barTitle('Kit')), gallery()),
)
