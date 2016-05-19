'use strict';
var defer = require("promise-defer");

function UpdateWatcher(feed) {
  this._feed = feed;
  this.reset();
  this._processUpdate = this.processUpdate.bind(this);
  this._feed.on('update', this._processUpdate);
}

UpdateWatcher.prototype.reset = function() {
  this.updateCount = 0;
  this.awaiting = {};
  this.fetchCount = 0;
  this.updates = [];
  this.fetchDefer = null;
};

UpdateWatcher.prototype.processUpdate = function(info, list) {
  this.updateCount ++;
  var key = this.getKey(info);
  if(this.awaiting[key]) {
    this.awaiting[key].resolve();
    delete this.awaiting[key];
  }
  if(this.fetchDefer && this.fetchCount && list) {
    this.updates.push(list.map(function(item) {
      return item._id;
    }));
    this.fetchCount --;
    if(this.fetchCount === 0) {
      this.fetchDefer.resolve(this.updates);
      this.updates = [];
      this.fetchDefer = null;
    }
  }
};

UpdateWatcher.prototype.awaitUpdates = function(keys) {
  var self = this;
  var promises = [];
  keys.forEach(function(key) {
    var deferred = defer();
    self.awaiting[key] = deferred;
    promises.push(deferred.promise);
  });
  return Promise.all(promises);
};

UpdateWatcher.prototype.passNextUpdate = function() {
  var self = this;
  return new Promise(function(resolve) {
    self._feed.once('update', function(info) {
      resolve(info);
    });
  });
};

UpdateWatcher.prototype.fetchListUpdates = function(num) {
  this.fetchDefer = defer();
  this.fetchCount = num;
  return this.fetchDefer.promise;
};

UpdateWatcher.prototype.getKey = function (info) {
  return info.action + ':' + info.id;
};

module.exports = UpdateWatcher;