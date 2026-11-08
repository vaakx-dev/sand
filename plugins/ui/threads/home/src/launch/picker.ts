import { palette } from '@sand/palette/contract'
import type { Pulse } from '@sand/reactive'
import type { Kit } from '@sand/ui-kit/contract'
import { projects, type Threads } from '@sand/web-client/contract'
import { dynamicChild, span } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { currentPlace, places, type Place } from '../palette/places'
import { newThreadPage, openDraft } from '../palette/projects'

const shown = 6

const choice = (ctx: Context, kit: Kit, threads: Threads, place: Pick<Place, 'id' | 'name' | 'path' | 'device'>, here: string, close: () => void) =>
  kit.choiceItem(
    {
      selected: place.id === here,
      onClick: () => {
        close()
        void openDraft(ctx, threads, place.path, place.device)
      },
    },
    span({ class: 'min-w-0 flex-1 truncate' }, place.name),
  )

const more = (ctx: Context, kit: Kit, threads: Threads, close: () => void) => {
  const found = ctx.get(palette)
  if (!found) return []
  const open = () => {
    close()
    found.open(newThreadPage(ctx, threads))
  }
  return [kit.menuSeparator(), kit.menuItem({ icon: 'search', onClick: open }, 'More projects…')]
}

const choices = (ctx: Context, kit: Kit, threads: Threads, close: () => void) => {
  const here = currentPlace(ctx, threads).id
  const device = threads.device()
  const quick = { id: `${device}\0quick`, name: 'No project', path: '', device }
  return [
    ...places(ctx, threads)
      .slice(0, shown)
      .map(place => choice(ctx, kit, threads, place, here, close)),
    choice(ctx, kit, threads, quick, here, close),
    ...more(ctx, kit, threads, close),
  ]
}

const chosenView = (ctx: Context, kit: Kit, place: Place | undefined) => {
  if (!place) return kit.icon('folder', 'sm')
  const look = place.group && ctx.get(projects)?.groupIcon(place.group)
  return span({ class: 'flex min-w-0 items-center gap-2' }, kit.projectMark(place.name, look || undefined), span({ class: 'max-w-40 truncate' }, place.name))
}

export const projectPicker = (ctx: Context, kit: Kit, threads: Threads, pulse: Pulse) => {
  const chosen = pulse.read(() => {
    const place = currentPlace(ctx, threads)
    return place.path ? place : undefined
  })
  return kit.dropdown({
    placement: 'above-left',
    items: close => choices(ctx, kit, threads, close),
    trigger: (press, open) =>
      kit.quietButton(
        { ...press, size: 'sm', active: open, 'aria-label': () => (chosen.get() ? `Project: ${chosen.get()?.name}` : 'Choose a project') },
        dynamicChild(chosen, place => chosenView(ctx, kit, place)),
        kit.icon('down', 'sm'),
      ),
  })
}
