import { imageKey } from '@sand/pull-detail/contract'
import { a, img, sig, show } from '@vaakx-dev/vrui'

const webUrl = (raw: string) => {
  try {
    const url = new URL(raw.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined
  } catch {
    return undefined
  }
}

export const pictureOf = (images: Record<string, string>) => (src: string, alt: string) => {
  const url = webUrl(src)
  if (!url) return undefined
  const shown = images[imageKey(url)] ?? url
  const failed = sig(false)
  return a(
    {
      href: url,
      target: '_blank',
      rel: 'noopener noreferrer',
      referrerPolicy: 'no-referrer',
      title: alt || url,
      class: () => (failed.get() ? 'underline hover:text-neutral-400' : 'inline-block max-w-full align-top'),
    },
    show(
      () => !failed.get(),
      () => img({ src: shown, alt, referrerPolicy: 'no-referrer', loading: 'lazy', class: 'max-w-full rounded-md', onError: () => failed.set(true) }),
    ),
    () => (failed.get() ? `▣ ${alt || 'image'}` : ''),
  )
}
