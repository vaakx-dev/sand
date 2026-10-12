import { effect, onMount, type Sig } from '@vaakx-dev/vrui'

export const autosize = (field: HTMLTextAreaElement, value: Sig<string>) => {
  const fit = () => {
    if (field.hidden) return
    field.style.height = 'auto'
    field.style.height = `${field.scrollHeight}px`
  }
  onMount(field, () => fit())
  effect(() => {
    value.get()
    fit()
  })
}
