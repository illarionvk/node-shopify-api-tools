'use strict'

request = require('request')
_ = require('lodash')
Rsvp = require('rsvp')

module.exports = (options) ->
  promise = new Rsvp.Promise( (resolve, reject) ->
    defaults = {
      baseURL:
        [
          'https://'
          options.apiConfig.apiKey
          ':'
          options.apiConfig.password
          '@'
          options.apiConfig.shop
        ].join('')
      what: 'themes'
      qs:
        limit: 250
    }

    params = _.assign(defaults, options, (value, other) ->
      if _.isPlainObject(value)
        return _.defaults(value, other)
      return value
    )

    console.log "Fetching #{params.what} from #{options.apiConfig.shop}"

    request(
      {
        method: 'GET'
        uri: params.baseURL + "/admin/#{params.what}.json"
        qs: params.qs
      }
      (err, res, body) ->
        if err?
          console.log('Error!')
          console.dir(err)
          return reject(err)

        unless res.statusCode == 200
          console.log "ERROR #{res.statusCode}"
          return reject(res.statusCode)

        results = JSON.parse(body)
        resolve( results[params.what] )
    )
  )
  return promise

