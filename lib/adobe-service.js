const cds = require('@sap/cds')
const client = require('./adobe-client')

class AdobeFormsService extends cds.Service {
  async init() {
    await super.init()
  }

  remoteHealth() { return client.remoteHealth() }
  listForms() { return client.listForms() }
  getFormDetails(formId) { return client.getFormDetails(formId) }
  getFormSchema(formId) { return client.getFormSchema(formId) }
  renderPDF(options) { return client.renderPDF(options) }
  health() { return client.health() }
}

module.exports = AdobeFormsService
