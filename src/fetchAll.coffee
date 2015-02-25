"use strict"

request = require('request')
_ = require('lodash')
async = require('async')
Rsvp = require('rsvp')

appendItems = (body) ->
  parsedBody = JSON.parse(body)
  wrapKey = _.first( _.keys(parsedBody) )
  return parsedBody[wrapKey]

getItems = (params, totalPages) ->
  promise = new Rsvp.Promise( (resolve, reject) ->
    pageRange = _.range(1, totalPages + 1)
    asyncTasks = _.map(pageRange, (pageNumber) ->
      return (callback) ->

        console.log "Fetching page #{pageNumber} of #{params.what}"

        qs = _.clone(params.qs, true)
        qs.page = pageNumber

        request(
          {
            method: 'GET'
            uri: params.baseURL + "/admin/#{params.what}.json"
            qs: qs
          }
          (err, res, body) ->
            apiLimitLevel = res.headers['x-shopify-shop-api-call-limit']
            throttleDelay = do ->
              limitPair = apiLimitLevel.split('/')
              limitPercent = limitPair[0] / limitPair[1] * 100
              if limitPercent > 50
                return 6000
              return 100
            console.log "API Limit: #{apiLimitLevel}"

            if err?
              console.log('Error!')
              console.dir(err)
              return setImmediate(callback, err)

            unless res.statusCode == 200
              console.log "ERROR #{res.statusCode}"
              return setImmediate(callback, res.statusCode)

            setTimeout(
              ->
                asyncResult = appendItems(body)
                callback(null, asyncResult)
              throttleDelay
            )
        )
    )
    async.parallelLimit(asyncTasks, 5, (err, results) ->
      if err?
        reject(err)
      else
        resolve( _.flatten(results) )
    )
  )
  return promise

getPageCount = (params) ->
  promise = new Rsvp.Promise( (resolve, reject) ->
    request(
      {
        method: 'GET'
        uri: params.baseURL + "/admin/#{params.what}/count.json"
        qs: params.qs
      }
      (error, response, body) ->
        if error
          reject(error)
        else
          apiLimitLevel = response.headers['x-shopify-shop-api-call-limit']
          console.log "API Limit: #{apiLimitLevel}"
          if response.statusCode == 200
            count = Math.round( JSON.parse(body).count )

            pageCount = do ->
              modulo = count % params.qs.limit
              if modulo > 0
                return Math.floor(count / params.qs.limit) + 1
              else
                return Math.floor(count / params.qs.limit)

            console.log "Number of items: #{count}"
            console.log "Number of pages: #{pageCount}"

            resolve(pageCount)
          else
            reject(response.statusCode)
    )
  )
  return promise

module.exports = (options) ->
  promise = new Rsvp.Promise( (resolve, reject) ->
    params = {
      baseURL:
        [
          'https://'
          options.apiConfig.apiKey
          ':'
          options.apiConfig.password
          '@'
          options.apiConfig.shop
        ].join('')
      qs: options.qs || {}
      what: options.what
        .replace(/^\//gi, '')
        .replace(/\/$/gi, '')
        .toLowerCase()
    }
    params.qs.limit = do ->
      if options.qs?
        return options.qs.limit || 250
      else
        return 250

    console.log "Fetching #{params.what} from #{options.apiConfig.shop}"

    getPageCount(params)
      .then(
        (totalPages) ->
          if totalPages == 0
            return []
          else
            return getItems(params, totalPages)
        (error) ->
          console.log "Error!"
          console.log error
          reject(error)
      )
      .then(
        (allPages) ->
          resolve(allPages)
        (error) ->
          reject(error)
      )
  )
  return promise

