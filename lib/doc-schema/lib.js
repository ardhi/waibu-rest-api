async function docSchemaLib (name, obj) {
  const { merge } = this.app.lib._
  if (this.webAppCtx.getSchema(name)) return
  const value = merge({}, obj, { $id: name })
  this.webAppCtx.addSchema(value)
}

export default docSchemaLib
