async function waibuAfterInit () {
  this.app.waibu.config.paramsCharMap[this.config.mapSlash] = '/'
  // this.app.waibu.config.paramsCharMap[this.config.mapDot] = '.'
}

export default waibuAfterInit
