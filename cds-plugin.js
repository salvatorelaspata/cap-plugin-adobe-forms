const cds = require('@sap/cds')

// Register the service implementation so cds.connect.to('adobeForms') returns
// an instance with remoteHealth(), listForms(), renderPDF(), etc.
cds.on('bootstrap', () => {
  const requires = cds.env.requires
  if (requires?.adobeForms) {
    requires.adobeForms.impl = require.resolve('./lib/adobe-service')
  }
})

cds.on('served', () => {
  cds.log('adobe-forms-plugin').info('CAP Adobe Forms plugin loaded')
})
