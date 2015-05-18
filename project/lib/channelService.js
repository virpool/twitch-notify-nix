'use strict';

var storage = require('./storage')
  , when    = require('when');

exports.fetchAll = function () {
    var deferred = when.defer();
    storage
        .getDefault()
        .find({})
        .sort({order: 1})
        .exec(function (err, channels) {
            if (err) return deferred.reject(err);
            deferred.resolve(channels);
        });
    return deferred.promise;
}

exports.insert = function (channel) {
    var deferred = when.defer();
    storage
        .getDefault()
        .insert(channel, function (err, obj) {
            if (err) return deferred.reject(err);
            deferred.resolve(obj);
        });
    return deferred.promise;
}

exports.remove = function (channel) {
    var deferred = when.defer();
    storage
        .getDefault()
        .remove({ _id: channel._id }, {}, function (err, numRemoved) {
            if (err) return deferred.reject(err);
            deferred.resolve();
        });
    return deferred.promise;
}
