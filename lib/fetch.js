(function() {
  'use strict';
  var Rsvp, _, request;

  request = require('request');

  _ = require('lodash');

  Rsvp = require('rsvp');

  module.exports = function(options) {
    var promise;
    promise = new Rsvp.Promise(function(resolve, reject) {
      var defaults, params;
      defaults = {
        baseURL: ['https://', options.apiConfig.apiKey, ':', options.apiConfig.password, '@', options.apiConfig.shop].join(''),
        what: 'themes',
        qs: {
          limit: 250
        }
      };
      params = _.merge(defaults, options);
      console.log("Fetching " + params.what + " from " + options.apiConfig.shop);
      return request({
        method: 'GET',
        uri: params.baseURL + ("/admin/" + params.what + ".json"),
        qs: params.qs
      }, function(err, res, body) {
        var results;
        if (err != null) {
          console.log('Error!');
          console.dir(err);
          return reject(err);
        }
        if (res.statusCode !== 200) {
          console.log("ERROR " + res.statusCode);
          return reject(res.statusCode);
        }
        results = JSON.parse(body);
        return resolve(results[params.what]);
      });
    });
    return promise;
  };

}).call(this);
