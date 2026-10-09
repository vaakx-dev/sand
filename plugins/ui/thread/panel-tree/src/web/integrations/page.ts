export const rowsPerPage = (list: HTMLElement) => {
  const rows = list.childElementCount
  if (!rows || !list.scrollHeight) return 10
  return Math.max(5, Math.floor(list.clientHeight / (list.scrollHeight / rows)))
}
