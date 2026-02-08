export function handler (req, reply) {
  const msg = this.t('routeNotFound%s%s', req.url, req.method)
  const data = this.webAppCtx.httpErrors.createError(404, msg)
  return this.transformResult({ data, req, reply })
}

async function notFound (err = {}, req, reply) {
  return handler.call(this, req, reply)
}

export default notFound
