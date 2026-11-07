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

export const web: Task[] = [
  {
    id: 'wikipedia',
    set: 'browser',
    place: 'web',
    prompt: () => 'Open the English Wikipedia article about the Eiffel Tower and reply with the year its construction was completed.',
    check: seen => all(tabAt(seen, /wikipedia\.org\/wiki\/Eiffel_Tower/), answered(seen, '1889')),
  },
  {
    id: 'github-releases',
    set: 'browser',
    place: 'web',
    prompt: () => 'On GitHub, open the Releases page of the oven-sh/bun repository.',
    check: seen => tabAt(seen, /^https:\/\/github\.com\/oven-sh\/bun\/releases\/?(\?.*)?$/),
  },
  {
    id: 'hacker-news',
    set: 'browser',
    place: 'web',
    prompt: () => 'Open Hacker News (news.ycombinator.com) and open the comments page of the story ranked first on the front page.',
    check: topStory,
  },
  {
    id: 'mdn-search',
    set: 'browser',
    place: 'web',
    prompt: () => "Use the search on developer.mozilla.org to find the reference page for JavaScript's Array flatMap method, and open it.",
    check: seen => tabAt(seen, /developer\.mozilla\.org\/[\w-]+\/docs\/Web\/JavaScript\/Reference\/Global_Objects\/Array\/flatMap$/),
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
    prompt: () => 'Open x.com and find the most recent post by @bunjavascript, then open that post on its own page. Do not like, repost, reply to or follow anything.',
    check: seen => tabAt(seen, /x\.com\/bunjavascript\/status\/\d+/),
  },
  {
    id: 'github-stars',
    set: 'browser',
    place: 'account',
    prompt: () => 'On GitHub, open the list of repositories the signed-in user has starred. Do not star or unstar anything.',
    check: seen => all(tabAt(seen, /github\.com\/(stars(\/|$)|[\w-]+\?tab=stars)/), signedOut(seen, /Sign in to GitHub/)),
  },
]
