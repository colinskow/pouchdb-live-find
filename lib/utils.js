'use strict';

var selectorCore = require('pouchdb-selector-core');
var getKey = selectorCore.getKey;
var getFieldFromDoc = selectorCore.getFieldFromDoc;
var setFieldInDoc = selectorCore.setFieldInDoc;
var parseField = selectorCore.parseField;

// determine the maximum number of fields
// we're going to need to query, e.g. if the user
// has selection ['a'] and sorting ['a', 'b'], then we
// need to use the longer of the two: ['a', 'b']
exports.getUserFields = function(selector, sort) {
  var selectorFields = Object.keys(selector);
  var sortFields = sort? sort.map(getKey) : [];
  var userFields;
  if (selectorFields.length >= sortFields.length) {
    userFields = selectorFields;
  } else {
    userFields = sortFields;
  }

  if (sortFields.length === 0) {
    return {
      fields: userFields
    };
  }

  // sort according to the user's preferred sorting
  userFields = userFields.sort(function (left, right) {
    var leftIdx = sortFields.indexOf(left);
    if (leftIdx === -1) {
      leftIdx = Number.MAX_VALUE;
    }
    var rightIdx = sortFields.indexOf(right);
    if (rightIdx === -1) {
      rightIdx = Number.MAX_VALUE;
    }
    return leftIdx < rightIdx ? -1 : leftIdx > rightIdx ? 1 : 0;
  });

  return {
    fields: userFields,
    sortOrder: sort.map(getKey)
  };
};

// normalize the "sort" value
exports.massageSort = function(sort) {
  if (!Array.isArray(sort)) {
    throw new Error('invalid sort json - should be an array');
  }
  return sort.map(function (sorting) {
    if (typeof sorting === 'string') {
      var obj = {};
      obj[sorting] = 'asc';
      return obj;
    } else {
      return sorting;
    }
  });
};

// Selects a list of fields defined in dot notation from one doc
// and copies them to a new doc. Like underscore _.pick but supports nesting.
exports.pick = function(obj, arr) {
  var res = {};
  for (var i = 0, len = arr.length; i < len; i++) {
    var parsedField = parseField(arr[i]);
    var value = getFieldFromDoc(obj, parsedField);
    if (typeof value !== 'undefined') {
      setFieldInDoc(res, parsedField, value);
    }
  }
  return res;
};
