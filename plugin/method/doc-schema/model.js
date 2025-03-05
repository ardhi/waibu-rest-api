function getType (input) {
  let type = 'string'
  if (['float', 'double'].includes(input)) type = 'number'
  if (['boolean'].includes(input)) type = 'boolean'
  if (['integer', 'smallint'].includes(input)) type = 'integer'
  if (['object'].includes(input)) type = 'object'
  if (['array'].includes(input)) type = 'array'
  return type
}

async function buildPropsReqs ({ schema, method, options = {} }) {
  const { getSchema } = this.app.dobo
  const properties = {}
  const required = []
  const rels = {}
  const hidden = [...schema.hidden, ...(options.hidden ?? [])] ?? []
  for (const p of schema.properties) {
    if (hidden.includes(p.name)) continue
    properties[p.name] = { type: getType(p.type) }
    if (!p.required) properties[p.name].nullable = true
    else if (method === 'create' && p.name !== 'id') required.push(p.name)
    if (['datetime'].includes(p.type)) properties[p.name].format = 'date-time'
    if (p.rel) {
      for (const key in p.rel) {
        const val = p.rel[key]
        if (val.fields.length === 0) continue
        const props = { type: 'object', properties: {} }
        const relschema = getSchema(val.schema)
        for (const f of val.fields) {
          const item = relschema.properties.find(s => s.name === f)
          props.properties[item.name] = { type: getType(item.type) }
        }
        if (Object.keys(props.properties).length > 0) {
          if (val.type === 'one-to-many') {
            rels[key] = { type: 'array', items: props }
          } else if (val.type === 'one-to-one') {
            rels[key] = props
          }
        }
      }
    }
  }
  if (Object.keys(rels).length > 0) properties._rel = { type: 'object', properties: rels }
  return { properties, required }
}

async function buildResponse ({ ctx, schema, method, options }) {
  const { merge, cloneDeep } = this.app.bajo.lib._
  const { transformResult } = this.app.waibuRestApi
  const cfgWdb = this.app.waibuDb.config
  const { properties } = await buildPropsReqs.call(this, { schema, method, options })

  async function buildData (keys) {
    const data = {}
    for (const k of keys) {
      const name = 'model' + schema.name
      const props = cloneDeep(properties)
      await this.docSchemaLib(ctx, name, {
        type: 'object',
        properties: props
      })
      data[k] = { $ref: name + '#' }
    }
    return data
  }

  const result = {
    '2xx': {
      description: this.print.write('successfulResponse'),
      type: 'object'
    }
  }
  if (['create', 'update', 'replace'].includes(method)) {
    result['4xx'] = {
      description: this.print.write('docErrorResponse'),
      $ref: '4xxResp#'
    }
  }
  result['5xx'] = {
    description: this.print.write('generalErrorResponse'),
    $ref: '5xxResp#'
  }
  if (cfgWdb.dbModel.dataOnly) {
    if (method === 'find') {
      result['2xx'] = {
        type: 'array',
        items: (await buildData.call(this, ['data'])).data
      }
    } else if (method === 'get') result['2xx'] = (await buildData.call(this, ['data'])).data
    else result['2xx'] = (await buildData.call(this, ['data'], true)).data
    return result
  }
  const success = { type: 'boolean', default: true }
  const statusCode = { type: 'integer', default: 200 }
  if (method === 'get') {
    result['2xx'].properties = transformResult({ data: merge({}, await buildData.call(this, ['data']), { success, statusCode }) })
  } else if (method === 'create') {
    statusCode.default = 201
    result['2xx'].properties = transformResult({ data: merge({}, await buildData.call(this, ['data']), { success, statusCode }) })
  } else if (['update', 'replace'].includes(method)) {
    result['2xx'].properties = transformResult({ data: merge({}, await buildData.call(this, ['data', 'oldData']), { success, statusCode }) })
  } else if (method === 'remove') {
    result['2xx'].properties = transformResult({ data: merge({}, await buildData.call(this, ['oldData']), { success, statusCode }) })
  } else if (method === 'find') {
    result['2xx'].properties = transformResult({
      data: await this.docSchemaForFind(ctx, { type: 'object', properties }),
      options: { forFind: true }
    })
  }
  return result
}

async function docSchemaModel ({ model, method, ctx, options = {} }) {
  const { getInfo } = this.app.dobo
  const { schema } = getInfo(model)
  const { omit } = this.app.bajo.lib._
  const out = {
    description: options.description ?? this.docSchemaDescription(method),
    tags: [this.alias.toUpperCase(), ...(options.alias ?? [])]
  }
  if (['find'].includes(method)) {
    out.querystring = { $ref: 'qsFilter#' }
  }
  if (['get', 'update', 'replace', 'remove'].includes(method)) {
    out.querystring = { $ref: 'qsFields#' }
    if (!options.noId) out.params = { $ref: 'paramsId#' }
  }
  if (['update'].includes(method)) {
    const { properties } = await buildPropsReqs.call(this, { schema, method, options })
    const name = 'model' + schema.name + 'Update'
    delete properties._rel
    await this.docSchemaLib(ctx, name, {
      type: 'object',
      properties: omit(properties, ['id'])
    })
    out.body = { $ref: name + '#' }
  }
  if (['replace'].includes(method)) {
    const { properties, required } = await buildPropsReqs.call(this, { schema, method, options })
    const name = 'model' + schema.name + 'Replace'
    delete properties._rel
    await this.docSchemaLib(ctx, name, {
      type: 'object',
      properties: omit(properties, ['id']),
      required
    })
    out.body = { $ref: name + '#' }
  }
  if (['create'].includes(method)) {
    const { properties, required } = await buildPropsReqs.call(this, { schema, method, options })
    const name = 'model' + schema.name + 'Create'
    delete properties._rel
    await this.docSchemaLib(ctx, name, {
      type: 'object',
      properties,
      required
    })
    out.body = { $ref: name + '#' }
    out.querystring = { $ref: 'qsFields#' }
  }
  out.response = await buildResponse.call(this, { ctx, schema, method, options })
  return out
}

export default docSchemaModel
