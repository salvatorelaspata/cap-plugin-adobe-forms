const cds = require('@sap/cds')
const client = require('./adobe-client')
const { toCapError } = require('./errors')

module.exports = cds.service.impl(function () {

  this.on('renderPDF', async req => {
    try {
      const { templateName, payload, locale } = req.data
      if (!templateName) return req.reject(400, 'templateName is required')
      if (!payload) return req.reject(400, 'payload is required')

      const pdf = await client.renderPDF({ templateName, payload, locale })

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

  this.on('listForms', async req => {
    try {
      const data = await client.listForms()
      return JSON.stringify(data)
    } catch (error) {
      return toCapError(req, error)
    }
  })

  this.on('getFormDetails', async req => {
    try {
      const { formId } = req.data
      if (!formId) return req.reject(400, 'formId is required')
      const data = await client.getFormDetails(formId)
      return JSON.stringify(data)
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
      return await client.remoteHealth()
    } catch (error) {
      return toCapError(req, error)
    }
  })
})
