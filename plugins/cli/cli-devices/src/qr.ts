import { encode } from 'uqr'

const fg = (dark: boolean) => (dark ? 30 : 97)
const bg = (dark: boolean) => (dark ? 40 : 107)

export const terminalQr = (text: string) => {
  const { data } = encode(text, { border: 2 })
  const lines: string[] = []
  for (let y = 0; y < data.length; y += 2) {
    const top = data[y]!
    const bottom = data[y + 1]
    const cells = top.map((dark, x) => `\x1b[${fg(dark)};${bg(bottom?.[x] ?? false)}m▀`)
    lines.push(`  ${cells.join('')}\x1b[0m`)
  }
  return lines.join('\n')
}
