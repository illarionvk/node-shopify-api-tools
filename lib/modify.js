(function() {
  "use strict";

  /*
   * UPDATE EXISTING PRODUCTS
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
        filename: './api-modify.log',
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
        var baseURL, endpoints, itemType, path, ref, ref1, ref10, ref11, ref12, ref13, ref14, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9;
        baseURL = "https://" + config.apiKey + ":" + config.password + "@" + config.shop;
        itemType = _.first(_.keys(item));
        endpoints = {
          article: "blogs/" + ((ref = item.article) != null ? ref.blog_id : void 0) + "/articles/" + ((ref1 = item.article) != null ? ref1.id : void 0),
          asset: "themes/" + ((ref2 = item.asset) != null ? ref2.theme_id : void 0) + "/assets",
          blog: "blogs/" + ((ref3 = item.blog) != null ? ref3.id : void 0),
          custom_collection: "custom_collections/" + ((ref4 = item.custom_collection) != null ? ref4.id : void 0),
          fulfillment: "orders/" + ((ref5 = item.fulfillment) != null ? ref5.order_id : void 0) + "/fulfillments/" + ((ref6 = item.fulfillment) != null ? ref6.id : void 0),
          image: "products/" + ((ref7 = item.image) != null ? ref7.product_id : void 0) + "/images/" + ((ref8 = item.image) != null ? ref8.id : void 0),
          metafield: "metafields/" + ((ref9 = item.metafield) != null ? ref9.id : void 0),
          order: "orders/" + ((ref10 = item.order) != null ? ref10.id : void 0),
          page: "pages/" + ((ref11 = item.page) != null ? ref11.id : void 0),
          product: "products/" + ((ref12 = item.product) != null ? ref12.id : void 0),
          redirect: "redirects/" + ((ref13 = item.redirect) != null ? ref13.id : void 0),
          smart_collection: "smart_collections/" + ((ref14 = item.smart_collection) != null ? ref14.id : void 0)
        };
        path = (function() {
          return "/admin/" + endpoints[itemType] + ".json";
        })();
        return request({
          method: 'PUT',
          uri: baseURL + path,
          json: item
        }, function(err, res) {
          var apiLimitLevel, throttleDelay;
          logger.info("PUT " + path);
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
