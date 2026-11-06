export interface Recorded {
  method: string
  path: string
  host: string
  headers: Record<string, string>
  body: string
}

interface Options {
  schedule?: boolean
  syncCollection?: boolean
}

export const user = { username: 'me@example.com', password: 'abcd-efgh-ijkl-mnop' }

const home = '/123/calendars/'
const work = `${home}work/`

const zone = ['BEGIN:VCALENDAR', 'BEGIN:VTIMEZONE', 'TZID:Europe/Berlin', 'END:VTIMEZONE', 'END:VCALENDAR'].join('&#13;\n')

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const multistatus = (body: string) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<multistatus xmlns="DAV:">${body}</multistatus>`, {
    status: 207,
    headers: { 'content-type': 'text/xml; charset="utf-8"' },
  })

const found = (href: string, props: string, missing = '') =>
  `<response><href>${href}</href><propstat><prop>${props}</prop><status>HTTP/1.1 200 OK</status></propstat>${
    missing && `<propstat><prop>${missing}</prop><status>HTTP/1.1 404 Not Found</status></propstat>`
  }</response>`

const forbidden = (condition: string) =>
  new Response(`<?xml version="1.0" encoding="utf-8"?><D:error xmlns:D="DAV:"><D:${condition}/></D:error>`, { status: 403, headers: { 'content-type': 'application/xml' } })

export const fakeCaldav = ({ schedule = true, syncCollection = true }: Options = {}) => {
  const resources = new Map<string, { ics: string; etag: string }>()
  const changes: { version: number; name: string }[] = []
  const requests: Recorded[] = []
  let version = 1
  let floor = 0

  const change = (name: string, ics?: string) => {
    version += 1
    if (ics === undefined) resources.delete(name)
    else resources.set(name, { ics, etag: `"e${version}"` })
    changes.push({ version, name })
    return resources.get(name)?.etag
  }

  const tag = () => (syncCollection ? `<sync-token>http://example.com/sync/${version}</sync-token>` : '')

  const calendars = () =>
    [
      found(home, '<resourcetype><collection/></resourcetype><displayname>me</displayname>'),
      found(
        work,
        [
          '<resourcetype><collection/><C:calendar xmlns:C="urn:ietf:params:xml:ns:caldav"/></resourcetype>',
          '<displayname>Work</displayname>',
          '<calendar-color xmlns="http://apple.com/ns/ical/" symbolic-color="red">#FF2D55FF</calendar-color>',
          `<calendar-timezone xmlns="urn:ietf:params:xml:ns:caldav">${zone}</calendar-timezone>`,
          '<supported-calendar-component-set xmlns="urn:ietf:params:xml:ns:caldav"><comp name="VEVENT"/></supported-calendar-component-set>',
          '<current-user-privilege-set><privilege><read/></privilege><privilege><write/></privilege></current-user-privilege-set>',
          tag(),
          `<getctag xmlns="http://calendarserver.org/ns/">ctag-${version}</getctag>`,
        ].join(''),
        syncCollection ? '' : '<sync-token/>',
      ),
      found(
        `${home}birthdays/`,
        [
          '<resourcetype><collection/><calendar xmlns="urn:ietf:params:xml:ns:caldav"/></resourcetype>',
          '<displayname>Birthdays</displayname>',
          '<supported-calendar-component-set xmlns="urn:ietf:params:xml:ns:caldav"><comp name="VEVENT"/></supported-calendar-component-set>',
          '<current-user-privilege-set><privilege><read/></privilege></current-user-privilege-set>',
        ].join(''),
      ),
      found(
        `${home}tasks/`,
        '<resourcetype><collection/><calendar xmlns="urn:ietf:params:xml:ns:caldav"/></resourcetype><displayname>Reminders</displayname><supported-calendar-component-set xmlns="urn:ietf:params:xml:ns:caldav"><comp name="VTODO"/></supported-calendar-component-set>',
      ),
      found(`${home}inbox/`, '<resourcetype><collection/><schedule-inbox xmlns="urn:ietf:params:xml:ns:caldav"/></resourcetype>'),
    ].join('')

  const etagOf = (name: string) => `<getetag>${resources.get(name)!.etag}</getetag>`

  const report = (body: string) => {
    if (body.includes('sync-collection')) {
      if (!syncCollection) return forbidden('supported-report')
      const since = Number(/<d:sync-token>(?:http:\/\/example\.com\/sync\/(\d+))?<\/d:sync-token>/.exec(body)?.[1] ?? 0)
      if (since && since < floor) return forbidden('valid-sync-token')
      const names = new Set(since ? changes.filter(one => one.version > since).map(one => one.name) : resources.keys())
      const listed = [...names].map(name =>
        resources.has(name) ? found(`${work}${name}`, etagOf(name)) : `<response><href>${work}${name}</href><status>HTTP/1.1 404 Not Found</status></response>`,
      )
      return multistatus(`${listed.join('')}<sync-token>http://example.com/sync/${version}</sync-token>`)
    }
    if (body.includes('calendar-multiget')) {
      const names = [...body.matchAll(/<d:href>[^<]*\/([^/<]+)<\/d:href>/g)].map(match => decodeURIComponent(match[1]!))
      return multistatus(
        names
          .filter(name => resources.has(name))
          .map(name => found(`${work}${name}`, `${etagOf(name)}<C:calendar-data xmlns:C="urn:ietf:params:xml:ns:caldav">${escape(resources.get(name)!.ics)}</C:calendar-data>`))
          .join(''),
      )
    }
    return multistatus([...resources.keys()].map(name => found(`${work}${name}`, etagOf(name))).join(''))
  }

  const resource = (request: Request, name: string, body: string) => {
    const current = resources.get(name)
    const match = request.headers.get('if-match')
    if (request.method === 'GET') return current ? new Response(current.ics, { headers: { etag: current.etag, 'content-type': 'text/calendar' } }) : new Response(null, { status: 404 })
    if ((request.headers.get('if-none-match') === '*' && current) || (match && match !== current?.etag)) return new Response(null, { status: 412 })
    if (request.method === 'DELETE') {
      if (!current) return new Response(null, { status: 404 })
      change(name)
      return new Response(null, { status: 204 })
    }
    return new Response(null, { status: current ? 204 : 201, headers: { etag: change(name, body)! } })
  }

  const authorized = (request: Request) => request.headers.get('authorization') === `Basic ${btoa(`${user.username}:${user.password}`)}`

  const record = async (request: Request) => {
    const url = new URL(request.url)
    const body = await request.text()
    requests.push({ method: request.method, path: url.pathname, host: url.host, headers: Object.fromEntries(request.headers), body })
    return { url, body }
  }

  const partition = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const { url, body } = await record(request)
      if (!authorized(request)) return new Response('Unauthorized', { status: 401 })
      if (request.method === 'OPTIONS')
        return new Response(null, { headers: { dav: `1, 3, access-control, calendar-access${schedule ? ', calendar-auto-schedule' : ''}, extended-mkcol` } })
      if (request.method === 'PROPFIND' && url.pathname === home) return multistatus(calendars())
      if (request.method === 'REPORT') return url.pathname === work ? report(body) : multistatus('')
      if (url.pathname.startsWith(work)) return resource(request, decodeURIComponent(url.pathname.slice(work.length)), body)
      return new Response(null, { status: 404 })
    },
  })

  const front = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const { url } = await record(request)
      if (!authorized(request)) return new Response('Unauthorized', { status: 401 })
      if (url.pathname === '/.well-known/caldav') return new Response(null, { status: 301, headers: { location: '/' } })
      if (url.pathname === '/') return multistatus(found('/', '<current-user-principal><href>/123/principal/</href></current-user-principal>'))
      if (url.pathname === '/123/principal/')
        return multistatus(
          found(
            '/123/principal/',
            `<calendar-home-set xmlns="urn:ietf:params:xml:ns:caldav"><href xmlns="DAV:">${partition.url.origin}${home}</href></calendar-home-set>` +
              '<calendar-user-address-set xmlns="urn:ietf:params:xml:ns:caldav"><href xmlns="DAV:">urn:uuid:123</href><href xmlns="DAV:">mailto:Me@Example.com</href><href xmlns="DAV:">/123/principal/</href></calendar-user-address-set>',
          ),
        )
      return new Response(null, { status: 404 })
    },
  })

  return {
    url: front.url.origin,
    partition: partition.url.host,
    requests,
    put: (name: string, ics: string) => change(name, ics),
    remove: (name: string) => change(name),
    ics: (name: string) => resources.get(name)?.ics,
    names: () => [...resources.keys()],
    expire: () => {
      floor = version + 1
    },
    stop: () => {
      void front.stop(true)
      void partition.stop(true)
    },
  }
}

export type FakeCaldav = ReturnType<typeof fakeCaldav>
