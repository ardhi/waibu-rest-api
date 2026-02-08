import { handler } from './not-found.js'

const extHandler = async function (err, req, reply) {
  err.statusCode = err.statusCode ?? 500
  const msg = err.message
  if (msg === '_notFound' || err.statusCode === 404) {
    return handler.call(this, req, reply)
  }
  const data = this.webAppCtx.httpErrors.createError(err.statusCode, msg)
  data.statusCode = err.statusCode
  data.details = err.details
  return this.transformResult({ data, req, reply })
}

async function error (err, req, reply) {
  return await extHandler.call(this, err, req, reply)
}

export default error
