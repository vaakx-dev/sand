import { networkInterfaces } from 'node:os'

const outward = () =>
  Object.entries(networkInterfaces()).flatMap(([name, addresses]) =>
    (addresses ?? []).filter(address => !address.internal).map(address => `${name} ${address.address}`),
  )

export const interfacesSignature = () => outward().sort().join('\n')

export const hasNetwork = () => outward().length > 0
