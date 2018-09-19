const console = require('better-console')
const Papa = require('papaparse')
const path = require('path')
const xero = require('./xero')
const fs = require('mz/fs')
const moment = require('moment')
const {Set} = require('immutable')

const DUPLICATE_INVOICES_FILE = path.normalize(process.argv[2])
const ERROR_LOG = path.join(__dirname, `errors-${moment().format('YYYYMMDDHHSS')}.log`)

;(async () => {
  try {
    if (!DUPLICATE_INVOICES_FILE) throw new Error(`No invoice file specified!`)
    const csvFile = await fs.readFile(DUPLICATE_INVOICES_FILE).then(d => d.toString().trim())
    const csvRows = Papa.parse(csvFile, {header: true})

    const InvoiceNumbers = new Set(csvRows.data.map(({InvoiceNumber}) => InvoiceNumber))

    const errors = []
    let c = 1
    for (let InvoiceNumber of InvoiceNumbers) {
      // delete invoice
      console.warn(`Voiding InvoiceNumber ${InvoiceNumber} (${c}/${InvoiceNumbers.size})`)
      try {
        const InvoiceResult = await xero.invoices.update({
          InvoiceNumber,
          'Status': 'VOIDED'
        })
        // check for validation errors
        InvoiceResult.Invoices.forEach(({ValidationErrors}) => ValidationErrors && ValidationErrors.forEach(({Message}) => {
          if (Message === 'Invoice not of valid status for modification') {
            console.log(`Invoice ${InvoiceNumber} already voided`)
          } else {
            console.error(`${InvoiceNumber}: ${Message}`)
            errors.push(`${InvoiceNumber}: ${Message}`)
          }
        }))
      } catch (err) {
        console.error(err)
        errors.push(`${InvoiceNumber}: ${err.message}`)
      } finally {
        c++
      }
    }
    fs.writeFile(ERROR_LOG, errors.join('\n'))
  } catch (err) {
    console.error(err)
  }
})()
