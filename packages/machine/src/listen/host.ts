interface Listener {
  pid: number
  port: number
  host: string
}

const MAPPED_IPV4 = [0, 0, 0, 0, 0, 0xffff]

const ipv6Host = (words: number[]) => {
  if (words.every(word => word === 0)) return '::'
  if (words.slice(0, 7).every(word => word === 0) && words[7] === 1) return '::1'
  if (MAPPED_IPV4.every((word, index) => words[index] === word)) return [words[6]! >> 8, words[6]! & 0xff, words[7]! >> 8, words[7]! & 0xff].join('.')
  return words.map(word => word.toString(16)).join(':')
}

export { ipv6Host, type Listener }
