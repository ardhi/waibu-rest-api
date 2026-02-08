async function docSchemaParams (paramName, ...args) {
  const { each, isEmpty, keys, last, isBoolean } = this.app.lib._
  const cfgWeb = this.app.waibu.getConfig()
  let transform = false
  if (isBoolean(last(args))) {
    transform = args.pop()
  }
  const item = {
    type: 'object',
    properties: {}
  }
  each(args, a => {
    let [name, type, description, def] = a.split('|')
    if (isEmpty(type)) type = 'string'
    item.properties[name] = { type, description: this.t(description), default: def }
  })
  if (transform) {
    each(keys(cfgWeb.qsKey), k => {
      const v = cfgWeb.qsKey[k]
      if (k === v || !item.properties[k]) return undefined
      item.properties[v] = item.properties[k]
      delete item.properties[k]
    })
  }
  if (!isEmpty(args)) await this.docSchemaLib(paramName, item)
}

export default docSchemaParams
