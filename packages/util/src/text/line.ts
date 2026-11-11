import { clip } from './cut'

export const oneLine = (value: string, max = Infinity) => clip(value.replace(/\s+/g, ' ').trim(), max)
