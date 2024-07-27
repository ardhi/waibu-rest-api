export function handler (ctx, req, reply) {
  const msg = this.print.write('Route \'%s (%s)\' not found', req.url, req.method)
  const data = ctx.httpErrors.createError(404, msg)
  return this.transformResult({ data, req, reply })
}

async function notFound (ctx) {
  const me = this
  await ctx.setNotFoundHandler(async function (req, reply) {
    return handler.call(me, ctx, req, reply)
  })
}

export default notFound
