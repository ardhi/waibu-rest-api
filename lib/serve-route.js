async function serveRoute ({ mod, ns, parent }) {
  const { defaultsDeep } = this.app.bajo
  const { mergeRouteHooks } = this.app.waibu
  const { pick } = this.app.bajo.lib._
  const cfgWeb = this.app.waibu.config
  mod.config = mod.config ?? {}
  mod.config.webApp = this.name
  mod.config.ns = parent ?? ns
  mod.config.title = mod.title
  if (parent) mod.config.subRouteOf = ns
  delete mod.title
  if (mod.method === 'PUT' && cfgWeb.dbModel.patchEnabled) mod.method = [mod.method, 'PATCH']
  mod = defaultsDeep(pick(this.config, ['exposeHeadRoute', 'bodyLimit']), mod)
  await mergeRouteHooks(mod, false)
  return mod
}

export default serveRoute
