async function xml (req, reply, payload) {
  const { importPkg } = this.app.bajo
  const { XMLBuilder } = await importPkg('bajoExtra:fast-xml-parser')
  const { get, set, isPlainObject, isArray } = this.app.lib._
  const { wrapper, valueAsAttributes, declaration } = this.config.format.xml.response

  reply.type('application/xml; charset=utf-8')
  const wrapped = set({}, wrapper, JSON.parse(payload))
  const opts = {
    attributeValueProcessor: function (k, v) {
      return v === 'null' ? '' : v
    }
  }
  const dataKey = this.config.responseKey.data
  if (valueAsAttributes) {
    const dataValue = get(wrapped, `${wrapper}.${dataKey}`)
    opts.attributesGroupName = '_attrs'
    if (isPlainObject(dataValue)) {
      delete wrapped[wrapper][dataKey]
      set(wrapped[wrapper], `${dataKey}._attrs`, dataValue)
    } else if (isArray(dataValue)) {
      delete wrapped[wrapper][dataKey]
      const recs = []
      for (const d of dataValue) {
        recs.push(set({}, '_attrs', d))
      }
      set(wrapped[wrapper], dataKey, recs)
    }
  }
  const builder = new XMLBuilder(opts)
  let content = builder.build(wrapped)
  if (declaration) content = '<?xml version="1.0" encoding="UTF-8" ?>' + content
  return content
}

export default xml
