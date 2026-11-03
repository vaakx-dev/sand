const interval = 250
const tailLines = 4
const lineLength = 300

export const liveTail = (progress: (text: string) => void) => {
  let partial = ''
  let lines: string[] = []
  let timer: ReturnType<typeof setTimeout> | undefined
  const flush = () => {
    timer = undefined
    progress(lines.join('\n'))
    lines = []
  }
  return {
    add: (text: string) => {
      const parts = (partial + text).split(/\r\n|\r|\n/)
      partial = (parts.pop() ?? '').slice(0, lineLength)
      const fresh = parts.filter(line => line.trim()).map(line => line.slice(0, lineLength))
      if (!fresh.length) return
      lines = [...lines, ...fresh].slice(-tailLines)
      timer ??= setTimeout(flush, interval)
    },
    stop: () => clearTimeout(timer),
  }
}
