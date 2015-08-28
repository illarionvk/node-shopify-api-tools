(function() {
  "use strict";

  /*
   * SHOPIFY API: Create new items
   */
  var Rsvp, _, async, logger, request, winston;

  request = require('request');

  async = require('async');

  _ = require('lodash');

  Rsvp = require('rsvp');

  winston = require('winston');

  logger = new winston.Logger({
    transports: [
      new winston.transports.File({
        filename: './api-create.log',
        maxsize: 5242880,
        maxFiles: 5
      }), new winston.transports.Console({
        json: false
      })
    ]
  });

  module.exports = function(config, requestObjects) {
    var promise;
    promise = new Rsvp.Promise(function(resolve, reject) {
      var asyncWorker, q;
      asyncWorker = function(item, callback) {
        var baseURL, endpoints, itemType, path, ref, ref1, ref2, ref3;
        baseURL = "https://" + config.apiKey + ":" + config.password + "@" + config.shop;
        itemType = _.first(_.keys(item));
        endpoints = {
          'order': 'orders',
          'product': 'products',
          'redirect': "redirects",
          'image': "products/" + ((ref = item.image) != null ? ref.product_id : void 0) + "/images",
          'collect': "collects",
          'close_order': "orders/" + ((ref1 = item.close_order) != null ? ref1.id : void 0) + "/close",
          'complete_fulfillment': "orders/" + ((ref2 = item.complete_fulfillment) != null ? ref2.order_id : void 0) + "/fulfillments/" + ((ref3 = item.complete_fulfillment) != null ? ref3.id : void 0) + "/complete",
          'metafield': (function() {
            var metafield, resource;
            metafield = item.metafield;
            if (metafield != null) {
              resource = metafield.owner_resource;
              if (resource === 'shop') {
                return "metafields";
              }
              if (resource === 'product') {
                return "products/" + metafield.owner_id + "/metafields";
              }
              return callback('Unknown metafield owner resource');
            }
          })()
        };
        path = (function() {
          return "/admin/" + endpoints[itemType] + ".json";
        })();
        return request({
          method: 'POST',
          uri: baseURL + path,
          json: item
        }, function(err, res, body) {
          var apiLimitLevel, throttleDelay;
          logger.info("POST " + path);
          if (err != null) {
            logger.error(err);
            return setImmediate(callback, err);
          }
          if (res.headers['x-shopify-shop-api-call-limit']) {
            apiLimitLevel = res.headers['x-shopify-shop-api-call-limit'];
            throttleDelay = (function() {
              var limitPair, limitPercent;
              limitPair = apiLimitLevel.split('/');
              limitPercent = limitPair[0] / limitPair[1] * 100;
              if (limitPercent > 50) {
                return 7000;
              }
              return 500;
            })();
            console.log("API Limit: " + apiLimitLevel);
          }
          if (!(res.statusCode === 201 || res.statusCode === 200)) {
            console.log(JSON.stringify(body, null, 2));
            logger.error("Status code: " + res.statusCode + "\n" + path);
            return setImmediate(callback, res.statusCode);
          }
          logger.info("SUCCESS");
          return setTimeout(function() {
            return callback(null);
          }, throttleDelay);
        });
      };
      q = async.queue(asyncWorker, 15);
      q.drain = function() {
        console.log('Queue is drained');
        return resolve([]);
      };
      return q.push(requestObjects, function(err) {
        console.log("Remaining tasks: " + (q.length()));
        if (err != null) {
          q.kill();
          return reject(err);
        }
      });
    });
    return promise;
  };

}).call(this);
