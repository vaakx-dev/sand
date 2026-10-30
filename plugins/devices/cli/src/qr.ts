import { encode } from 'uqr'

const fg = (dark: boolean) => (dark ? 30 : 97)
const bg = (dark: boolean) => (dark ? 40 : 107)

const halfBlockRow = (top: boolean[], bottom: boolean[] = []) =>
  `  ${top.map((dark, x) => `\x1b[${fg(dark)};${bg(bottom[x] ?? false)}m▀`).join('')}\x1b[0m`

export const terminalQr = (text: string) => {
  const { data } = encode(text, { border: 2 })
  return data
    .filter((_, y) => y % 2 === 0)
    .map((top, index) => halfBlockRow(top, data[index * 2 + 1]))
    .join('\n')
}
