import { expect, test } from 'bun:test'
import { totpCode, totpSecret } from '../src/totp'

const rfc6238 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

test('codes match the RFC 6238 SHA-1 test vectors, cut to six digits', () => {
  const vectors: [seconds: number, code: string][] = [
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
    [20000000000, '353130'],
  ]
  for (const [seconds, code] of vectors) expect(totpCode(rfc6238, seconds * 1000)).toBe(code)
})

test('a secret is read from an otpauth:// link or a spaced, lowercase key, and anything else is refused', () => {
  expect(totpSecret('otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&period=30')).toBe('JBSWY3DPEHPK3PXP')
  expect(totpSecret('gezd gnbv gy3t qojq gezd gnbv gy3t qojq')).toBe(rfc6238)
  expect(totpSecret('JBSW-Y3DP-EHPK-3PXP====')).toBe('JBSWY3DPEHPK3PXP')
  for (const bad of ['otpauth://totp/Example?issuer=Example', 'not a key at all', 'JBSWY3DP', 'JBSWY3DPEHPK3PX1']) expect(() => totpSecret(bad)).toThrow('authenticator secret')
})
