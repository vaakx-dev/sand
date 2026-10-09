const paint = (code: string, text: string) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text)

export const dim = (text: string) => console.log(paint('2', text))

export const notice = (text: string) => console.log(paint('33', text))

export const done = (text: string, detail?: string) => console.log(`${paint('32', '✓')} ${text}${detail ? `  ${paint('2', `→ ${detail}`)}` : ''}`)
