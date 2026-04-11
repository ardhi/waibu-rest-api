import path from 'path'
import serveRoute from './serve-route.js'
import { extractHeaders } from './route-by-model-builder.js'

async function routeByVerb ({ file, appCtx, dir, pathPrefix, ns, alias, parent }) {
  const { importModule } = this.app.bajo
  const { methodMap, getParams } = this.app.waibuDb
  const { isFunction, merge } = this.app.lib._
  const me = this
  const url = path.dirname(file).replace(`${dir}/extend/${pathPrefix}`, '')
    .replaceAll('@@', '*').replaceAll('@', ':')
  const action = path.basename(file, '.js')
  let method = methodMap[action]
  if (this.enablePatch) {
    if (action === 'update') method = 'PATCH'
    else if (action === 'replace') method = 'PUT'
  }
  let mod = await importModule(file)
  if (isFunction(mod)) {
    if (mod.length <= 1) mod = await mod.call(this)
    else mod = { handler: mod }
  }
  mod.url = mod.url ?? url
  if (isFunction(mod.url)) mod.url = await mod.url.call(this)
  mod.method = method
  const defSchema = {
    description: this.docSchemaDescription(action),
    tags: [alias.toUpperCase()],
    response: {}
  }
  if (['create', 'update', 'replace'].includes(action)) {
    defSchema.response['4xx'] = {
      description: this.t('docErrorResponse'),
      $ref: '4xxResp#'
    }
  }
  defSchema.response['5xx'] = {
    description: this.t('generalErrorResponse'),
    $ref: '5xxResp#'
  }
  if (action === 'find') defSchema.querystring = { $ref: 'qsFilter#' }
  if (isFunction(mod.schema)) mod.schema = await mod.schema.call(this, appCtx)
  mod.schema = merge({}, defSchema, mod.schema ?? {})
  const oldHandler = mod.handler
  mod.handler = async function (req, reply) {
    const { fields } = getParams(req)
    const options = { fields, dynHooks: mod.hooks ?? [] }
    extractHeaders.call(me, req, options)
    if (method === 'find') options.forFind = true
    if (method === 'replace') options.partial = false
    const data = await oldHandler.call(me.app[ns], req, reply, options, this)
    if (!data) return
    data.success = true
    data.statusCode = method === 'create' ? 201 : 200
    return me.transformResult({ data, req, reply, options })
  }
  if (mod.schema === false) delete mod.schema
  mod.config = mod.config ?? {}
  mod.config.pathSrc = url
  return serveRoute.call(me, { mod, ns, parent })
}

export default routeByVerb
