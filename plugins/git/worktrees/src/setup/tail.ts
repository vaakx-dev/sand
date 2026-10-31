const mostLines = 20
const ansi = /\x1b\[[0-9;?]*[A-Za-z]/g

const shown = (line: string) => (line.split('\r').filter(Boolean).at(-1) ?? '').replace(ansi, '').trimEnd()

export const outputTail = () => {
  let lines: string[] = []
  let pending = ''

  return {
    add(text: string) {
      const parts = (pending + text).split('\n')
      pending = parts.pop() ?? ''
      lines = [...lines, ...parts.map(shown).filter(Boolean)].slice(-mostLines)
    },
    text(...extra: string[]) {
      return [...lines, shown(pending), ...extra].filter(Boolean).slice(-mostLines).join('\n')
    },
  }
}
