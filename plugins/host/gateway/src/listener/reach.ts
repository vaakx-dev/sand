import type { AddressReach } from '../contract'
import { ipv6Subnets } from './addresses'
import { type Ip, parseIp, samePrefix } from './ip'

const forwarding = ['x-forwarded-for', 'forwarded', 'x-forwarded-host', 'tailscale-user-login']

const reachOfIpv4 = ([a = 0, b = 0]: number[]): AddressReach => {
  if (a === 127) return 'loopback'
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return 'private'
  if (a === 100 && b >= 64 && b <= 127) return 'tailscale'
  return 'public'
}

const onLink = (ip: Ip) => ipv6Subnets().some(subnet => samePrefix(ip, subnet.ip, subnet.prefix))

const reachOfIpv6 = (ip: Ip): AddressReach => {
  const [first = 0, second = 0, third = 0] = ip.parts
  if (ip.parts.slice(0, 7).every(part => part === 0) && ip.parts[7] === 1) return 'loopback'
  if (first === 0xfd7a && second === 0x115c && third === 0xa1e0) return 'tailscale'
  if ((first & 0xffc0) === 0xfe80 || (first & 0xfe00) === 0xfc00) return 'private'
  return onLink(ip) ? 'private' : 'public'
}

export const reachOf = (address: string | undefined): AddressReach => {
  const ip = address ? parseIp(address) : undefined
  if (!ip) return 'public'
  return ip.family === 4 ? reachOfIpv4(ip.parts) : reachOfIpv6(ip)
}

export const isForwarded = (request: Request) => forwarding.some(header => request.headers.has(header))

const forwardedFor = (request: Request) => request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined

const unmapped = (address: string | undefined) => address?.replace(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i, '$1')

export const sourceOf = (request: Request, peer: string | undefined) => {
  const forwarded = isForwarded(request)
  const direct = reachOf(peer) === 'loopback'
  const address = unmapped(direct && forwarded ? forwardedFor(request) : peer)
  return { address, reach: reachOf(address), local: direct && !forwarded }
}

export type Source = ReturnType<typeof sourceOf>
