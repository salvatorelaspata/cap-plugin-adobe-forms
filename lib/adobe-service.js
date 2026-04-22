const cds = require('@sap/cds')
const client = require('./adobe-client')
const { toCapError } = require('./errors')

module.exports = cds.service.impl(function () {
  this.on('renderPDF', async req => {
    try {
      const { templateName, payload, locale } = req.data
      if (!templateName) return req.reject(400, 'templateName is required')
      if (!payload) return req.reject(400, 'payload is required')

      const normalizedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload
      const pdf = await client.renderPDF({
        templateName,
        payload: normalizedPayload,
        locale,
        jwt: req.user?.jwt
      })

      const res = cds.context.http?.res
      if (res) {
        res.setHeader('content-type', 'application/pdf')
        res.setHeader('content-disposition', `inline; filename="${templateName}.pdf"`)
      }
      return pdf
    } catch (error) {
      return toCapError(req, error)
    }
  })

  this.on('health', async req => {
    try {
      return await client.health()
    } catch (error) {
      return toCapError(req, error)
    }
  })

  this.on('remoteHealth', async req => {
    try {
      return await client.remoteHealth({ jwt: req.user?.jwt })
    } catch (error) {
      return toCapError(req, error)
    }
  })
})
