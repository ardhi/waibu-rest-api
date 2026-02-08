async function docSchemaQs (paramName, ...args) {
  const { each, isEmpty } = this.app.lib._
  const item = {
    type: 'object',
    properties: {}
  }
  each(args, a => {
    let [name, type, description] = a.split(':')
    if (isEmpty(type)) type = 'string'
    item.properties[name] = { type, description: this.t(description) }
  })
  if (!isEmpty(args)) await this.docSchemaLib(paramName, item)
}

export default docSchemaQs
