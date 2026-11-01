import { imageKey } from '../contract'
import { present } from './nodes'
import type { PagedLists } from './pages'
import type { RawDetail } from './raw'

const decoded = (value: string) => value.replaceAll('&amp;', '&')

const htmlOf = (node: RawDetail, { comments, reviews, threads }: PagedLists) => [
  node.bodyHTML,
  ...comments.map(comment => comment.bodyHTML),
  ...reviews.map(review => review.bodyHTML),
  ...threads.flatMap(thread => present(thread.comments.nodes).map(comment => comment.bodyHTML)),
]

export const imagesOf = (node: RawDetail, lists: PagedLists) => {
  const images: Record<string, string> = {}
  const reader = new HTMLRewriter().on('img[src]', {
    element(img) {
      const src = decoded(img.getAttribute('src') ?? '')
      const key = imageKey(decoded(img.getAttribute('data-canonical-src') ?? src))
      if (key !== src) images[key] = src
    },
  })
  for (const html of htmlOf(node, lists)) if (html) reader.transform(html)
  return images
}
