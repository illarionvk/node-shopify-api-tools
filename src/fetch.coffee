'use strict'

superagent = require('superagent')
_ = require('lodash')
Promise = require('bluebird')
backoff = require('oibackoff').backoff({
  algorithm: 'exponential'
  delayRatio: 2
  maxTries: 5
  maxDelay: 32
})

intermediate = (err, tries, delay) ->
  console.log("Trying again after #{delay} seconds")
  return

request = (data, callback) ->
  return superagent
    .get(data.uri)
    .query(data.qs)
    .end(callback)

module.exports = (options) ->
  return new Promise( (resolve, reject) ->
    what = do ->
      if _.has(options, 'what')
        return options.what
      return ''

    resultKey = _.last( what.split('/') )

    data = {
      method: 'GET'
      uri: [
        'https://'
        options.apiConfig.apiKey
        ':'
        options.apiConfig.password
        '@'
        options.apiConfig.shop
        '/admin/'
        what
        '.json'
      ].join('')
      what: what
      qs: _.merge({ limit: 250 }, options.qs)
    }

    console.log "Fetching #{what} from #{options.apiConfig.shop}"

    backoff(request, data, intermediate, (err, res) ->
      if err?
        console.log('Error!')
        console.dir(err)
        return reject(err)

      console.log [
        'API limit:'
        res.headers['x-shopify-shop-api-call-limit']
      ].join(' ')

      return resolve( res.body[resultKey] )
    )
  )

