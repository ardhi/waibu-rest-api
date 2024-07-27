import path from 'path'
import serveRoute from './serve-route.js'

async function routeByCollBuilder ({ file, ctx, dir, pathPrefix, ns }) {
  const { getPlugin } = this.app.bajo
  getPlugin('bajoDb') // ensure bajoDb is loaded
  const { readConfig, parseObject, isSet } = this.app.bajo
  const { methodMap, getParams } = this.app.wakatobi
  const { getInfo } = this.app.bajoDb
  const { camelCase, omit, merge, keys } = this.app.bajo.lib._
  const builder = await readConfig(file, { ns, ignoreError: true })
  const { schema } = getInfo(builder.coll)
  const url = path.dirname(file).replace(`${dir}/${pathPrefix}`, '').replaceAll('@', ':')
  const methods = keys(methodMap)
  if (this.config.enablePatch) methods.push('replace')
  const me = this
  const mods = []
  const swagger = this.app.wakatobiSwagger
  for (const method of methods) {
    let disabled = schema.disabled.includes(method) || (builder.disabled ?? []).includes(method)
    if (method === 'replace' && (schema.disabled.includes('update') || (builder.disabled ?? []).includes('update'))) disabled = true
    if (disabled) continue
    const mod = omit(builder, ['coll', 'url', 'method', 'handler', 'hidden', ...methods])
    const customMod = builder[method] ?? {}
    if (!customMod.schema && swagger) customMod.schema = await swagger.docSchemaColl({ coll: builder.coll, method, ctx, options: { hidden: builder.hidden } })
    let mapmethod = methodMap[method]
    if (this.config.enablePatch) {
      if (method === 'replace') mapmethod = 'PUT'
      else if (method === 'update') mapmethod = 'PATCH'
    }
    merge(mod, customMod, {
      url: ['get', 'update', 'replace', 'remove'].includes(method) ? `${url}/:id` : url,
      method: mapmethod,
      handler: async function (req, reply) {
        const helper = me.app.wakatobi[camelCase(`record ${method === 'replace' ? 'update' : method}`)]
        let { fields, count } = getParams(req)
        let rels = []
        const headers = parseObject(req.headers, true, true)
        if (isSet(headers['x-count'])) count = headers['x-count']
        if (isSet(headers['x-rels'])) rels = headers['x-rels']
        if (typeof rels === 'string' && !['*', 'all'].includes(rels)) rels = [rels]
        const options = { fields, count, rels }
        options.hidden = builder.hidden ?? []
        if (method === 'replace') options.partial = false
        const data = await helper({ coll: builder.coll, req, reply, ctx: this, options })
        data.success = true
        data.statusCode = method === 'create' ? 201 : 200
        if (method === 'find') options.forFind = true
        return me.transformResult({ data, req, reply, options })
      }
    })
    if (builder.schema === false) delete mod.schema
    mod.config = mod.config ?? {}
    mod.config.pathSrc = url
    mods.push(await serveRoute.call(me, { mod, ns }))
  }
  return mods
}

export default routeByCollBuilder
