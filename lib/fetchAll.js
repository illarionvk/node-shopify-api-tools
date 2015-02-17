(function() {
  "use strict";
  var Rsvp, appendItems, async, fs, getItems, getPageCount, request, _;

  fs = require('fs');

  request = require('request');

  _ = require('lodash');

  async = require('async');

  Rsvp = require('rsvp');

  appendItems = function(body, info) {
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
              asyncResult = appendItems(body, {
                pageNumber: pageNumber,
                totalPages: totalPages
              });
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
      var params;
      params = {
        baseURL: ['https://', options.apiConfig.apiKey, ':', options.apiConfig.password, '@', options.apiConfig.shop].join(''),
        qs: options.qs || {},
        what: options.what.replace(/^\//gi, '').replace(/\/$/gi, '').toLowerCase()
      };
      params.qs.limit = (function() {
        if (options.qs != null) {
          return options.qs.limit || 250;
        } else {
          return 250;
        }
      })();
      console.log("Fetching " + params.what + " from " + options.apiConfig.shop);
      return getPageCount(params).then(function(totalPages) {
        if (totalPages === 0) {
          return [];
        } else {
          return getItems(params, totalPages);
        }
      }, function(error) {
        console.log("Error!");
        console.log(error);
        return reject(error);
      }).then(function(allPages) {
        return resolve(allPages);
      }, function(error) {
        return reject(error);
      });
    });
    return promise;
  };

}).call(this);