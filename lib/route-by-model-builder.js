import path from 'path'
import serveRoute from './serve-route.js'

async function routeByModelBuilder ({ file, dir, pathPrefix, ns, parent }) {
  const { readConfig } = this.app.bajo
  const { parseObject } = this.app.lib
  const { isSet } = this.app.lib.aneka
  const { methodMap, getParams } = this.app.waibuDb
  const { isFunction, camelCase, omit, merge, keys, filter } = this.app.lib._
  const builder = await readConfig(file, { ns, ignoreError: true })
  builder.disabled = builder.disabled ?? []
  let url = path.dirname(file).replace(`${dir}/extend/${pathPrefix}`, '').replaceAll('@', ':')
  if (isFunction(builder.url)) url = await builder.url.call(this)
  const methods = keys(methodMap)
  if (this.config.enablePatch) methods.push('replace')
  const me = this
  const mods = []
  const model = this.app.dobo.getModel(builder.model)
  for (const method of methods) {
    let disabled = model.disabled.includes(method) || builder.disabled.includes(method)
    if (method === 'replace' && (model.disabled.includes('update') || (builder.disabled ?? []).includes('update'))) disabled = true
    if (disabled) continue
    const mod = omit(builder, ['model', 'url', 'method', 'handler', 'hidden', ...methods])
    const customMod = builder[method] ?? {}
    if (!customMod.schema) customMod.schema = await this.docSchemaModel({ model: builder.model, method, options: { hidden: builder.hidden } })
    let mapmethod = methodMap[method]
    if (this.config.enablePatch) {
      if (method === 'replace') mapmethod = 'PUT'
      else if (method === 'update') mapmethod = 'PATCH'
    }
    merge(mod, customMod, {
      url: ['get', 'update', 'replace', 'remove'].includes(method) ? `${url}/:id` : url,
      method: mapmethod,
      handler: async function (req, reply) {
        const helper = me.app.waibuDb[`${method === 'replace' ? 'update' : method}Record`]
        let { fields, count } = getParams(req)
        let refs = []
        const headers = parseObject(req.headers, { parseValue: true })
        if (isSet(headers['x-count'])) count = headers['x-count']
        if (isSet(headers['x-refs'])) refs = headers['x-refs']
        if (typeof refs === 'string' && !['*', 'all'].includes(refs)) refs = [refs]
        const options = { fields, count, refs, dynHooks: builder.hooks ?? [] }
        options.hidden = builder.hidden ?? []
        options.queryHandler = builder.queryHandler
        if (method === 'replace') options.partial = false
        if (['get', 'remove', 'update'].includes(method)) options.throwNotFound = true
        const data = await helper({ model: builder.model, req, reply, options })
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
  // stats
  const supported = ['aggregate', 'histogram']
  builder.stat = filter(builder.stat ?? supported, item => supported.includes(item))
  const method = 'GET'
  const disabled = model.disabled.includes(method) || builder.disabled.includes(method)
  if (disabled) return mods
  const mod = {
    schema: false,
    method,
    url: `${url}/stat/:stat`,
    handler: async function (req, reply) {
      if (!supported.includes(req.params.stat)) throw me.error('_notFound')
      const helper = me.app.waibuDb[camelCase(`create ${req.params.stat}`)]
      if (!helper) throw this.error('_notFound')
      const options = { queryHandler: builder.queryHandler }
      const data = await helper({ model: builder.model, req, reply, options })
      data.success = true
      data.statusCode = method === 'create' ? 201 : 200
      options.forFind = true
      return me.transformResult({ data, req, reply, options })
    }
  }
  mod.config = builder.config ?? {}
  mod.config.pathSrc = url
  mods.push(await serveRoute.call(me, { mod, ns, parent }))
  return mods
}

export default routeByModelBuilder
