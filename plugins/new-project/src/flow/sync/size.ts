const units = ['B', 'KB', 'MB', 'GB', 'TB']

export const formatSize = (bytes: number) => {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${unit === 0 || value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`
}

export const countOf = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`
