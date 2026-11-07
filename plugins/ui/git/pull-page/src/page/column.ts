import type { PageParts } from '../parts'

export const pageColumn = (parts: PageParts) => () => (parts.selected.get() ? 'w-full' : parts.kit.pageColumn)
