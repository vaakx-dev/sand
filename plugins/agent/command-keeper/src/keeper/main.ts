import { placeOf } from '../wire'
import { Server } from './server'

const home = process.argv[2]
if (!home) throw new Error('the keeper of background commands needs the sand home it serves')

await new Server(placeOf(home), () => process.exit(0)).listen()
process.stdout.write('ready\n')
