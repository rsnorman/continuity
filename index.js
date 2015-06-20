/*!
 * continuity
 * Copyright(c) 2015 Ryan Scott Norman
 * MIT Licensed
 */

'use strict';

var Continuity = function(collection, promiseFn) {
  var _continuity, _promise, reject, resolve, progressCallbacks;
  progressCallbacks = [];

  function collectionIterator(collection, promiseFn, values) {
    collection = Array.prototype.slice.call(collection);
    values = Array.prototype.slice.call(values);

    promiseFn(collection[0])
      .then(function(value) {
        collection.shift();
        values.push(value);

        progressCallbacks.map(function(callback) {
          callback(value, values, values.length);
        });

        if ( collection.length > 0 ) {
          collectionIterator(collection, promiseFn, values);
        } else {
          resolve(values);
        }

      })
      .catch(reject);
  }

  _promise = new Promise(function(_resolve, _reject) {
    resolve = _resolve;
    reject = _reject;
    collectionIterator(collection, promiseFn, []);
  });

  _continuity = {
    then: function(callback) {
      _promise.then(callback);
      return _continuity;
    },
    catch: function(callback) {
      _promise.catch(callback);
      return _continuity;
    },
    progress: function(callback) {
      progressCallbacks.push(callback);
      return _continuity;
    }
  };

  return _continuity;

};

/**
 * Module exports
 * @public
 */
module.exports = Continuity;
