import { mount, textarea } from '@vaakx-dev/vrui'

const fallback = (text: string) => {
  const field = textarea({ value: text, readOnly: true, class: 'fixed inset-0 opacity-0' })
  const unmount = mount(document.body, field)
  field.select()
  const copied = document.execCommand('copy')
  unmount()
  return copied
}

const writeItem = (formats: Record<string, string>) => {
  const blobs = Object.entries(formats)
    .filter(([type]) => ClipboardItem.supports(type))
    .map(([type, value]) => [type, new Blob([value], { type })])
  return navigator.clipboard.write([new ClipboardItem(Object.fromEntries(blobs))])
}

export const copyText = async (text: string, formats: Record<string, string> = {}) => {
  try {
    if (!navigator.clipboard) return fallback(text)
    if (Object.keys(formats).length && typeof ClipboardItem === 'function') await writeItem({ 'text/plain': text, ...formats })
    else await navigator.clipboard.writeText(text)
    return true
  } catch {
    return fallback(text)
  }
}
