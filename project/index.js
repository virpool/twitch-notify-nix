var async   = require('async');

var storage = require('./lib/storage');

exports.init = function (callback) {
    var App = window.require('nw.gui').App;
    async.parallel([
        function initStorage(callback) {
            storage.init(App, callback);
        }
    ], function (err) {
        if (err) {
            console.error(err);
            return process.exit(1);
        }
        callback();
    });
}
