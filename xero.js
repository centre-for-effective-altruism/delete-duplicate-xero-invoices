require('dotenv').load()
const XeroClient = require('xero-node').AccountingAPIClient
const Bottleneck = require('bottleneck')

const {
  XERO_CONSUMER_KEY,
  XERO_CONSUMER_SECRET,
  XERO_RSA_PRIVATE_KEY
} = process.env

const config = {
  appType: 'private',
  consumerKey: XERO_CONSUMER_KEY,
  consumerSecret: XERO_CONSUMER_SECRET,
  callbackUrl: null,
  privateKeyString: XERO_RSA_PRIVATE_KEY
}

function rateLimitClient (client) {
  // create a limiter for this client
  const limiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: 1100
  })
  // Proxy handler for property access on the client
  // if the property is a function, schedule it to be called by the rate limiter
  // if the property is an object, traverse it recursively
  const handler = {
    get: function (target, name) {
      const prop = target[name]
      switch (typeof prop) {
        case 'object':
          return new Proxy(prop, handler)
        case 'function':
          return async function () {
            const args = arguments
            return limiter.schedule(() => prop(...args))
          }
        default:
          return prop
      }
    }
  }
  return new Proxy(client, handler)
}

module.exports = rateLimitClient(new XeroClient(config))
