import { expect, test } from 'bun:test'
import { linkOf } from '../src/link'

test('a shared link shows the page title and where it points, however the sending app writes it', () => {
  expect(linkOf('Retry with exponential backoff\n\nhttps://docs.example.dev/guides/retries')).toEqual({
    title: 'Retry with exponential backoff',
    address: 'docs.example.dev/guides/retries',
  })
  expect(linkOf('Look at this tide chart https://tides.example.org/charts/')).toEqual({ title: 'Look at this tide chart', address: 'tides.example.org/charts' })
  expect(linkOf('https://example.dev/')).toEqual({ title: 'example.dev', address: 'example.dev' })
  expect(linkOf('Water the roses before the heat')).toBeUndefined()
})
