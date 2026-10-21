const tty = process.stderr.isTTY

const paint = (code: string) => (text: string) => (tty ? `\x1b[${code}m${text}\x1b[0m` : text)

export const dim = paint('2')
export const red = paint('31')
export const cyan = paint('36')
