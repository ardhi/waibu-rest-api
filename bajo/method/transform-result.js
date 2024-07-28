function reformat ({ data, req, reply, options = {} }) {
  const { forOwn, get } = this.app.bajo.lib._
  const newData = {}
  forOwn(data, (v, k) => {
    let key = get(this.config, `responseKey.${k}`, k)
    if (options.forFind && k === 'data') key = get(this.config, 'responseKey.data')
    newData[key] = v
  })
  return newData
}

function returnError ({ data, req, reply, options = {} }) {
  const { pascalCase } = this.app.bajo
  const { last, map, kebabCase, upperFirst, keys, each, get, isEmpty } = this.app.bajo.lib._
  const cfg = this.config
  const cfgWeb = this.app.waibu.config
  const errNames = kebabCase(data.constructor.name).split('-')
  if (last(errNames) === 'error') errNames.pop()
  data.error = this.print.write(map(errNames, s => upperFirst(s)).join(' '))
  data.success = false
  data.statusCode = data.statusCode ?? 500
  if (reply && cfgWeb.dbModel.dataOnly) {
    each(keys(data), k => {
      const key = get(cfg, `responseKey.${k}`, k)
      if (k === 'details' && !isEmpty(data[k])) data[k] = JSON.stringify(data[k])
      reply.header(`X-${pascalCase(this.alias)}-${pascalCase(key)}`, data[k])
    })
  }
  reply.code(data.statusCode)
  const result = cfgWeb.dbModel.dataOnly ? { error: data.message } : data
  return reformat.call(this, { data: result, req, reply, options })
}

function returnSuccess ({ data, req, reply, options = {} }) {
  const { pascalCase } = this.app.bajo
  const { each, keys, omit, get } = this.app.bajo.lib._
  const cfg = this.config
  const cfgWeb = this.app.waibu.config
  if (reply) {
    reply.code(req.method.toUpperCase() === 'POST' ? 201 : 200)
    if (cfgWeb.dbModel.dataOnly) {
      each(keys(omit(data, ['data'])), k => {
        const key = get(cfg, `responseKey.${k}`, k)
        reply.header(`X-${pascalCase(this.alias)}-${pascalCase(key)}`, data[k])
      })
      return data.data
    }
  }
  return reformat.call(this, { data, req, reply, options })
}

function transformResult ({ data, req, reply, options = {} }) {
  const isError = data instanceof Error
  if (isError) return returnError.call(this, { data, req, reply, options })
  return returnSuccess.call(this, { data, req, reply, options })
}

export default transformResult
