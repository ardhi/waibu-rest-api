async function subApp (ctx) {
  const { importModule } = this.app.bajo
  const { collect } = await importModule('wakatobi:/lib/app.js', { asDefaultImport: false })
  const mods = await collect.call(this.app[this.name], 'boot.js', 'wakatobiRestApi')
  for (const m of mods) {
    this.log.debug('Boot sub app: %s', m.ns)
    await m.handler.call(this.app[m.ns], ctx)
  }
}

export default subApp
