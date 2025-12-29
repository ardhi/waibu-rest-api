import xml from './handle-response/xml.js'

async function handleResponse (ctx) {
  const me = this

  ctx.addHook('onSend', async function (req, reply, payload) {
    let type = req.params.format
    if (!type) {
      const types = req.accepts().types()
      if (me.config.format.supported.includes('xml') && types[0] === 'application/xml') type = 'xml'
      else type = 'json'
    }
    let result = payload
    switch (type) {
      case 'xml': result = await xml.call(me, req, reply, payload); break
    }
    return result
  })
}

export default handleResponse
