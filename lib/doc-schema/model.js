function getType (input) {
  let type = 'string'
  if (['float', 'double'].includes(input)) type = 'number'
  if (['boolean'].includes(input)) type = 'boolean'
  if (['integer', 'smallint'].includes(input)) type = 'integer'
  if (['object'].includes(input)) type = 'object'
  if (['array'].includes(input)) type = 'array'
  return type
}

async function buildPropsReqs ({ model, method, options = {} }) {
  const properties = {}
  const required = []
  const refs = {}
  const hidden = [...model.hidden, ...(options.hidden ?? [])] ?? []
  for (const p of model.properties) {
    if (hidden.includes(p.name)) continue
    properties[p.name] = { type: getType(p.type) }
    if (properties[p.name].type === 'object') {
      properties[p.name].additionalProperties = true
    }
    if (!p.required) properties[p.name].nullable = true
    else if (method === 'create' && p.name !== 'id') required.push(p.name)
    if (['datetime'].includes(p.type)) properties[p.name].format = 'date-time'
    if (p.ref) {
      for (const key in p.ref) {
        const val = p.ref[key]
        if (val.fields.length === 0) continue
        const props = { type: 'object', properties: {} }
        const rModel = this.app.dobo.getModel(val.model)
        for (const f of val.fields) {
          const item = rModel.properties.find(s => s.name === f)
          props.properties[item.name] = { type: getType(item.type) }
        }
        if (Object.keys(props.properties).length > 0) {
          if (val.type === '1:n') {
            refs[key] = { type: 'array', items: props }
          } else if (val.type === '1:1') {
            refs[key] = props
          }
        }
      }
    }
  }
  if (Object.keys(refs).length > 0) properties._ref = { type: 'object', properties: refs }
  return { properties, required }
}

async function buildResponse ({ model, method, options }) {
  const { merge, cloneDeep } = this.app.lib._
  const { transformResult } = this.app.waibuRestApi
  const cfgWdb = this.app.waibuDb.config
  const { properties } = await buildPropsReqs.call(this, { model, method, options })

  async function buildData (keys) {
    const data = {}
    for (const k of keys) {
      const name = 'model' + model.name
      const props = cloneDeep(properties)
      await this.docSchemaLib(name, {
        type: 'object',
        properties: props
      })
      data[k] = { $ref: name + '#' }
    }
    return data
  }

  const result = {
    '2xx': {
      description: this.t('successfulResponse'),
      type: 'object'
    }
  }
  if (['create', 'update', 'replace'].includes(method)) {
    result['4xx'] = {
      description: this.t('docErrorResponse'),
      $ref: '4xxResp#'
    }
  }
  result['5xx'] = {
    description: this.t('generalErrorResponse'),
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
      data: await this.docSchemaForFind({ type: 'object', properties }),
      options: { forFind: true }
    })
  }
  return result
}

async function docSchemaModel ({ model, method, options = {} }) {
  const mdl = this.app.dobo.getModel(model)
  const { omit } = this.app.lib._
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
    const { properties } = await buildPropsReqs.call(this, { model: mdl, method, options })
    const name = 'model' + mdl.name + 'Update'
    delete properties._rel
    await this.docSchemaLib(name, {
      type: 'object',
      properties: omit(properties, ['id'])
    })
    out.body = { $ref: name + '#' }
  }
  if (['replace'].includes(method)) {
    const { properties, required } = await buildPropsReqs.call(this, { model: mdl, method, options })
    const name = 'model' + model.name + 'Replace'
    delete properties._rel
    await this.docSchemaLib(name, {
      type: 'object',
      properties: omit(properties, ['id']),
      required
    })
    out.body = { $ref: name + '#' }
  }
  if (['create'].includes(method)) {
    const { properties, required } = await buildPropsReqs.call(this, { model: mdl, method, options })
    const name = 'model' + model.name + 'Create'
    delete properties._rel
    await this.docSchemaLib(name, {
      type: 'object',
      properties,
      required
    })
    out.body = { $ref: name + '#' }
    out.querystring = { $ref: 'qsFields#' }
  }
  out.response = await buildResponse.call(this, { model: mdl, method, options })
  return out
}

export default docSchemaModel
