# Testing

## Unit test

I test unitari usano `node:test` e `node:assert` con mock di `global.fetch`. Non richiedono credenziali reali né connettività BTP.

```bash
npm test
```

## Integration test con BTP reale

Il plugin supporta due modalità di autenticazione. Per i test locali si usa la **modalità credenziali dirette**, che richiede una service key dell'istanza *SAP Forms service by Adobe* su BTP.

### 1. Recupera la service key

```bash
cf service-key <nome-istanza> <nome-chiave>
```

Il JSON restituito contiene i campi necessari: `url`, `uaa.url`, `uaa.clientid`, `uaa.clientsecret`.

### 2. Crea il file `.env`

Crea un file `.env` nella root del progetto (è già in `.gitignore`, non committarlo):

```env
ADOBE_BASEURL=https://<url-dalla-chiave>
ADOBE_TOKEN_URL=https://<uaa.url>/oauth/token
ADOBE_CLIENT_ID=<uaa.clientid>
ADOBE_CLIENT_SECRET=<uaa.clientsecret>
```

### 3. Esegui il test di integrazione

```bash
node --env-file=.env test/integration.js
```

Il file `test/integration.js` chiama in sequenza `remoteHealth`, `listForms` e `getFormDetails` sul servizio reale e stampa i risultati a console.

## Modalità destination (ambiente CF/Kyma)

Quando il plugin è deployato su BTP con il Destination Service in binding, non servono credenziali dirette. Il plugin fa automaticamente fallback sulla destination `ADOBE_FORMS_API` tramite SAP Cloud SDK (vedi `lib/adobe-client.js`). In questo caso non configurare le `credentials` in `cds.env.requires.adobeForms`.

Per testare localmente con una destination è possibile usare SAP Business Application Studio oppure un tunnel `cf ssh`, ma la modalità service key (descritta sopra) è più pratica per lo sviluppo.
