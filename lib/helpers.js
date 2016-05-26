'use strict';
var collate = require('pouchdb-collate').collate;
var filterInMemoryFields = require('pouchdb-find/lib/adapters/local/find/in-memory-filter');
var utils = require('pouchdb-find/lib/utils');
var localUtils = require('pouchdb-find/lib/adapters/local/utils');
var getUserFields = localUtils.getUserFields;
var getKey = localUtils.getKey;
var getValue = localUtils.getValue;
var parseField = localUtils.parseField;

exports.memoryFilter = function(docs, requestDef) {
  var userFieldsRes = getUserFields(requestDef.selector, requestDef.sort);
  var userFields = userFieldsRes.fields;
  var rows = docs.map(function(doc) { return {doc: doc}; });
  return filterInMemoryFields(rows, requestDef, userFields)
    .map(function(row) {
      return row.doc;
    });
};

// create a comparator based on the sort object
exports.createFieldSorter = function(sort) {

  function getFieldValuesAsArray(doc) {
    return sort.map(function (sorting) {
      var fieldName = getKey(sorting);
      var parsedField = parseField(fieldName);
      var docFieldValue = getFieldFromDoc(doc, parsedField);
      return docFieldValue;
    });
  }

  var directions = sort.map(function(sorting) {
    if (typeof sorting !== 'string' &&
      getValue(sorting) === 'desc') {
      return -1;
    }
    return 1;
  });

  return function (aRow, bRow) {
    var aFieldValues = getFieldValuesAsArray(aRow);
    var bFieldValues = getFieldValuesAsArray(bRow);
    for(var i=0, len=directions.length; i<len; i++) {
      var collation = collate(aFieldValues[i], bFieldValues[i]);
      if (collation !== 0) {
        return collation * directions[i];
      }
    }
    // this is what mango seems to do
    return utils.compare(aRow._id, bRow._id) * directions[0];
  };
};

function getFieldFromDoc(doc, parsedField) {
  var value = doc;
  for (var i = 0, len = parsedField.length; i < len; i++) {
    var key = parsedField[i];
    value = value[key];
    if (!value) {
      break;
    }
  }
  return value;
}