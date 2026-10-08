const units = ['B', 'KB', 'MB', 'GB', 'TB']

export const sizeText = (bytes: number) => {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${unit ? value.toFixed(1) : value} ${units[unit]}`
}
