(function() {
  "use strict";

  /*
   * SHOPIFY API: Delete existing
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
        filename: './api-delete.log',
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
        var baseURL, endpoints, itemType, path, _ref, _ref1, _ref2, _ref3;
        baseURL = "https://" + config.apiKey + ":" + config.password + "@" + config.shop;
        itemType = _.first(_.keys(item));
        endpoints = {
          product: "products/" + ((_ref = item.product) != null ? _ref.id : void 0),
          image: "products/" + ((_ref1 = item.image) != null ? _ref1.product_id : void 0) + "/images/" + ((_ref2 = item.image) != null ? _ref2.id : void 0),
          collect: "collects/" + ((_ref3 = item.collect) != null ? _ref3.id : void 0)
        };
        path = (function() {
          return "/admin/" + endpoints[itemType] + ".json";
        })();
        return request({
          method: 'DELETE',
          uri: baseURL + path,
          json: item
        }, function(err, res, body) {
          var apiLimitLevel, throttleDelay;
          logger.info("DELETE " + path);
          logger.info(item);
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