import type { IFD } from 'utif2'

declare module 'utif2' {
  export function decode(buffer: ArrayBuffer, options: { parseMN: boolean; debug: boolean }): IFD[]
}
