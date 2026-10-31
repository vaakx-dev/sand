import type { PageParts } from '../parts'

export const pageColumn = (parts: PageParts) => () => (parts.selected.get() ? 'w-full' : 'mx-auto w-full max-w-4xl')
