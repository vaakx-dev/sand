import { request, type, wireEvent } from '@sand/host-hub/contract'
import { lazy } from '@sand/util'
import { z } from 'zod'

interface LocationAsk {
  id: string
}

const fixSchema = lazy(() =>
  z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracyMeters: z.number().nonnegative(),
  }),
)

type Fix = z.output<ReturnType<typeof fixSchema>>

const locationAsk = wireEvent<LocationAsk>('location.ask')

const locationSettled = wireEvent<LocationAsk>('location.settled')

const locationAnswer = request('location.answer', { input: () => z.object({ id: z.string().min(1), fix: fixSchema() }), output: type<void>() })

const locationDeviceName = request('location.device.name', {
  input: () => z.object({ device: z.string().min(1) }),
  output: type<string | undefined>(),
  callers: 'runtime',
})

export { type Fix, locationAnswer, type LocationAsk, locationAsk, locationDeviceName, locationSettled }
