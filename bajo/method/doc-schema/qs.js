async function buildParams (ctx, paramName, ...args) {
  const { each, isEmpty } = this.app.bajo.lib._
  const item = {
    type: 'object',
    properties: {}
  }
  each(args, a => {
    let [name, type, description] = a.split(':')
    if (isEmpty(type)) type = 'string'
    item.properties[name] = { type, description: this.print.write(description) }
  })
  if (!isEmpty(args)) await this.docSchemaLib(ctx, paramName, item)
}

export default buildParams
