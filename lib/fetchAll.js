(function() {
  "use strict";
  var Rsvp, appendItems, async, getItems, getPageCount, request, _;

  request = require('request');

  _ = require('lodash');

  async = require('async');

  Rsvp = require('rsvp');

  appendItems = function(body) {
    var parsedBody, wrapKey;
    parsedBody = JSON.parse(body);
    wrapKey = _.first(_.keys(parsedBody));
    return parsedBody[wrapKey];
  };

  getItems = function(params, totalPages) {
    var promise;
    promise = new Rsvp.Promise(function(resolve, reject) {
      var asyncTasks, pageRange;
      pageRange = _.range(1, totalPages + 1);
      asyncTasks = _.map(pageRange, function(pageNumber) {
        return function(callback) {
          var qs;
          console.log("Fetching page " + pageNumber + " of " + params.what);
          qs = _.clone(params.qs, true);
          qs.page = pageNumber;
          return request({
            method: 'GET',
            uri: params.baseURL + ("/admin/" + params.what + ".json"),
            qs: qs
          }, function(err, res, body) {
            var apiLimitLevel, throttleDelay;
            apiLimitLevel = res.headers['x-shopify-shop-api-call-limit'];
            throttleDelay = (function() {
              var limitPair, limitPercent;
              limitPair = apiLimitLevel.split('/');
              limitPercent = limitPair[0] / limitPair[1] * 100;
              if (limitPercent > 50) {
                return 6000;
              }
              return 100;
            })();
            console.log("API Limit: " + apiLimitLevel);
            if (err != null) {
              console.log('Error!');
              console.dir(err);
              return setImmediate(callback, err);
            }
            if (res.statusCode !== 200) {
              console.log("ERROR " + res.statusCode);
              return setImmediate(callback, res.statusCode);
            }
            return setTimeout(function() {
              var asyncResult;
              asyncResult = appendItems(body);
              return callback(null, asyncResult);
            }, throttleDelay);
          });
        };
      });
      return async.parallelLimit(asyncTasks, 5, function(err, results) {
        if (err != null) {
          return reject(err);
        } else {
          return resolve(_.flatten(results));
        }
      });
    });
    return promise;
  };

  getPageCount = function(params) {
    var promise;
    promise = new Rsvp.Promise(function(resolve, reject) {
      return request({
        method: 'GET',
        uri: params.baseURL + ("/admin/" + params.what + "/count.json"),
        qs: params.qs
      }, function(error, response, body) {
        var apiLimitLevel, count, pageCount;
        if (error) {
          return reject(error);
        } else {
          apiLimitLevel = response.headers['x-shopify-shop-api-call-limit'];
          console.log("API Limit: " + apiLimitLevel);
          if (response.statusCode === 200) {
            count = Math.round(JSON.parse(body).count);
            pageCount = (function() {
              var modulo;
              modulo = count % params.qs.limit;
              if (modulo > 0) {
                return Math.floor(count / params.qs.limit) + 1;
              } else {
                return Math.floor(count / params.qs.limit);
              }
            })();
            console.log("Number of items: " + count);
            console.log("Number of pages: " + pageCount);
            return resolve(pageCount);
          } else {
            return reject(response.statusCode);
          }
        }
      });
    });
    return promise;
  };

  module.exports = function(options) {
    var promise;
    promise = new Rsvp.Promise(function(resolve, reject) {
      var defaults, params;
      defaults = {
        baseURL: ['https://', options.apiConfig.apiKey, ':', options.apiConfig.password, '@', options.apiConfig.shop].join(''),
        what: 'products',
        qs: {
          limit: 250
        }
      };
      params = _.assign(defaults, options, function(value, other, key) {
        if (_.isPlainObject(value)) {
          return _.defaults(value, other);
        }
        return value;
      });
      console.log("Fetching " + params.what + " from " + options.apiConfig.shop);
      return getPageCount(params).then(function(totalPages) {
        if (totalPages === 0) {
          return [];
        } else {
          return getItems(params, totalPages);
        }
      }).then(function(allPages) {
        return resolve(allPages);
      })["catch"](function(error) {
        console.log("Error!");
        console.log(error);
        return reject(error);
      });
    });
    return promise;
  };

}).call(this);
