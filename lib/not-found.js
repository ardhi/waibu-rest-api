export function handler (req, reply, ctx) {
  const msg = this.print.write('routeNotFound%s%s', req.url, req.method)
  const data = ctx.httpErrors.createError(404, msg)
  return this.transformResult({ data, req, reply })
}

async function notFound (ctx) {
  const me = this
  await ctx.setNotFoundHandler(async function (req, reply) {
    return handler.call(me, req, reply, ctx)
  })
}

export default notFound
