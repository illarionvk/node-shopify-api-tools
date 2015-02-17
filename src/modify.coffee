"use strict"

###
# UPDATE EXISTING PRODUCTS
###

fs = require('fs')
request = require('request')
async = require('async')
_ = require('lodash')
Rsvp = require('rsvp')
winston = require('winston')

logger = new winston.Logger(
  transports: [
    new winston.transports.File(
      filename: './api-modify.log'
      maxsize: 5242880
      maxFiles: 5
    )
    new winston.transports.Console(
      json: false
    )
  ]
)

module.exports = (config, requestObjects) ->
  promise = new Rsvp.Promise( (resolve, reject) ->
    asyncWorker = (item, callback) ->
      baseURL = "https://#{config.apiKey}:#{config.password}@#{config.shop}"
      itemType = _.first( _.keys(item) )
      endpoints = {
        product: "products/#{item.product?.id}"
        order: "orders/#{item.order?.id}"
        image: "products/#{item.image?.product_id}/images/#{item.image?.id}"
        article: "blogs/#{item.article?.blog_id}/articles/#{item.article?.id}"
        blog: "blogs/#{item.blog?.id}"
        page: "pages/#{item.page?.id}"
        custom_collection: "custom_collections/#{item.custom_collection?.id}"
        smart_collection: "smart_collections/#{item.smart_collection?.id}"
        metafield: "metafields/#{item.metafield?.id}"
        fulfillment: "orders/#{item.fulfillment?.order_id}/fulfillments/#{item.fulfillment?.id}"
      }
      path = do ->
        return "/admin/#{endpoints[itemType]}.json"

      request(
        {
          method: 'PUT'
          uri: baseURL+path
          json: item
        }
        (err, res, body) ->
          logger.info "PUT #{path}"

          if err?
            logger.error(err)
            return setImmediate(callback, err)

          if res.headers['x-shopify-shop-api-call-limit']
            apiLimitLevel = res.headers['x-shopify-shop-api-call-limit']
            throttleDelay = do ->
              limitPair = apiLimitLevel.split('/')
              limitPercent = limitPair[0] / limitPair[1] * 100
              if limitPercent > 50
                return 7000
              return 500
            console.log "API Limit: #{apiLimitLevel}"

          unless res.statusCode == 201 or res.statusCode == 200
            logger.error """
              Status code: #{res.statusCode}
              #{path}
            """
            return setImmediate(callback, res.statusCode)

          logger.info "SUCCESS"
          setTimeout(
            ->
              callback(null)
            throttleDelay
          )
      )

    q = async.queue(asyncWorker, 15)

    q.drain = ->
      console.log 'Queue is drained'
      resolve([])

    q.push(requestObjects, (err) ->
      console.log "Remaining tasks: #{q.length()}"
      if err?
        q.kill()
        reject(err)
    )
  )
  return promise
