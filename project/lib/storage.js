'use strict';

var Datastore   = require('nedb')
  , path        = require('path');

var dbInstance;
exports.init = function (App, callback) {
    dbInstance = new Datastore({ filename: path.join(App.dataPath, 'main.db') });
    dbInstance.loadDatabase(function (err) {
        callback(err);
    });
}

exports.getDefault = function () {
    return dbInstance;
}
