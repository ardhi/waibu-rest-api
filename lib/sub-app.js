async function subApp (ctx) {
  const { importModule, runHook } = this.app.bajo
  const { collect } = await importModule('waibu:/lib/app.js', { asDefaultImport: false })
  const mods = await collect.call(this.app[this.name], 'boot.js', 'waibuRestApi')
  for (const m of mods) {
    this.log.debug('Boot sub app: %s', m.ns)
    await ctx.register(async (subCtx) => {
      this.app[m.ns].instance = subCtx
      await runHook(`${this.name}.${m.alias}:afterCreateContext`, subCtx)
      await m.handler.call(this.app[m.ns], subCtx, m.prefix)
    }, { prefix: m.prefix })
  }
}

export default subApp
