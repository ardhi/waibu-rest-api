async function docSchemaLib (ctx, name, obj) {
  const { merge } = this.app.bajo.lib._
  if (ctx.getSchema(name)) return
  const value = merge({}, obj, { $id: name })
  ctx.addSchema(value)
}

export default docSchemaLib
