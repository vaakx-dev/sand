export const rowMark = 'data-route-row'

export const dropIndexAt = (list: HTMLElement, y: number) => {
  const rows = [...list.querySelectorAll<HTMLElement>(`[${rowMark}]`)]
  const index = rows.findIndex(row => {
    const box = row.getBoundingClientRect()
    return y < box.top + box.height / 2
  })
  return index === -1 ? rows.length : index
}
