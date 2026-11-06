import { addressParam, addressParams, addressState, backAddress, pushAddress, updateAddress } from '@sand/web-client/contract'

const key = 'settings'
const opened = 'settingsOpened'

export const requestedPage = () => addressParam(key)

export const openPage = (id: string) => pushAddress({ ...addressParams(), [key]: id }, { ...addressState(), [opened]: true })

export const switchPage = (id: string) => updateAddress({ [key]: id })

export const leavePage = () => (addressState()[opened] ? backAddress() : updateAddress({ [key]: undefined }))

export const dropPage = () => updateAddress({ [key]: undefined })
