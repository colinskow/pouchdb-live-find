# PouchDB LiveFind

[![Build Status](https://travis-ci.org/colinskow/pouchdb-live-find.png?branch=master)](https://travis-ci.org/colinskow/pouchdb-live-find)

**Live PouchDB queries that update automatically as changes come in!**

## Why

The biggest problem with traditional database queries is that they don't update themselves as the data changes. This is no problem for server-side rendering where the user needs to refresh the browser for updates. But modern web app users demand that the data on the screen is up-to-date all the time!

Keeping the U.I. up-to-date with changing data is a huge challenge for developers. Using PouchDB, the most common method is to build application state from the changes feed. But this becomes slow and impractical with large data sets.

**LiveFind** allows you to effortlessly keep your U.I. synchronized with a subset of your data in an efficient way. It is designed to perfectly complement `flux` and `redux` type architectures.

## How It Works

**PouchDB LiveFind** uses `pouchdb-find` to provide initial query results, and then checks every change after that to see if it matches your selector. You are informed every time a change adds, updates, or removes an item from your query.

LiveFind can optionally "keep state" and maintain an aggregate list of all the docs that match your query, which is passed with each update. Each change is immutable (generates a new object) so this plays really nicely with frameworks like React and Angular.

## Setup

#### Dependencies

LiveFind requires `pouchdb`. In addition `pouchdb-find` must be loaded as a plugin.

#### In the browser

To use this plugin in the browser, include it after `pouchdb.js` and `pouchdb.find.js` in your HTML page:

```html
<script src="pouchdb.js"></script>
<script src="pouchdb.find.js"></script>
<script src="pouchdb.live-find.js"></script>
```

You can download the necessary packages from Bower:

```
bower install pouchdb pouchdb-find pouchdb-live-find
```

#### In Node.js/Browserify

Or to use it in Node.js, just npm install the packages:

```
npm install pouchdb pouchdb-find pouchdb-live-find
```

And then attach it to the `PouchDB` object:

```js
var PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-find'));
PouchDB.plugin(require('pouchdb-live-find'));
```

## Basic Usage

```js
var db = new PouchDB('live-find');

// This assumes you have created your find index and seeded your initial documents. 

// Start our live query
var liveFeed = db.liveFind({
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
```

For more information see `examples/tutorial.js`.

## API

LiveFind uses the exact same API as [`pouchdb-find`](https://github.com/nolanlawson/pouchdb-find) with the addition of the `aggregate` option. Also LiveFind has none of the sort restrictions of PouchDB Find. You can sort by any list of fields, and even with mixed sort directions. (Just make sure the `fields` options doesn't remove fields needed to sort.) For details, see the [`pouchdb-find` documentation](https://github.com/nolanlawson/pouchdb-find) as well as [Cloudant Query](https://docs.cloudant.com/cloudant_query.html).

#### `db.liveFind(request)`

`request` is an object which contains:

* `selector` (`object`) the `pouchdb-find` selector to filter your results
* `fields` (`array`, optional) a list of fields you want to receive. (Don't leave out the fields needed to sort your list.)
* `aggregate` (`boolean`, optional) if `true` outputs an aggregate list on every `update` event
* `sort` (`array`, optional) defines the sort order (aggregate list only)
* `limit` (`number`, optional) maximum number of docs to return (aggregate list only)
* `skip` (`number`, optional) the number of docs to skip (aggregate list only)

**Returns:** `liveFeed` object, which contains the following methods:

* `liveFeed.cancel()` stops the query and removes all listeners
* `liveFeed.then(...)` hooks into the `pouchdb-find` promise and resolves when the initial query is complete
* `liveFeed.catch(...)` hooks into the `pouchdb-find` promise and catches any errors with the initial query
* `liveFeed.sort(list)` a convenience function to sort any list in place by the `sort` order you provided. (This will mutate the Array.)
* `liveFeed.paginate(options)` updates the pagination and sorting of the aggregate list and immediately returns the updated list. Available options are `sort`, `skip`, and `limit`.

#### Events

`liveFeed` is also an event emitter and fires the following events:

* `update`: (`update`, `aggregate`) fired every time there are changes in your query results (explained below)
* `ready`: fired after the initial query is complete
* `cancelled`: fired when you cancel the query using `liveFeed.cancel()`
* `error`: (`err`) fired in case of any error that occurs while listening to changes

The `update` object contains the following properties:

* `action`: (`string`) one of `'ADD'`, `'UPDATE'`, or `'REMOVE'`.
* `id`, `rev`, and `doc`: these are the standard properties from the CouchDB changes feed. The fields inside `doc` will be filtered if you specified the `fields` option in your request.

`aggregate` is an array of docs representing the current state of everything that matches your query. This will only be present if you specified `aggregate: true` in the request options. It will also apply the `sort`, `skip` and `limit` options before giving you the data.

## Performance Tips

If you are using `aggregate` to update your application U.I., you will most likely want to implement some type of debouncing. Every single change generates an `update` event, so you will want to wait until they stop coming to refresh the screen. Any delay less than 50ms will likely not be perceived by the user.

```js
var debounce = require('lodash.debounce');
var debouncedRefresh = debounce(refreshUI, 50);

liveFeed.on('update', function(update, aggregate) {
  debouncedRefresh(aggregate);
});
```

## Optimizing Your Build

`pouchdb-find` and `pouchdb-live-find` share several dependencies. You can likely reduce your build size if you build them together using a tool like Browserify or Webpack.

## Release History

* **0.4.0** (2017-01-13) - Fixed breaking changes caused by `pouchdb-find` integration into mono-repo
* **0.3.0** (2017-01-13) - Upgraded dependencies to support `pouchdb-find v0.10.x` and `pouchdb v.6.x.x`
* **0.2.0** (2016-05-25) - Added pagination and the ability to sort by any list of fields with mixed directions
* **0.1.0** (2016-05-19) - Initial Release
