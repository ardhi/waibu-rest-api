async function buildErrResp (ctx) {
  const { cloneDeep, merge, each, get } = this.lib._
  const cfg = this.config
  const cfgWdb = this.app.waibuDb.config
  const def = {
    type: 'object',
    properties: {
      error: { type: 'string' },
      message: { type: 'string' }
    }
  }
  for (const type of ['4xx', '5xx']) {
    const item = cloneDeep(def)
    if (type === '4xx') {
      merge(item, {
        properties: {
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                error: { type: 'string' }
              }
            }
          },
          success: { type: 'boolean', default: false },
          statusCode: { type: 'integer', default: 400 }
        }
      })
    } else {
      merge(item, {
        properties: {
          success: { type: 'boolean', default: false },
          statusCode: { type: 'integer', default: 500 }
        }
      })
    }
    if (cfgWdb.dbModel.dataOnly) item.properties = { error: item.properties.message }
    const props = {}
    each(item.properties, (v, k) => {
      const key = get(cfg, `responseKey.${k}`, k)
      props[key] = item.properties[k]
    })
    item.properties = props
    await this.docSchemaLib(ctx, type + 'Resp', item)
  }
}

async function buildFilter (ctx) {
  await this.docSchemaParams(ctx, 'qsFilter',
    'query||NQL/Mongo Query. Leave empty to disable query',
    'limit|integer|Number of records per page. Must be >= 1|' + this.app.dobo.config.default.filter.limit,
    'page|integer|Desired page number. Must be >= 1|1',
    'sort||Order of records, format: &lt;field&gt;:&lt;dir&gt;[,&lt;field&gt;:&lt;dir&gt;,[...]]',
    'fields||Comma delimited fields to show. Leave empty to show all fields',
    true
  )
}

async function buildFields (ctx) {
  await this.docSchemaParams(ctx, 'qsFields',
    'fields||Comma delimited fields to show. Leave empty to show all fields',
    true
  )
}

async function buildParamsId (ctx) {
  await this.docSchemaParams(ctx, 'paramsId', 'id||Record ID')
}

async function docSchemaGeneral (ctx) {
  await buildErrResp.call(this, ctx)
  await buildFilter.call(this, ctx)
  await buildParamsId.call(this, ctx)
  await buildFields.call(this, ctx)
}

export default docSchemaGeneral
