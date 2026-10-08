import { div, path, rect, svg } from '@sand/dom'
import { encode } from 'uqr'

export const qrCode = (text: string) => {
  const { data, size } = encode(text, { border: 2 })
  const marks = data.flatMap((row, y) => row.flatMap((dark, x) => (dark ? [`M${x} ${y}h1v1h-1z`] : []))).join('')
  return div(
    { class: 'w-48 max-w-full overflow-hidden rounded-lg' },
    svg({ viewBox: `0 0 ${size} ${size}`, width: '100%' }, rect({ width: size, height: size, fill: '#fff' }), path({ d: marks, fill: '#000' })),
  )
}
