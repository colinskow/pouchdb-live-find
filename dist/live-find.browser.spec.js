(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
module.exports = Deferred
Deferred.defer = defer

function Deferred(Promise) {
  if (Promise == null) Promise = global.Promise
  if (this instanceof Deferred) return defer(Promise, this)
  else return defer(Promise, Object.create(Deferred.prototype))
}

function defer(Promise, deferred) {
  deferred.promise = new Promise(function(resolve, reject) {
    deferred.resolve = resolve
    deferred.reject = reject
  })

  return deferred
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],2:[function(require,module,exports){
'use strict';
/* jshint mocha: true */

var expect, PouchDB, memdown;

if(typeof window === 'undefined') {
  expect = require('chai').expect;
  PouchDB = require('pouchdb');
  memdown = require('memdown');
  PouchDB.plugin(require('pouchdb-find'));
  PouchDB.plugin(require('../lib/index'));
} else {
  expect = window.chai.expect;
  expect = window.chai.expect;
  PouchDB = window.PouchDB;
}

var UpdateWatcher = require('./watcher');

var smashers1 = [
  { name: 'Mario', _id: 'mario', series: 'Mario', debut: 1981 },
  { name: 'Jigglypuff', _id: 'puff', series: 'Pokemon', debut: 1996 },
  { name: 'Link', _id: 'link', series: 'Zelda', debut: 1986 },
  { name: 'Donkey Kong', _id: 'dk', series: 'Mario', debut: 1981 },
  { name: 'Pikachu', series: 'Pokemon', _id: 'pikachu', debut: 1996 },
  { name: 'Captain Falcon', _id: 'falcon', series: 'F-Zero', debut: 1990 }
];

var smashers2 = [
  { name: 'Luigi', _id: 'luigi', series: 'Mario', debut: 1983 },
  { name: 'Fox', _id: 'fox', series: 'Star Fox', debut: 1993 },
  { name: 'Ness', _id: 'ness', series: 'Earthbound', debut: 1994 },
  { name: 'Samus', _id: 'samus', series: 'Metroid', debut: 1986 },
  { name: 'Yoshi', _id: 'yoshi', series: 'Mario', debut: 1990 },
  { name: 'Kirby', _id: 'kirby', series: 'Kirby', debut: 1992 }
];

describe('PouchDB LiveFind', function() {

  var previous;
  var db = createDB('liveFindTest');
  var feed1, feed2, feed3, feed4, feed5, feed6;
  var watcher1, watcher2, watcher3, watcher4, watcher5, watcher6;

  before(function() {
    previous = db.createIndex({
      index: {fields: ['series', 'debut']}
    });
    return previous;
  });

  after(function() {
    return db.destroy();
  });

  it('should perform the initial query', function() {
    var ready = false;
    function waitForReady(feed) {
      feed.once('ready', function() {
        ready = true;
        expect(watcher1.updateCount).to.equal(2);
      });
    }
    return previous
      .then(function() {
        return db.bulkDocs(smashers1);
      })
      .then(function () {
        feed1 = db.liveFind({
          selector: {series: 'Mario'},
          sort: [{series: 'desc'}, {debut: 'desc'}]
        });
        waitForReady(feed1);
        watcher1 = new UpdateWatcher(feed1);
        expect(db._activeQueries).to.equal(1);
        expect(db._changeListener.listenerCount('change')).to.equal(1);
        return watcher1.awaitUpdates(['ADD:mario', 'ADD:dk']);
      })
      .then(function() {
        // Test that the ready event fired after initial query
        expect(ready).to.equal(true);
      });
  });

  it('the query should update as matching docs are added', function() {
    return previous
      .then(function() {
        watcher1.reset();
        return Promise.all([
          watcher1.awaitUpdates(['ADD:luigi', 'ADD:yoshi']),
          db.bulkDocs(smashers2)
        ]);
      })
      .then(function() {
        expect(watcher1.updateCount).to.equal(2);
      })
      .then(function() {
        return Promise.all( [
          watcher1.awaitUpdates(['ADD:wario']),
          db.put({ name: 'Wario', _id: 'wario', series: 'Mario', debut: 1992 })
        ]);
      })
      .then(function() {
        expect(watcher1.updateCount).to.equal(3);
      });
  });

  it('the query should not update if an added doc does not match', function() {
    return previous
      .then(function() {
        watcher1.reset();
        return db.put({ name: 'Mega Man', _id: 'megaman', series: 'Mega Man', debut: 1987 });
      })
      .then(function() {
        expect(watcher1.updateCount).to.equal(0);
      });
  });

  it('should remove an updated doc that no longer matches', function() {
    return previous
      .then(function() {
        expect(watcher1.updateCount).to.equal(0);
        watcher1.reset();
        return db.get('dk');
      })
      .then(function(doc) {
        doc.series = 'Donkey Kong';
        return Promise.all([
          watcher1.awaitUpdates(['REMOVE:dk']),
          db.put(doc)
        ]);
      })
      .then(function() {
        expect(watcher1.updateCount).to.equal(1);
      });
  });

  it('should update when a matching doc is changed', function() {
    return previous
      .then(function() {
        watcher1.reset();
        return db.get('mario');
      })
      .then(function(doc) {
        doc.debut = 1980;
        return Promise.all([
          watcher1.awaitUpdates(['UPDATE:mario']),
          db.put(doc)
        ]);
      })
      .then(function() {
        expect(watcher1.updateCount).to.equal(1);
      });
  });

  it('should remove a matching doc that is deleted', function() {
    return previous
      .then(function() {
        watcher1.reset();
        return db.get('yoshi');
      })
      .then(function(doc) {
        return Promise.all([
          watcher1.awaitUpdates(['REMOVE:yoshi']),
          db.remove(doc)
        ]);
      })
      .then(function() {
        expect(watcher1.updateCount).to.equal(1);
      });
  });
  
  it('should add a second query', function() {
    return previous
      .then(function() {
        watcher1.reset();
        feed2 = db.liveFind({
          selector: {series: {$eq: 'Star Fox'}}
        });
        watcher2 = new UpdateWatcher(feed2);
        expect(db._activeQueries).to.equal(2);
        expect(db._changeListener.listenerCount('change')).to.equal(2);
        return watcher2.awaitUpdates(['ADD:fox']);
      })
      .then(function() {
        expect(watcher1.updateCount).to.equal(0);
        expect(watcher2.updateCount).to.equal(1);
        return Promise.all( [
          watcher2.awaitUpdates(['ADD:slippy']),
          db.put({ name: 'Slippy Toad', _id: 'slippy', series: 'Star Fox', debut: 1990 })
        ]);
      })
      .then(function() {
        expect(watcher1.updateCount).to.equal(0);
        expect(watcher2.updateCount).to.equal(2);
      });
  });

  it('should properly cancel the listeners', function() {
    var cancelled = false;
    // Test that the 'cancelled' event is properly fired
    function waitForCancel(feed) {
      feed.once('cancelled', function() {
        cancelled = true;
      });
    }
    return previous
      .then(function() {
        watcher1.reset();
        watcher2.reset();
        var listeners = db._changeListener.listeners('change');
        expect(listeners.length).to.equal(2);
        expect(listeners[0]).to.not.equal(listeners[1]);
        waitForCancel(feed1);
        feed1.cancel();
        expect(cancelled).to.equal(true);
        expect(db._activeQueries).to.equal(1);
        expect(db._changeListener.listenerCount('change')).to.equal(1);
        return Promise.all( [
          watcher2.awaitUpdates(['ADD:peppy']),
          db.put({ name: 'Peppy', _id: 'peppy', series: 'Star Fox', debut: 1990 }),
          db.put({ name: 'Peach', _id: 'peach', series: 'Mario', debut: 1980 })
        ]);
      })
      .then(function() {
        expect(watcher1.updateCount).to.equal(0);
        expect(watcher2.updateCount).to.equal(1);
        feed2.cancel();
        expect(db._activeQueries).to.equal(0);
        expect(db._changeListener).to.be.an('undefined');
      });
  });

  it('should return only selected fields', function() {
    return previous
      .then(function() {
        feed3 = db.liveFind({
          selector: {series: {$eq: 'Kirby'}},
          fields: ['name']
        });
        watcher3 = new UpdateWatcher(feed3);
        expect(db._activeQueries).to.equal(1);
        expect(db._changeListener.listenerCount('change')).to.equal(1);
        return watcher3.passNextUpdate();
      })
      .then(function(info) {
        var doc = info.doc;
        expect(info.id).to.equal('kirby');
        expect(doc._id).to.be.an('undefined');
        expect(doc.name).to.be.a('string');
        expect(doc.series).to.be.an('undefined');
        expect(doc._rev).to.be.an('undefined');
        expect(watcher3.updateCount).to.equal(1);
        return Promise.all([
          watcher3.passNextUpdate(),
          db.put({ name: 'King Dedede', _id: 'dedede', series: 'Kirby', debut: 1992 })
        ]);
      })
      .then(function(result) {
        var doc = result[0].doc;
        expect(result[0].id).to.equal('dedede');
        expect(doc._id).to.be.an('undefined');
        expect(doc.name).to.be.a('string');
        expect(doc.series).to.be.an('undefined');
        expect(watcher3.updateCount).to.equal(2);
        feed3.cancel();
        expect(db._activeQueries).to.equal(0);
        expect(db._changeListener).to.be.an('undefined');
      });
  });

  it('should create an aggregate list and sort it', function() {
    return previous
      .then(function() {
        return db.destroy();
      })
      .then(function() {
        db = createDB('liveFindTest');
        return db.createIndex({
          index: {fields: ['series', 'name']}
        });
      })
      .then(function() {
        return db.bulkDocs(smashers1);
      })
      .then(function () {
        feed4 = db.liveFind({
          selector: {series: 'Mario'},
          sort: [{series: 'desc'}, {name: 'desc'}],
          aggregate: true
        });
        watcher4 = new UpdateWatcher(feed4);
        return watcher4.fetchListUpdates(2);
      })
      .then(function(aggregates) {
        expect(aggregates).to.deep.equal([ ['mario'], ['dk', 'mario'] ]);
        return Promise.all([
          watcher4.fetchListUpdates(2),
          db.bulkDocs(smashers2)
        ]);
      })
      .then(function(result) {
        // Testing add to list
        var aggregates = result[0];
        expect(aggregates).to.deep.equal([
          [ 'dk', 'luigi', 'mario' ],
          [ 'dk', 'luigi', 'mario', 'yoshi' ] ]
        );
        return db.get('luigi');
      })
      .then(function(luigi) {
        // Testing remove
        return Promise.all([
          watcher4.fetchListUpdates(1),
          db.remove(luigi)
        ]);
      })
      .then(function(result) {
        var aggregates = result[0];
        expect(aggregates).to.deep.equal([ [ 'dk', 'mario', 'yoshi' ] ]);
        return db.get('yoshi');
      })
      .then(function(yoshi) {
        // Testing update
        yoshi.name = 'AYoshi';
        return Promise.all([
          watcher4.fetchListUpdates(1),
          db.put(yoshi)
        ]);
      })
      .then(function(result) {
        var aggregates = result[0];
        expect(aggregates).to.deep.equal([ [ 'yoshi', 'dk', 'mario' ] ]);
        feed4.cancel();
      });
  });

  it('should aggregate a list with no sort', function() {
    return previous
      .then(function () {
        feed5 = db.liveFind({
          selector: {series: 'Kirby'},
          aggregate: true
        });
        watcher5 = new UpdateWatcher(feed5);
        return watcher5.fetchListUpdates(1);
      })
      .then(function(aggregates) {
        expect(aggregates).to.deep.equal([ ['kirby'] ]);
        return Promise.all([
          watcher5.fetchListUpdates(1),
          db.put({ name: 'King Dedede', _id: 'dedede', series: 'Kirby', debut: 1992 })
        ]);
      })
      .then(function(result) {
        // Testing add to list
        var aggregates = result[0];
        expect(aggregates).to.deep.equal([ [ 'kirby', 'dedede' ] ]);
        feed5.cancel();
      });
  });

  it('should sort and apply skip and limit', function() {
    return previous
      .then(function() {
        return db.destroy();
      })
      .then(function() {
        db = createDB('liveFindTest');
        return db.createIndex({
          index: {fields: ['series', 'name']}
        });
      })
      .then(function() {
        return db.bulkDocs(smashers1);
      })
      .then(function () {
        feed6 = db.liveFind({
          selector: {series: {$gt: null}},
          sort: [{series: 'desc'}, {name: 'desc'}],
          aggregate: true,
          skip: 2,
          limit: 3
        });
        watcher6 = new UpdateWatcher(feed6);
        return watcher6.fetchListUpdates(6);
      })
      .then(function(aggregates) {
        expect(aggregates).to.deep.equal([
            [],
            [],
            [ 'link' ],
            [ 'pikachu', 'link' ],
            [ 'puff', 'pikachu', 'link' ],
            [ 'mario', 'puff', 'pikachu' ] ]);
      });
  });

  it('should have a working custom sort function', function() {
    return previous
      .then(function() {
        var sorted = feed6.sort(smashers1).map(function(item) {
          return item._id;
        });
        expect(sorted).to.deep.equal([ 'falcon', 'dk', 'mario', 'puff', 'pikachu', 'link' ]);
        feed6.cancel();
      });
  });

  it('should throw an error if pouchdb-find is not loaded', function() {
    return previous
      .then(function() {
        db._oldFind = db.find;
        db.find = null;
        var fn = function() {
          db.liveFind({
            selector: {series: 'Mario'},
            sort: [{series: 'desc'}, {name: 'desc'}]
          });
        };
        expect(fn).to.throw(/requirement/);
      });
  });

});

function createDB(name) {
  if(typeof window === 'undefined') {
    return new PouchDB(name, {db: memdown});
  }
  return new PouchDB(name, {adapter: 'memory'});
}
},{"../lib/index":undefined,"./watcher":3,"chai":undefined,"memdown":undefined,"pouchdb":undefined,"pouchdb-find":undefined}],3:[function(require,module,exports){
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
},{"promise-defer":1}]},{},[2]);
