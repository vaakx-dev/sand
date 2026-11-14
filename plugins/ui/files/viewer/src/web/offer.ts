import type { wire } from '@sand/devices-contract'
import { type Addon, addonsInstall, featuresList, featuresSet } from '@sand/features/contract'
import type { Kit, kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { a, div, dynamicChild, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { extensionOf, type FormatAddon, formatAddons, type OpenFile } from '../contract'

type Ctx = Context<{ wire: typeof wire; kit: typeof kit }>

type Step = { kind: 'idle' } | { kind: 'working' } | { kind: 'failed'; error: string }

const DOWNLOAD = { timeout: 10 * 60_000 }

const addonFor = (file: OpenFile) => Object.entries(formatAddons).find(([, addon]) => addon.extensions.includes(extensionOf(file.name)))

const verb = (addon: Addon | undefined) => (addon?.status === 'available' ? 'Get' : 'Turn on')

const download = (kit: Kit, file: OpenFile) => kit.secondaryAction({ size: 'sm', onClick: () => void saveAs(file) }, 'Download')

const saveAs = async (file: OpenFile) => {
  const href = URL.createObjectURL(await file.blob())
  a({ href, download: file.name }).click()
  URL.revokeObjectURL(href)
}

const frame = (kit: Kit, title: string, text: string, ...actions: (Node | null)[]) =>
  div(
    { class: 'flex flex-col items-center gap-4 px-6 pb-16' },
    kit.emptyPage({ title, text }),
    ...actions,
  )

const stepNote = (kit: Kit, step: Step) => {
  if (step.kind === 'failed') return kit.errorText(step.error)
  if (step.kind === 'working') return kit.spinner()
  return null
}

const offerCard = (ctx: Ctx, file: OpenFile, [id, format]: [string, FormatAddon]) => {
  const { kit } = ctx
  const step = sig<Step>({ kind: 'idle' })
  const addon = sig<Addon | undefined>(undefined)
  void ctx.wire.call(featuresList, {}).then(choice => addon.set(choice.addons.find(found => found.id === id)), () => undefined)
  const get = async () => {
    step.set({ kind: 'working' })
    const work = addon.get()?.status === 'available' ? ctx.wire.call(addonsInstall, { ids: [id] }, undefined, DOWNLOAD) : ctx.wire.call(featuresSet, { changes: { [id]: true } })
    await work.then(
      () => step.set({ kind: 'idle' }),
      (error: unknown) => step.set({ kind: 'failed', error: errorMessage(error) }),
    )
  }
  return frame(
    kit,
    `${format.files} need the ${format.label} add-on`,
    `Turn it on to read ${file.name} here.`,
    div(
      { class: 'flex flex-wrap justify-center gap-2' },
      kit.primaryAction({ size: 'sm', disabled: () => step.get().kind === 'working', onClick: () => void get() }, () => `${verb(addon.get())} ${format.label}`),
      download(kit, file),
    ),
    dynamicChild(step, value => stepNote(kit, value)),
  )
}

const unshown = (ctx: Ctx, file: OpenFile) => {
  const addon = addonFor(file)
  if (addon) return offerCard(ctx, file, addon)
  return frame(ctx.kit, "sand can't show this file", `${file.name} isn't a kind of file the viewer reads.`, download(ctx.kit, file))
}

export { saveAs, unshown, type Ctx }
