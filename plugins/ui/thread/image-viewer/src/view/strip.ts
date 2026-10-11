import type { Picture, Sender, ThreadImage } from '../gallery'
import type { ViewerModel } from './model'
import { div, effect, plainButton, span } from '@sand/dom'
import { senderNames } from '../gallery'

interface Numbered {
  image: ThreadImage
  index: number
}

interface Run {
  sender: Sender
  members: Numbered[]
}

const runsOf = (images: ThreadImage[]) =>
  images.reduce<Run[]>((runs, image, index) => {
    const last = runs.at(-1)
    if (last?.sender === image.sender) last.members.push({ image, index })
    else runs.push({ sender: image.sender, members: [{ image, index }] })
    return runs
  }, [])

const thumb = ({ image, index }: Numbered, model: ViewerModel, picture: Picture) => {
  const active = () => model.current.get() === index
  return plainButton(
    {
      title: image.block.name ?? `Image ${index + 1}`,
      class: ['h-12 shrink-0 overflow-hidden rounded-md ring-2 transition-opacity', () => (active() ? 'ring-accent-500' : 'ring-transparent opacity-50 hover:opacity-80')],
      onClick: () => model.go(index),
      onMount: node =>
        effect(() => {
          if (active()) node.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
        }),
    },
    picture(image.block, { class: 'block h-full w-auto' }),
  )
}

const runView = (run: Run, model: ViewerModel, picture: Picture) =>
  div(
    { class: 'flex shrink-0 flex-col gap-1' },
    span({ class: 'px-1 text-xs text-neutral-500' }, senderNames[run.sender]),
    div({ class: 'flex gap-2 p-1' }, run.members.map(member => thumb(member, model, picture))),
  )

export const viewerStrip = (model: ViewerModel, picture: Picture) =>
  div(
    { class: 'shrink-0 overflow-x-auto px-5 pt-2 pb-4' },
    div({ class: 'mx-auto flex w-max gap-4' }, runsOf(model.images).map(run => runView(run, model, picture))),
  )
