"use strict"

###
# SHOPIFY API: Create new items
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
      filename: './api-create.log'
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
        #product: "products/#{item.product?.id}"
        image: "products/#{item.image?.product_id}/images"
        #article: "blogs/#{item.article?.blog_id}/articles/#{item.article?.id}"
        #blog: "blogs/#{item.blog?.id}"
        #page: "pages/#{item.page?.id}"
        #custom_collection: "custom_collections/#{item.custom_collection?.id}"
        #smart_collection: "smart_collections/#{item.smart_collection?.id}"
        collect: "collects"
        close_order: "orders/#{item.close_order?.id}/close"
        complete_fulfillment: "orders/#{item.complete_fulfillment?.order_id}/fulfillments/#{item.complete_fulfillment?.id}/complete"
        metafield: do ->
          metafield = item.metafield
          if metafield?
            resource = metafield.owner_resource
            if resource == 'shop'
              return "metafields"
            if resource == 'product'
              return "products/#{metafield.owner_id}/metafields"
            callback('Unknown metafield owner resource')
      }
      path = do ->
        return "/admin/#{endpoints[itemType]}.json"

      request(
        {
          method: 'POST'
          uri: baseURL+path
          json: item
        }
        (err, res, body) ->
          logger.info "POST #{path}"

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
            console.log JSON.stringify(body, null, 2)
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
