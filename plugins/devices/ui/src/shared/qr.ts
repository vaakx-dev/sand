import { div, path, rect, svg } from '@vaakx-dev/vrui'
import { encode } from 'uqr'

export type QrSize = 'md' | 'lg'

const widths: Record<QrSize, string> = { md: 'w-32', lg: 'w-40' }

export const qrCode = (text: string, size: QrSize = 'lg') => {
  const { data, size: cells } = encode(text, { border: 2 })
  const marks = data.flatMap((row, y) => row.flatMap((dark, x) => (dark ? [`M${x} ${y}h1v1h-1z`] : []))).join('')
  return div(
    { class: [widths[size], 'max-w-full shrink-0 overflow-hidden rounded-lg'], role: 'img', 'aria-label': 'QR code' },
    svg({ viewBox: `0 0 ${cells} ${cells}`, width: '100%' }, rect({ width: cells, height: cells, fill: '#fff' }), path({ d: marks, fill: '#000' })),
  )
}
