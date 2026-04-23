const { getDestination } = require('@sap-cloud-sdk/connectivity')
const { getAdobeFormsSettings } = require('./config')

async function resolveDestination() {
  const { destinationName } = getAdobeFormsSettings()
  const destination = await getDestination({ destinationName })

  if (!destination) {
    const err = new Error(`Destination not found: ${destinationName}`)
    err.code = 'ADOBE_FORMS_DESTINATION_NOT_FOUND'
    throw err
  }

  return destination
}

module.exports = { resolveDestination }
