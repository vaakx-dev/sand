const niceStep = (raw: number) => {
  const power = 10 ** Math.floor(Math.log10(raw))
  const ratio = raw / power
  return (ratio <= 1 ? 1 : ratio <= 2 ? 2 : ratio <= 5 ? 5 : 10) * power
}

export const scaleFor = (peak: number) => {
  if (peak <= 0) return { top: 1, ticks: [0] }
  const step = niceStep(peak / 3)
  const top = step * Math.ceil(peak / step)
  return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step) }
}

export const cssPercent = (fraction: number) => `${fraction * 100}%`
