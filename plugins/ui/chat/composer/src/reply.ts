import { addressParam, updateAddress } from '@sand/web-client/contract'

const REPLY_PARAM = 'reply'

let asked = addressParam(REPLY_PARAM) !== undefined

export const takeReply = () => {
  if (!asked) return false
  asked = false
  updateAddress({ [REPLY_PARAM]: undefined })
  return true
}
