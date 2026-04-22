const cds = require('@sap/cds')

function getAdobeFormsSettings() {
  const section = cds.env.requires?.adobeForms || {}
  return {
    destinationName: section.destination || process.env.ADOBE_FORMS_DESTINATION || 'ADOBE_FORMS_API',
    healthPath: section.healthPath || process.env.ADOBE_FORMS_HEALTH_PATH || '/v1/forms',
    credentials: section.credentials || {}
  }
}

function hasDirectCredentials() {
  const cfg = getAdobeFormsSettings().credentials
  return Boolean(cfg.baseUrl && cfg.tokenUrl && cfg.clientId && cfg.clientSecret)
}

function getDirectCredentials() {
  const cfg = getAdobeFormsSettings().credentials
  const required = ['baseUrl', 'tokenUrl', 'clientId', 'clientSecret']
  const missing = required.filter(k => !cfg[k])
  if (missing.length) {
    const err = new Error(`Missing Adobe Forms configuration: ${missing.join(', ')}`)
    err.code = 'ADOBE_FORMS_CONFIG_MISSING'
    throw err
  }
  return cfg
}

module.exports = { getAdobeFormsSettings, hasDirectCredentials, getDirectCredentials }
