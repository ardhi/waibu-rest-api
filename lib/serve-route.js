async function serveRoute ({ mod, ns, parent }) {
  const { defaultsDeep, importModule } = this.app.bajo
  const { pick } = this.app.bajo.lib._
  const mergeRouteHooks = await importModule('waibu:/lib/webapp-scope/merge-route-hooks.js')
  const cfgWeb = this.app.waibu.config
  mod.config = mod.config ?? {}
  mod.config.engine = this.name
  mod.config.ns = parent ?? ns
  mod.config.title = mod.title
  if (parent) mod.config.subRouteOf = ns
  delete mod.title
  if (mod.method === 'PUT' && cfgWeb.dbModel.patchEnabled) mod.method = [mod.method, 'PATCH']
  mod = defaultsDeep(pick(this.config, ['exposeHeadRoute', 'bodyLimit']), mod)
  await mergeRouteHooks.call(this, mod, false) // Don't include handler, hence 'false'
  return mod
}

export default serveRoute
