(function() {
  "use strict";

  /*
   * UPDATE EXISTING PRODUCTS
   */
  var Rsvp, async, fs, logger, request, winston, _;

  fs = require('fs');

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
        var baseURL, endpoints, itemType, path, _ref, _ref1, _ref10, _ref11, _ref12, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8, _ref9;
        baseURL = "https://" + config.apiKey + ":" + config.password + "@" + config.shop;
        itemType = _.first(_.keys(item));
        endpoints = {
          product: "products/" + ((_ref = item.product) != null ? _ref.id : void 0),
          order: "orders/" + ((_ref1 = item.order) != null ? _ref1.id : void 0),
          image: "products/" + ((_ref2 = item.image) != null ? _ref2.product_id : void 0) + "/images/" + ((_ref3 = item.image) != null ? _ref3.id : void 0),
          article: "blogs/" + ((_ref4 = item.article) != null ? _ref4.blog_id : void 0) + "/articles/" + ((_ref5 = item.article) != null ? _ref5.id : void 0),
          blog: "blogs/" + ((_ref6 = item.blog) != null ? _ref6.id : void 0),
          page: "pages/" + ((_ref7 = item.page) != null ? _ref7.id : void 0),
          custom_collection: "custom_collections/" + ((_ref8 = item.custom_collection) != null ? _ref8.id : void 0),
          smart_collection: "smart_collections/" + ((_ref9 = item.smart_collection) != null ? _ref9.id : void 0),
          metafield: "metafields/" + ((_ref10 = item.metafield) != null ? _ref10.id : void 0),
          fulfillment: "orders/" + ((_ref11 = item.fulfillment) != null ? _ref11.order_id : void 0) + "/fulfillments/" + ((_ref12 = item.fulfillment) != null ? _ref12.id : void 0)
        };
        path = (function() {
          return "/admin/" + endpoints[itemType] + ".json";
        })();
        return request({
          method: 'PUT',
          uri: baseURL + path,
          json: item
        }, function(err, res, body) {
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
