export const decoderRoute = '/file-images/'

export const decoders = ['tiff', 'heic'] as const

export type Decoder = (typeof decoders)[number]

export const decoderUrl = (decoder: Decoder) => `${decoderRoute}${decoder}.js`
