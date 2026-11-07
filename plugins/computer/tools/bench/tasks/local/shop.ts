import { all, answered, tabAt, type LocalTask } from '../task'
import { layout, shuffled } from './layout'

const materials = ['Copper', 'Steel', 'Ceramic', 'Bamboo', 'Glass', 'Cast Iron']
const goods = ['Kettle', 'Teapot', 'Pan', 'Jar', 'Bowl']
const sizes = ['1.2L', '1.7L']

const products = shuffled(materials.flatMap(material => goods.flatMap(good => sizes.map(size => `${material} ${good} ${size}`)))).map((name, index) => ({
  id: index + 1,
  name,
  price: (12 + Math.random() * 80).toFixed(2),
}))

const wanted = products.find(product => product.name === 'Copper Kettle 1.7L')!
const perPage = 12
const featured = products.filter(product => !product.name.startsWith('Copper Kettle')).slice(0, 8)

const header = `<header><b>Kitchen Supply Co.</b><a href="/shop/">Home</a><a href="/shop/all?page=1">All products</a>
<form action="/shop/search"><input type="text" name="q" placeholder="Search products" aria-label="Search products"> <button>Search</button></form></header>`

const cards = (list: typeof products) =>
  `<div class="grid">${list.map(product => `<div class="card"><a href="/shop/item/${product.id}">${product.name}</a><p>$${product.price}</p></div>`).join('')}</div>`

const home = () => layout('Kitchen Supply Co.', `${header}<main><h1>Featured</h1>${cards(featured)}<p><a href="/shop/all?page=1">See all ${products.length} products</a></p></main>`)

const allPage = (page: number) => {
  const pages = Math.ceil(products.length / perPage)
  const links = Array.from({ length: pages }, (_, index) => `<a href="/shop/all?page=${index + 1}">${index + 1}</a>`).join(' ')
  return layout(`All products, page ${page}`, `${header}<main><h1>All products</h1>${cards(products.slice((page - 1) * perPage, page * perPage))}<p>Pages: ${links}</p></main>`)
}

const search = (query: string) => {
  const found = products.filter(product => product.name.toLowerCase().includes(query.toLowerCase().trim()))
  return layout(`Search: ${query}`, `${header}<main><h1>${found.length} results</h1>${found.length ? cards(found) : '<p>Nothing matches.</p>'}</main>`)
}

const item = (id: number) => {
  const product = products.find(each => each.id === id)
  if (!product) return undefined
  return layout(
    product.name,
    `${header}<main><h1>${product.name}</h1><p style="font-size:28px">$${product.price}</p><p>Made to last, easy to clean and covered by our two-year guarantee.</p><button type="button">Add to cart</button></main>`,
  )
}

export const shop: LocalTask = {
  id: 'shop',
  set: 'browser',
  place: 'local',
  kind: 'basic',
  prompt: site => `In the shop at ${site}/shop/, find the product "Copper Kettle 1.7L", open its product page, and reply with its price.`,
  check: seen => all(tabAt(seen, new RegExp(`/shop/item/${wanted.id}$`)), answered(seen, wanted.price)),
  page(path, query) {
    if (path === '/') return home()
    if (path === '/all') return allPage(Number(query.get('page') ?? 1))
    if (path === '/search') return search(query.get('q') ?? '')
    const match = path.match(/^\/item\/(\d+)$/)
    return match ? item(Number(match[1])) : undefined
  },
}
