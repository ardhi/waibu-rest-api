async function subApp (ctx) {
  const { importModule, runHook } = this.app.bajo
  const { collect } = await importModule('waibu:/lib/app.js', { asDefaultImport: false })
  const mods = await collect.call(this.app[this.ns], 'boot.js', 'waibuRestApi')
  for (const m of mods) {
    this.log.debug('bootSubApp%s', m.ns)
    await ctx.register(async (subCtx) => {
      this.app[m.ns].instance = subCtx
      await runHook(`${this.ns}.${m.alias}:afterCreateContext`, subCtx)
      await m.handler.call(this.app[m.ns], subCtx, m.prefix)
    }, { prefix: m.prefix })
  }
}

export default subApp
