import type { Draw, Picture, Sender } from '../gallery'
import type { ViewerModel } from './model'
import type { Kit } from '@sand/ui-kit/contract'
import { div, effect } from '@vaakx-dev/vrui'
import { senderNames } from '../gallery'

interface Numbered {
  image: Picture
  index: number
}

interface Run {
  sender: Sender
  members: Numbered[]
}

const runsOf = (images: Picture[]) =>
  images.reduce<Run[]>((runs, image, index) => {
    const last = runs.at(-1)
    if (last?.sender === image.sender) last.members.push({ image, index })
    else runs.push({ sender: image.sender, members: [{ image, index }] })
    return runs
  }, [])

const thumb = (kit: Kit, { image, index }: Numbered, model: ViewerModel, draw: Draw) => {
  const { plainButton } = kit
  const active = () => model.current.get() === index
  return plainButton(
    {
      'aria-label': image.name ?? `Image ${index + 1}`,
      'aria-current': () => String(active()),
      class: ['h-12 shrink-0 overflow-hidden rounded-md transition-opacity', () => (active() ? '' : 'opacity-50 hover:opacity-80')],
      onClick: () => model.go(index),
      onMount: node =>
        effect(() => {
          if (active()) node.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
        }),
    },
    draw(image, { class: 'block h-full', maxHeight: 48 }),
  )
}

const runView = (kit: Kit, run: Run, model: ViewerModel, draw: Draw) =>
  div(
    { class: 'flex shrink-0 flex-col gap-1' },
    div({ class: 'flex px-1' }, kit.metaLine(senderNames[run.sender])),
    div({ class: 'flex gap-2 p-1' }, run.members.map(member => thumb(kit, member, model, draw))),
  )

export const viewerStrip = (kit: Kit, model: ViewerModel, draw: Draw) =>
  div(
    { class: 'shrink-0 overflow-x-auto px-5 pt-2 pb-4' },
    div({ class: 'mx-auto flex w-max gap-4' }, runsOf(model.images).map(run => runView(kit, run, model, draw))),
  )
