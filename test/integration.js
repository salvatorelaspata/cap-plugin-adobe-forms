// node --env-file=.env test/integration.js
const cds = require('@sap/cds')
const fs = require('node:fs')
const path = require('node:path')

cds.env.requires ??= {}
cds.env.requires.adobeForms = {
  credentials: {
    baseUrl: process.env.ADOBE_BASEURL,
    tokenUrl: process.env.ADOBE_TOKEN_URL,
    clientId: process.env.ADOBE_CLIENT_ID,
    clientSecret: process.env.ADOBE_CLIENT_SECRET
  }
}

const client = require('../lib/adobe-client')

const SAMPLE_PAYLOAD = {
  Header: {
    NumeroDelibera: 'TEST-001',
    Anno: new Date().getFullYear(),
    Data: new Date().toISOString().slice(0, 10)
  },
  TabellaStringhe: {
    Riga: [
      ...Array.from({ length: 100 }, (_, i) => ({ Testo: `Riga aggiuntiva ${i + 1}` }))
    ]
  }
}

  ; (async () => {
    console.log('--- remoteHealth ---')
    console.log(await client.remoteHealth())

    console.log('\n--- listForms ---')
    const forms = await client.listForms()
    console.log(JSON.stringify(forms, null, 2))

    if (!forms.length) { console.log('Nessun form disponibile.'); return }

    const formName = forms[0].formName ?? forms[0].id

    console.log('\n--- getFormDetails ---', formName)
    const details = await client.getFormDetails(formName)
    console.log(JSON.stringify(details, null, 2))

    console.log('\n--- getFormSchema ---', formName)
    const schema = await client.getFormSchema(formName)
    console.log(`schemaName: ${schema.schemaName}`)
    console.log(`formName:   ${schema.formName}`)
    console.log(`xsd (primi 200 chars):\n${schema.xsd.slice(0, 200)}`)

    console.log('\n--- renderPDF ---', formName)
    const pdf = await client.renderPDF({ templateName: formName, payload: SAMPLE_PAYLOAD, locale: 'it' })
    const outPath = path.join(__dirname, `output-${formName}.pdf`)
    fs.writeFileSync(outPath, pdf)
    console.log(`PDF salvato in: ${outPath} (${pdf.length} bytes)`)
  })().catch(console.error)
