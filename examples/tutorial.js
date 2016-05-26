'use strict';

// Setup for Node or Browserify. Skip if loading via browser script tags.
if(typeof window !== 'object') {
  var PouchDB = require('pouchdb');
  PouchDB.plugin(require('pouchdb-find'));
  PouchDB.plugin(require('../lib/index'));
}

// Initial documents to seed
var smashers = [
  { name: 'Mario', _id: 'mario', series: 'Mario', debut: 1981 },
  { name: 'Jigglypuff', _id: 'puff', series: 'Pokemon', debut: 1996 },
  { name: 'Link', _id: 'link', series: 'Zelda', debut: 1986 },
  { name: 'Donkey Kong', _id: 'dk', series: 'Mario', debut: 1981 }
];

var db = new PouchDB('live-find', {db: require('memdown')});
var liveFeed;

// We need to create an index for pouchdb-find
db.createIndex({
  index: {fields: ['series', 'name']}
})

// Seed initial documents
.then(function() {
  return db.bulkDocs(smashers);
})

// Start our live query
.then(function() {
  liveFeed = db.liveFind({
    selector: {series: 'Mario'},
    sort: [{series: 'desc'}, {name: 'desc'}],
    aggregate: true
  })
    // Called every time there is an update to the query
    .on('update', function(update, aggregate) {
      // update.action is 'ADD', 'UPDATE', or 'REMOVE'
      // update also contains id, rev, and doc
      console.log(update.action, update.id);
      // aggregate is an array of docs containing the latest state of the query
      // the array is immutable which means that every change is a new Object
      // this plays well with rendering engines like React and Angular
      // change detection can be done by simply Object equality, `oldDoc === newDoc`
      refreshUI(aggregate);
      // (refreshUI would be a function you write to pipe the changes to your rendering engine)
    })
    // Called when the initial query is complete
    .on('ready', function() {
      console.log('Initial query complete.');
    })
    // Called when you invoke `liveFeed.cancel()`
    .on('cancelled', function() {
      console.log('LiveFind cancelled.');
    })
    // Called if there is any error
    .on('error', function(err) {
      console.error('Oh no!', err);
    });
  // liveFeed also contains a promise that will resolve when the initial query is complete
  return liveFeed;
})

/* Outputs:
 ADD dk
 New List:  [ 'Donkey Kong' ]
 ADD mario
 New List:  [ 'Mario', 'Donkey Kong' ]
 Initial query complete.
*/


// Add a doc
.then(function() {
  var doc = { name: 'Wario', _id: 'wario', series: 'Mario', debut: 1992 };
  return db.put(doc);
})
  
/* Outputs:
 ADD wario
 New List:  [ 'Wario', 'Mario', 'Donkey Kong' ]
*/

// Update a doc
.then(function() {
  return db.get('mario');
})
.then(function(mario) {
  mario.name = 'Baby Mario';
  return db.put(mario);
})

/* Outputs:
 UPDATE mario
 New List:  [ 'Wario', 'Donkey Kong', 'Baby Mario' ]
*/

// When a doc no longer matches your query it is removed
.then(function() {
  return db.get('dk');
}).then(function(dk) {
  dk.series = 'Donkey Kong';
  return db.put(dk);
})

/* Outputs:
 REMOVE dk
 New List:  [ 'Wario', 'Baby Mario' ]
*/

// You can use the paginate function to change the sort order, skip and limit on the fly
.then(function() {
  setTimeout(function() {
    var newList = liveFeed.paginate({
      sort: [{name: 'asc'}]
    });
    refreshUI(newList);
  }, 10);
})

/* Outputs:
 REMOVE dk
 New List:  [ 'Baby Mario', 'Wario' ]
*/

// When a change has no impact on your query nothing happens
.then(function() {
  var doc = { name: 'Kirby', _id: 'kirby', series: 'Kirby', debut: 1992 };
  return db.put(doc);
})
// (Outputs nothing)

// When you are done listening to updates cancel the listener to save resources
.then(function() {
  // setTimeout prevents the feed from cancelling before it is finished processing updates
  setTimeout(function() {
    liveFeed.cancel();
  }, 25);
});
// Outputs: "LiveFind cancelled."

// In a production app this would render the new list on the screen
// Right now we are just going to console.log the names in order
function refreshUI(list) {
  var output = list.map(function(item) {
    return item.name;
  });
  console.log('New List: ', output);
}