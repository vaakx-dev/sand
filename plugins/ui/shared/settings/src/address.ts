import { addressParam, addressParams, addressState, pushAddress, updateAddress } from '@sand/web-client/address'

const key = 'settings'
const opened = 'settingsOpened'

export const requestedPage = () => addressParam(key)

export const openPage = (id: string) => pushAddress({ ...addressParams(), [key]: id }, { ...addressState(), [opened]: true })

export const switchPage = (id: string) => updateAddress({ [key]: id })

export const leavePage = () => (addressState()[opened] ? history.back() : updateAddress({ [key]: undefined }))
