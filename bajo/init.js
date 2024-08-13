async function start () {
  const { uniq, trim } = this.app.bajo.lib._
  this.config.format.supported.push('json')
  this.config.format.supported = uniq(this.config.format.supported)
  this.config.prefix = trim(this.config.prefix, '/')
}

export default start
