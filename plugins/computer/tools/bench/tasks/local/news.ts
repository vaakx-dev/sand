import { all, answered, tabAt, type LocalTask } from '../task'
import { layout, pick, shuffled } from './layout'

const subjects = ['City council', 'Local bakery', 'River cleanup', 'School robotics team', 'Night market', 'Library', 'Cycling club', 'Harbour ferry', 'Farmers', 'Choir']
const events = ['wins regional award', 'opens new branch', 'plans summer festival', 'raises funds for repairs', 'celebrates 50 years', 'faces budget cuts']
const authors = ['Mira Okafor', 'Tom Lindqvist', 'Priya Raman', 'Jonas Becker', 'Lucia Ferraro', 'Kenji Mori', 'Hannah Cole', 'Omar Haddad']

const articles = shuffled(subjects.flatMap(subject => events.map(event => `${subject} ${event}`)))
  .slice(0, 30)
  .map((title, index) => ({ id: 100 + index, title, author: pick(authors) }))

const perPage = 5
const wanted = articles[3 * perPage + 2]!

const header = '<header><b>The Riverside Gazette</b><a href="/news/">Latest</a></header>'

const list = (page: number) => {
  const shown = articles.slice((page - 1) * perPage, page * perPage)
  const older = page * perPage < articles.length ? `<a href="/news/?page=${page + 1}">Older stories →</a>` : ''
  const newer = page > 1 ? `<a href="/news/?page=${page - 1}">← Newer stories</a> ` : ''
  return layout(
    `Latest news, page ${page}`,
    `${header}<main><h1>Latest news</h1>${shown.map(article => `<div class="card"><h2><a href="/news/article/${article.id}">${article.title}</a></h2><p>Read the full story.</p></div>`).join('')}<p>${newer}${older}</p></main>`,
  )
}

const story = (id: number) => {
  const article = articles.find(each => each.id === id)
  if (!article) return undefined
  return layout(article.title, `${header}<main><h1>${article.title}</h1><p>By ${article.author}</p><p>The story continues with quotes from residents and what happens next.</p></main>`)
}

export const news: LocalTask = {
  id: 'news',
  set: 'browser',
  place: 'local',
  prompt: site => `On the news site at ${site}/news/, find the article titled "${wanted.title}". It is not on the first page. Open it and reply with the name of its author.`,
  check: seen => all(tabAt(seen, new RegExp(`/news/article/${wanted.id}$`)), answered(seen, wanted.author)),
  page(path, query) {
    if (path === '/') return list(Number(query.get('page') ?? 1))
    const match = path.match(/^\/article\/(\d+)$/)
    return match ? story(Number(match[1])) : undefined
  },
}
