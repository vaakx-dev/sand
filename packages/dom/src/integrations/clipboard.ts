import { mount, textarea } from '@vaakx-dev/vrui'

const fallback = (text: string) => {
  const field = textarea({ value: text, readOnly: true, class: 'fixed inset-0 opacity-0' })
  const unmount = mount(document.body, field)
  field.select()
  const copied = document.execCommand('copy')
  unmount()
  return copied
}

export const copyText = async (text: string) => {
  try {
    if (!navigator.clipboard) return fallback(text)
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return fallback(text)
  }
}

interface Notice {
  push(text: string, options: { level: 'info' | 'error' }): void
}

export const copyWithNotice = async (notify: Notice | undefined, text: string, what: string) => {
  const copied = await copyText(text)
  notify?.push(copied ? `Copied ${what}` : `Could not copy the ${what}`, { level: copied ? 'info' : 'error' })
}
