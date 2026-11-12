import { derive, div, dynamicChild, media, onMount, show, sig, SPACE, span, type Child } from '@vaakx-dev/vrui'
import { whenAddressSettled } from '@sand/web-client/contract'
import type { ButtonOptions, PickerTarget } from './contract'
import type { Picker } from './deps'
import { modelPanel } from './panel/panel'

const panelWidth = `calc(${SPACE['96']} + ${SPACE['12']})`

type Press = Record<string, unknown>

export const pickerButton = (picker: Picker, target: PickerTarget, { label, look = 'field', opened = false, opener }: ButtonOptions) => {
  const { ctx, changes, pcs } = picker
  const { cardItem, dropdown, modelLogo, pickerButton: pickerField, pressOpens } = ctx.kit
  const open = sig(false)
  const close = () => open.set(false)
  const reveal = () => whenAddressSettled(() => open.set(true))

  const shown = changes.read(() => target.shown())
  const model = derive(() => ctx.models.info(shown.get()?.model))
  const text = () => ctx.models.label(shown.get() ?? {})
  const offline = () => {
    const source = ctx.models.sources().find(known => known.id === model.get()?.source)
    return source?.pc ? (pcs.online(source.pc) ?? source.online) === false : false
  }
  const tip = () => [text(), offline() && 'offline'].filter(Boolean).join(' · ')
  const named = { title: tip, 'aria-label': () => `${label}: ${tip()}` }
  const logo = () =>
    dynamicChild(
      model.map(value => value?.provider),
      provider => modelLogo(provider, 16),
    )
  const name = (extra: string): Child => span({ class: () => [extra, shown.get()?.model ? '' : 'text-warning-400'] }, text)

  const field = (press: Press) =>
    pickerField({ ...press, ...named, field: true, lead: logo() }, name(''))
  const row = (press: Press) => cardItem({ ...press, ...named, lead: logo(), menu: true }, name(''))

  const panel = () => modelPanel(picker, target, close)
  const popup = (trigger: (press: Press) => HTMLElement) =>
    dropdown({ open, placement: 'below-right', width: panelWidth, trigger: press => trigger(press), items: () => [panel()] })
  const inline = (trigger: (press: Press) => HTMLElement) =>
    div(
      { class: 'flex min-w-0 flex-col' },
      trigger(pressOpens(open, () => open.update(value => !value))),
      show(open, () => div({ class: 'flex min-w-0 flex-col px-1 pb-1' }, panel())),
    )

  const node =
    look === 'row'
      ? div(
          { class: 'relative flex min-w-0 flex-col' },
          dynamicChild(media('(max-width: 37.5rem)'), phone => (phone ? inline(row) : popup(row))),
        )
      : popup(field)
  if (opened) reveal()
  if (opener) onMount(node, () => opener(reveal))
  return node
}
