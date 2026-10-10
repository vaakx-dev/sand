const most = 32

export const slugOf = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 4)
    .join('-')
    .slice(0, most)
    .replace(/-+$/, '') || 'thread'

export const branchFor = (text: string) => `sand/${slugOf(text)}`
