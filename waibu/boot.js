import path from 'path'
import decorate from '../lib/decorate.js'
import routeByModelBuilder from '../lib/route-by-model-builder.js'
import routeByVerb from '../lib/route-by-verb.js'
import notFound from '../lib/not-found.js'
import error from '../lib/error.js'
import subApp from '../lib/sub-app.js'
import handleResponse from '../lib/handle-response.js'

const routeActions = { routeByModelBuilder, routeByVerb }

function formatExt (item) {
  return item + '.:format'
}

const boot = {
  level: 10,
  handler: async function () {
    const { importPkg, eachPlugins, importModule, runHook } = this.app.bajo
    const { fastGlob } = this.app.bajo.lib
    const [bodyParser, accepts] = await importPkg('waibu:@fastify/formbody', 'waibu:@fastify/accepts')
    const cfg = this.config
    const pathPrefix = `${this.name}/route`
    let prefix = cfg.prefix === '' ? '' : ('/' + cfg.prefix)
    if (cfg.i18n.detectors.includes('path')) prefix = `/:lang${prefix}`
    const routeHook = await importModule('waibu:/lib/webapp-scope/route-hook.js')
    const handleMultipart = await importModule('waibu:/lib/webapp-scope/handle-multipart-body.js')
    const handleXmlBody = await importModule('waibu:/lib/handle-xml-body.js')
    const handleCors = await importModule('waibu:/lib/webapp-scope/handle-cors.js')
    const handleHelmet = await importModule('waibu:/lib/webapp-scope/handle-helmet.js')
    const handleCompress = await importModule('waibu:/lib/webapp-scope/handle-compress.js')
    const handleRateLimit = await importModule('waibu:/lib/webapp-scope/handle-rate-limit.js')
    const reroutedPath = await importModule('waibu:/lib/webapp-scope/rerouted-path.js')
    const me = this
    await this.app.waibu.instance.register(async (ctx) => {
      this.instance = ctx
      await runHook(`${this.name}:afterCreateContext`, ctx)
      await routeHook.call(this, this.name)
      await decorate.call(this, ctx)
      if (cfg.format.supported.includes('xml')) {
        await handleXmlBody.call(this, ctx, cfg.format.xml.bodyParser)
      }
      await ctx.register(accepts)
      await ctx.register(bodyParser)
      await handleRateLimit.call(this, ctx, cfg.rateLimit)
      await handleCors.call(this, ctx, cfg.cors)
      await handleHelmet.call(this, ctx, cfg.helmet)
      await handleMultipart.call(this, ctx, cfg.multipart)
      await handleCompress.call(this, ctx, cfg.compress)
      await handleResponse.call(this, ctx)
      await error.call(this, ctx)
      await runHook(`${this.name}:beforeCreateRoutes`, ctx)
      const actions = ['find', 'get', 'create', 'update', 'remove']
      if (cfg.enablePatch) actions.push('replace')
      await eachPlugins(async function ({ dir, alias, ns }) {
        const appPrefix = '/' + (ns === this.app.bajo.mainNs && cfg.mountAppAsRoot ? '' : alias)
        const pattern = [
          `${dir}/${pathPrefix}/**/{${actions.join(',')}}.js`,
          `${dir}/${pathPrefix}/**/model-builder.*`
        ]
        const files = await fastGlob(pattern)
        if (files.length === 0) return undefined
        await ctx.register(async (appCtx) => {
          for (const file of files) {
            const base = path.basename(file, path.extname(file))
            const action = base === 'model-builder' ? 'routeByModelBuilder' : 'routeByVerb'
            let mods = await routeActions[action].call(me, { file, appCtx, ctx, dir, pathPrefix, ns, alias })
            if (!Array.isArray(mods)) mods = [mods]
            for (const mod of mods) {
              const fullPath = appPrefix === '/' ? mod.url : (appPrefix + mod.url)
              const isRouteDisabled = await importModule('waibu:/lib/webapp-scope/is-route-disabled.js')
              if (await isRouteDisabled.call(this, fullPath, mod.method, cfg.disabled)) {
                this.log.warn('Route %s (%s) is disabled', `${prefix}${fullPath}`, mod.method)
                continue
              }
              const rpath = await reroutedPath.call(this, fullPath, cfg.rerouted)
              if (cfg.format.asExt) mod.url = formatExt(mod.url)
              if (rpath) {
                mod.config.pathReroutedTo = rpath
                this.log.warn('Rerouted %s -> %s', `${prefix}${fullPath}`, `${prefix}${rpath}`)
                mod.url = cfg.format.asExt ? formatExt(rpath) : rpath
                await ctx.route(mod)
              } else await appCtx.route(mod)
            }
          }
        }, { prefix: appPrefix })
      })
      await runHook(`${this.name}:afterCreateRoutes`, ctx)
      await subApp.call(this, ctx)
      await notFound.call(this, ctx)
    }, { prefix })
  }
}

export default boot