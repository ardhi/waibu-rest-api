export function handler (req, reply) {
  const msg = this.t('routeNotFound%s%s', req.url, req.method)
  const data = this.webAppCtx.httpErrors.createError(404, msg)
  return this.transformResult({ data, req, reply })
}

async function notFound () {
  const me = this
  await this.webAppCtx.setNotFoundHandler(async function (req, reply) {
    return handler.call(me, req, reply)
  })
}

export default notFound
