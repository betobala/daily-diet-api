import { env } from './env'
import { app } from './app'

const port = env.PORT
const host = 'RENDER' in process.env ? '0.0.0.0' : 'localhost'

app.listen({ host, port }).then(() => {
  console.log('HTTP Server Running')
})
