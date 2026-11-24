import type { AppPlan, AppStatus, PlanApi, PlanLimits, Plans, ProviderCapabilities } from '@sand/accounts/contract'
import type { Binary } from './binary'

interface Place {
  id: string
  folder?: string
}

type Account = Omit<AppPlan, 'id' | 'label' | 'name' | 'detail' | 'logo' | 'app' | 'install' | 'family' | 'caps' | 'fixedTools' | 'another'>

interface Provider {
  id: string
  label: string
  name: string
  detail: string
  logo: string
  family?: PlanApi
  caps: ProviderCapabilities
  fixedTools?: boolean
  binary: Binary
  account(place: Place, report: (limits: PlanLimits) => void): Account
}

const NOT_INSTALLED: AppStatus = { installed: false, signedIn: false }

const appPlan = ({ id, binary, account, ...info }: Provider, plans: Plans): AppPlan => {
  const plan = (place: Place): AppPlan => {
    const opened = account(place, limits => plans.limits(place.id, limits))
    return {
      ...info,
      ...opened,
      id: place.id,
      app: binary.app,
      install: binary.install,
      status: async () => ((await binary.find()) ? opened.status() : NOT_INSTALLED),
      signOut: async () => {
        if (await binary.find()) await opened.signOut()
      },
    }
  }
  return { ...plan({ id }), another: plan }
}

export { appPlan, type Place, type Provider }
