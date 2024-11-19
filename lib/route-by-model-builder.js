import path from 'path'
import serveRoute from './serve-route.js'

async function routeByModelBuilder ({ file, ctx, dir, pathPrefix, ns, parent }) {
  const { getPlugin } = this.app.bajo
  getPlugin('dobo') // ensure dobo is loaded
  const { readConfig, parseObject, isSet } = this.app.bajo
  const { methodMap, getParams } = this.app.waibuDb
  const { getInfo } = this.app.dobo
  const { camelCase, omit, merge, keys } = this.app.bajo.lib._
  const builder = await readConfig(file, { ns, ignoreError: true })
  const { schema } = getInfo(builder.model)
  const url = path.dirname(file).replace(`${dir}/${pathPrefix}`, '').replaceAll('@', ':')
  const methods = keys(methodMap)
  if (this.config.enablePatch) methods.push('replace')
  const me = this
  const mods = []
  for (const method of methods) {
    let disabled = schema.disabled.includes(method) || (builder.disabled ?? []).includes(method)
    if (method === 'replace' && (schema.disabled.includes('update') || (builder.disabled ?? []).includes('update'))) disabled = true
    if (disabled) continue
    const mod = omit(builder, ['model', 'url', 'method', 'handler', 'hidden', ...methods])
    const customMod = builder[method] ?? {}
    if (!customMod.schema) customMod.schema = await this.docSchemaModel({ model: builder.model, method, ctx, options: { hidden: builder.hidden } })
    let mapmethod = methodMap[method]
    if (this.config.enablePatch) {
      if (method === 'replace') mapmethod = 'PUT'
      else if (method === 'update') mapmethod = 'PATCH'
    }
    merge(mod, customMod, {
      url: ['get', 'update', 'replace', 'remove'].includes(method) ? `${url}/:id` : url,
      method: mapmethod,
      handler: async function (req, reply) {
        const helper = me.app.waibuDb[camelCase(`record ${method === 'replace' ? 'update' : method}`)]
        let { fields, count } = getParams(req)
        let rels = []
        const headers = parseObject(req.headers, { parseValue: true })
        if (isSet(headers['x-count'])) count = headers['x-count']
        if (isSet(headers['x-rels'])) rels = headers['x-rels']
        if (typeof rels === 'string' && !['*', 'all'].includes(rels)) rels = [rels]
        const options = { fields, count, rels }
        options.hidden = builder.hidden ?? []
        options.queryHandler = builder.queryHandler
        if (method === 'replace') options.partial = false
        const data = await helper({ model: builder.model, req, reply, ctx: this, options })
        data.success = true
        data.statusCode = method === 'create' ? 201 : 200
        if (method === 'find') options.forFind = true
        return me.transformResult({ data, req, reply, options })
      }
    })
    if (builder.schema === false) delete mod.schema
    mod.config = mod.config ?? {}
    mod.config.pathSrc = url
    mods.push(await serveRoute.call(me, { mod, ns, parent }))
  }
  return mods
}

export default routeByModelBuilder
