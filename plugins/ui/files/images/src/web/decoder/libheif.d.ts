declare module 'libheif-js/libheif-wasm/libheif-bundle.mjs' {
  interface Pixels {
    data: Uint8ClampedArray<ArrayBuffer>
    width: number
    height: number
  }

  export interface HeifImage {
    get_width(): number
    get_height(): number
    is_primary(): boolean
    display(target: Pixels, done: (shown: Pixels | null) => void): void
  }

  interface Libheif {
    HeifDecoder: new () => { decode(bytes: Uint8Array): HeifImage[] }
  }

  const libheif: () => Libheif
  export default libheif
}
