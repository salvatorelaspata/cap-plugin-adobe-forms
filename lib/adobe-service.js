const cds = require('@sap/cds')
const client = require('./adobe-client')

class AdobeFormsService extends cds.Service {
  async init() {
    await super.init()
    // Own properties are required: cds.Service wraps instances in a Proxy that only
    // forwards access to own properties, so prototype methods are invisible to callers.
    this.remoteHealth = () => client.remoteHealth()
    this.listForms = () => client.listForms()
    this.getFormDetails = (formId) => client.getFormDetails(formId)
    this.getFormSchema = (formId) => client.getFormSchema(formId)
    this.renderPDF = (options) => client.renderPDF(options)
    this.health = () => client.health()
  }
}

module.exports = AdobeFormsService
