const pattern = / at line (\d+)$/

export const atLine = (line: number) => ` at line ${line}`

export const readAtLine = (text: string) => {
  const found = pattern.exec(text)
  return found ? Number(found[1]) : undefined
}
