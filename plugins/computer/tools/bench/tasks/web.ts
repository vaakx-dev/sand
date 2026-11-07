import { z } from 'zod'
import { all, answered, tabAt, type Seen, type Task, type Verdict } from './task'

const frontPage = async () => {
  const html = await (await fetch('https://news.ycombinator.com/')).text()
  return [...html.matchAll(/<tr class="athing[^"]*" id="(\d+)"/g)].map(match => match[1]!)
}

const topStory = async (seen: Seen): Promise<Verdict> => {
  const opened = seen.tabs.flatMap(tab => tab.url.match(/news\.ycombinator\.com\/item\?id=(\d+)/)?.[1] ?? [])
  const top = (await frontPage()).slice(0, 3)
  return opened.some(id => top.includes(id))
    ? { pass: true, why: 'opened a top story' }
    : { pass: false, why: `opened ${opened.join(', ') || 'no story'}; the top stories are now ${top.join(', ')}` }
}

const pageLengths = z.object({ query: z.object({ pages: z.array(z.object({ title: z.string(), length: z.number() })) }) })

const mountains = ['Mount Kilimanjaro', 'Mount Elbrus']

const pageInfo = async (seen: Seen): Promise<Verdict> => {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=info&format=json&formatversion=2&titles=${encodeURIComponent(mountains.join('|'))}`
  const { query } = pageLengths.parse(await (await fetch(url, { headers: { 'user-agent': 'sand-computer-bench' } })).json())
  return all(tabAt(seen, /wikipedia\.org\/w\/index\.php\?title=Mount_(Kilimanjaro|Elbrus)&action=info/), ...query.pages.map(page => answered(seen, String(page.length))))
}

const commits = z.array(z.object({ sha: z.string(), commit: z.object({ author: z.object({ name: z.string() }) }), author: z.object({ login: z.string() }).nullable() }))

const lastLicenseCommit = async (seen: Seen): Promise<Verdict> => {
  const [latest] = commits.parse(await (await fetch('https://api.github.com/repos/oven-sh/bun/commits?path=LICENSE.md&per_page=1')).json())
  if (!latest) return { pass: false, why: 'GitHub lists no commits for LICENSE.md' }
  const names = [latest.commit.author.name, ...(latest.author ? [latest.author.login] : [])]
  return all(answered(seen, latest.sha.slice(0, 7)), answered(seen, ...names))
}

const pastDay = '2024-01-01'

const pastThird = async (seen: Seen): Promise<Verdict> => {
  const html = await (await fetch(`https://news.ycombinator.com/front?day=${pastDay}`)).text()
  const stories = [...html.matchAll(/<tr class="athing[^"]*" id="(\d+)"[\s\S]*?class="hnuser">([^<]+)</g)].map(([, id, user]) => ({ id: id!, user: user! }))
  const third = stories[2]
  if (!third) return { pass: false, why: `Hacker News shows no third story for ${pastDay}` }
  return all(tabAt(seen, new RegExp(`news\\.ycombinator\\.com/item\\?id=${third.id}$`)), answered(seen, third.user))
}

const searchResults = z.object({ items: z.array(z.object({ number: z.number(), reactions: z.object({ '+1': z.number() }) })) })

const mostThumbs = async (seen: Seen): Promise<Verdict> => {
  const query = encodeURIComponent('repo:oven-sh/bun is:issue is:open label:bug')
  const { items } = searchResults.parse(await (await fetch(`https://api.github.com/search/issues?q=${query}&sort=reactions-%2B1&order=desc&per_page=5`)).json())
  const top = items[0]
  if (!top) return { pass: false, why: 'GitHub found no open bug issues' }
  const tied = items.filter(item => item.reactions['+1'] === top.reactions['+1']).map(item => String(item.number))
  return answered(seen, ...tied)
}

const routes = z.object({ routes: z.array(z.object({ distance: z.number() })) })

const kilometresIn = (answer: string) => [...answer.replaceAll(',', '.').matchAll(/(\d+(?:\.\d+)?)\s*km/gi)].map(([, value]) => Number(value))

const operaToBondi = async (seen: Seen): Promise<Verdict> => {
  const { routes: found } = routes.parse(await (await fetch('https://routing.openstreetmap.de/routed-car/route/v1/driving/151.2153,-33.8568;151.2743,-33.8915?overview=false')).json())
  const route = found[0]
  if (!route) return { pass: false, why: 'the routing service found no route' }
  const expected = route.distance / 1000
  const near = kilometresIn(seen.answer).some(value => Math.abs(value - expected) <= expected * 0.25)
  const distance = near
    ? { pass: true, why: `answered about ${expected.toFixed(1)} km` }
    : { pass: false, why: `answer has no distance near ${expected.toFixed(1)} km: "${seen.answer.slice(0, 120)}"` }
  return all(tabAt(seen, /openstreetmap\.org\/directions/), distance)
}

export const web: Task[] = [
  {
    id: 'wikipedia',
    set: 'browser',
    place: 'web',
    kind: 'basic',
    prompt: () => 'Open the English Wikipedia article about the Eiffel Tower and reply with the year its construction was completed.',
    check: seen => all(tabAt(seen, /wikipedia\.org\/wiki\/Eiffel_Tower/), answered(seen, '1889')),
  },
  {
    id: 'github-releases',
    set: 'browser',
    place: 'web',
    kind: 'basic',
    prompt: () => 'On GitHub, open the Releases page of the oven-sh/bun repository.',
    check: seen => tabAt(seen, /^https:\/\/github\.com\/oven-sh\/bun\/releases\/?(\?.*)?$/),
  },
  {
    id: 'hacker-news',
    set: 'browser',
    place: 'web',
    kind: 'basic',
    prompt: () => 'Open Hacker News (news.ycombinator.com) and open the comments page of the story ranked first on the front page.',
    check: topStory,
  },
  {
    id: 'mdn-search',
    set: 'browser',
    place: 'web',
    kind: 'basic',
    prompt: () => "Use the search on developer.mozilla.org to find the reference page for JavaScript's Array flatMap method, and open it.",
    check: seen => tabAt(seen, /developer\.mozilla\.org\/[\w-]+\/docs\/Web\/JavaScript\/Reference\/Global_Objects\/Array\/flatMap(#.*)?$/),
  },
  {
    id: 'wiki-info',
    set: 'browser',
    place: 'web',
    kind: 'menu',
    prompt: () =>
      'On English Wikipedia, open the article "Mount Kilimanjaro" and, from its Tools menu, open its Page information page. Do the same for "Mount Elbrus". Reply with the page length in bytes of each article.',
    check: pageInfo,
  },
  {
    id: 'github-history',
    set: 'browser',
    place: 'web',
    kind: 'flow',
    prompt: () =>
      'On GitHub, in the oven-sh/bun repository, open the file LICENSE.md and look at its history. Reply with the author and the short hash (7 characters) of the most recent commit that changed that file.',
    check: lastLicenseCommit,
  },
  {
    id: 'hn-past',
    set: 'browser',
    place: 'web',
    kind: 'flow',
    prompt: () =>
      `On Hacker News (news.ycombinator.com), use "past" to open the front page as it was on ${pastDay}. Open the comments page of the story ranked third that day, and reply with the username of the person who submitted it.`,
    check: pastThird,
  },
  {
    id: 'mdn-compat',
    set: 'browser',
    place: 'web',
    kind: 'scroll',
    prompt: () =>
      "On developer.mozilla.org, open the reference page for JavaScript's Array.prototype.findLast() and, in its browser compatibility table, find the first version of Safari on iOS that supports it. Reply with that version.",
    check: seen => all(tabAt(seen, /developer\.mozilla\.org\/[\w-]+\/docs\/Web\/JavaScript\/Reference\/Global_Objects\/Array\/findLast(#.*)?$/), answered(seen, '15.4')),
  },
  {
    id: 'github-thumbs',
    set: 'browser',
    place: 'web',
    kind: 'menu',
    prompt: () =>
      'On GitHub, among the open issues of the oven-sh/bun repository labelled "bug", find the one with the most thumbs-up reactions, using the issue list\'s own label filter and sort menus. Reply with its issue number.',
    check: mostThumbs,
  },
  {
    id: 'osm-route',
    set: 'browser',
    place: 'web',
    kind: 'flow',
    prompt: () =>
      'On openstreetmap.org, get directions by car from Sydney Opera House to Bondi Beach in Sydney, Australia. Reply with the distance and travel time the site shows for the route.',
    check: operaToBondi,
  },
]

const signedOut = ({ tabs }: Seen, pattern: RegExp): Verdict => {
  const wall = tabs.find(tab => pattern.test(tab.text))
  return wall ? { pass: false, why: `signed out at ${wall.url}` } : { pass: true, why: 'signed in' }
}

export const account: Task[] = [
  {
    id: 'x-post',
    set: 'browser',
    place: 'account',
    kind: 'basic',
    prompt: () => 'Open x.com and find the most recent post by @bunjavascript, then open that post on its own page. Do not like, repost, reply to or follow anything.',
    check: seen => tabAt(seen, /x\.com\/bunjavascript\/status\/\d+/),
  },
  {
    id: 'github-stars',
    set: 'browser',
    place: 'account',
    kind: 'basic',
    prompt: () => 'On GitHub, open the list of repositories the signed-in user has starred. Do not star or unstar anything.',
    check: seen => all(tabAt(seen, /github\.com\/(stars(\/|$)|[\w-]+\?tab=stars)/), signedOut(seen, /Sign in to GitHub/)),
  },
]
