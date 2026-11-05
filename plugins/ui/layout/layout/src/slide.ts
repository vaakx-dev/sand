import { settleMs, type Drawer, type Phone } from './phone'

const easing = 'cubic-bezier(.2,.8,.2,1)'

const offsets: Record<Drawer, (px: number) => string> = {
  side: px => `calc(-100% + ${px}px)`,
  aside: px => `calc(100% - ${px}px)`,
}

const timing = (property: string, phone: Phone) => ({ transition: phone.kind === 'settle' ? `${property} ${settleMs}ms ${easing}` : 'none' })

export const slide = (phone: Phone, drawer: Drawer) =>
  phone.kind !== 'rest' && phone.drawer === drawer ? { transform: `translateX(${offsets[drawer](phone.px)})`, ...timing('transform', phone) } : null

export const backdropOpacity = (phone: Phone) =>
  phone.kind !== 'rest' && phone.drawer === 'side' ? { opacity: String(phone.px / phone.reach), ...timing('opacity', phone) } : null
