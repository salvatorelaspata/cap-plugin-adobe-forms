const { getDestination } = require('@sap-cloud-sdk/connectivity')
const { getAdobeFormsSettings } = require('./config')

async function resolveDestination(jwt) {
  const { destinationName } = getAdobeFormsSettings()
  const destination = await getDestination({ destinationName, jwt })

  if (!destination) {
    const err = new Error(`Destination not found: ${destinationName}`)
    err.code = 'ADOBE_FORMS_DESTINATION_NOT_FOUND'
    throw err
  }

  return destination
}

module.exports = { resolveDestination }
