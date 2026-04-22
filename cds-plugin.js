const cds = require('@sap/cds')

cds.on('served', () => {
  cds.log('adobe-forms-plugin').info('CAP Adobe Forms plugin loaded')
})
