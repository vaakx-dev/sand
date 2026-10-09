export const tail = (text: string, count: number) =>
  text
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter(Boolean)
    .slice(-count)
    .join('\n')
