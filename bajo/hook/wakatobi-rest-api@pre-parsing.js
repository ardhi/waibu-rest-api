const wakatobiRestApiPreParsing = {
  level: 9,
  handler: async function (ctx, req, reply) {
    const { importModule } = this.app.bajo
    const attachI18N = await importModule('wakatobi:/lib/webapp-scope/attach-i18n.js')
    await attachI18N.call(this, this.config.i18n.detectors, req, reply)
    reply.header('Content-Language', req.lang)
    if (this.config.format.asExt && req.params.format) {
      if (!this.config.format.supported.includes(req.params.format)) {
        throw this.error('Unsupported format \'%s\'', req.params.format, { statusCode: 406 })
      }
    }
  }
}

export default wakatobiRestApiPreParsing
