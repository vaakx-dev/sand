import type { PcView } from '@sand/devices-contract'
import type { Pulse } from '@sand/reactive'
import { bytes } from '@sand/util'
import type { LocalFile, ProjectEntry, ProjectGroup } from '@sand/web-client/contract'
import { derive, div, dynamicChild, sig, type Derive, type Sig } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../../context'
import { cache } from '../cache'
import { join, short, split } from '../paths'
import type { Action, Step } from '../run'

type How = 'clone' | 'copy'

const hows: { value: How; label: string }[] = [
  { value: 'clone', label: 'Clone from git' },
  { value: 'copy', label: 'Copy the files' },
]

const verbs: Record<How, { label: string; busy: string }> = {
  clone: { label: 'Clone', busy: 'Cloning…' },
  copy: { label: 'Copy files', busy: 'Copying…' },
}

const localByDefault = (file: LocalFile) => /^\.env/.test(file.path.split('/').at(-1) ?? '')

const sourceOf = (ctx: ProjectsContext, group: ProjectGroup): ProjectEntry | undefined =>
  group.locations.filter(entry => !entry.missing && ctx.pcs.online(entry.device)).toSorted((a, b) => b.updated - a.updated)[0]

const bringForm = (ctx: ProjectsContext, changes: Pulse, pc: PcView, group: ProjectGroup) => {
  const place = ctx.projects.place(pc.id)
  const source = changes.read(() => sourceOf(ctx, group))
  const ignored = cache(key => {
    const [device = '', path = ''] = key.split('\n')
    return ctx.projects.ignoredFiles(path, device)
  })
  const files = derive(() => {
    const from = source.get()
    return from ? ignored(`${from.device}\n${from.path}`) : undefined
  })
  const picked = sig<ReadonlySet<string> | undefined>(undefined)
  const ticked = derive(() => {
    const loaded = files.get()
    return picked.get() ?? new Set(loaded?.state === 'done' ? loaded.value.files.filter(localByDefault).map(file => file.path) : [])
  })
  const listings = cache(dir => ctx.projects.browse(dir, pc.id))
  return {
    pc,
    group,
    place,
    source,
    files,
    ticked,
    toggle: (path: string) => {
      const next = new Set(ticked.get())
      if (!next.delete(path)) next.add(path)
      picked.set(next)
    },
    how: sig<How>(group.remote ? 'clone' : 'copy'),
    path: sig(join(short(place.root, place), group.name.replace(/[\\/]/g, '-'), place.sep)),
    listings,
  }
}

type BringForm = ReturnType<typeof bringForm>

const blocked = (form: BringForm): string | undefined => {
  const from = form.source.get()
  if (!from) return 'No PC with a copy of it is online.'
  const { sep } = form.place
  const { dir, leaf } = split(form.path.get().trim(), sep)
  if (dir === undefined || !leaf) return 'Type a full path for the new folder.'
  const listing = form.listings(dir)
  if (listing.state === 'failed') return `Couldn’t read ${dir} (${listing.error}).`
  if (listing.state === 'done' && !listing.value.exists) return `${dir} doesn’t exist.`
  if (listing.state === 'done' && listing.value.folders.includes(leaf)) return `${form.path.get().trim()} already exists. Pick a new folder.`
  return undefined
}

const actionOf = (ctx: ProjectsContext, form: BringForm): Action => {
  const how = form.how.get()
  const from = form.source.get()
  const verb = verbs[how]
  if (!from || blocked(form) || form.files.get()?.state === 'loading') return verb
  return {
    ...verb,
    run: async () => {
      const entry = await ctx.projects.bring({ project: form.group.id, from: from.device, to: form.pc.id, path: form.path.get().trim(), how, files: [...form.ticked.get()] })
      return { path: entry.path, device: entry.device }
    },
  }
}

const fileRows = (ctx: ProjectsContext, form: BringForm, files: LocalFile[], truncated: boolean) => {
  const { checkRow, metaLine, sectionHeading } = ctx.kit
  const count = () => `${form.ticked.get().size} of ${files.length}${truncated ? '+' : ''}`
  return div(
    { class: 'flex flex-col gap-1' },
    div({ class: 'flex items-baseline gap-2' }, div({ class: 'min-w-0 flex-1' }, sectionHeading('Local files to copy')), metaLine(count)),
    div(
      { class: 'flex flex-col' },
      files.map(file =>
        checkRow({
          surface: 'raised',
          touch: true,
          title: file.path,
          trail: bytes(file.size),
          checked: () => form.ticked.get().has(file.path),
          onToggle: () => form.toggle(file.path),
        }),
      ),
    ),
  )
}

const filesView = (ctx: ProjectsContext, form: BringForm) =>
  dynamicChild(form.files, loaded => {
    if (!loaded) return null
    if (loaded.state === 'loading') return ctx.kit.sheetText('Looking for local files git ignores…')
    if (loaded.state === 'failed') return ctx.kit.errorText(`Couldn’t list the local files (${loaded.error}).`)
    const { files, truncated } = loaded.value
    return files.length ? fileRows(ctx, form, files, truncated) : null
  })

const sourceLine = (ctx: ProjectsContext, source: Derive<ProjectEntry | undefined>) =>
  dynamicChild(source, from => (from ? ctx.kit.sheetText(`From ${ctx.pcs.name(from.device)}, ${short(from.path, ctx.projects.place(from.device))}`) : null))

const howChoice = (ctx: ProjectsContext, how: Sig<How>, remote: string | undefined) => (remote ? ctx.kit.segmented(hows, how, value => how.set(value), { label: 'How to bring it', fill: true }) : null)

export const bringStep = (ctx: ProjectsContext, changes: Pulse, pc: PcView, group: ProjectGroup): Step => {
  const { errorText, textInput } = ctx.kit
  const form = bringForm(ctx, changes, pc, group)
  const problem = derive(() => blocked(form))
  return {
    body: div(
      { class: 'flex flex-col gap-4' },
      sourceLine(ctx, form.source),
      howChoice(ctx, form.how, group.remote),
      div(
        { class: 'flex flex-col gap-2' },
        textInput({ bindValue: form.path, class: 'font-mono', 'aria-label': `New folder on ${pc.name}`, placeholder: 'Folder path', spellcheck: false, autocomplete: 'off' }),
        dynamicChild(problem, text => (text ? errorText(text) : null)),
      ),
      filesView(ctx, form),
    ),
    action: derive(() => actionOf(ctx, form)),
  }
}
