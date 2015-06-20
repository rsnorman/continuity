/*!
 * continuity
 * Copyright(c) 2015 Ryan Scott Norman
 * MIT Licensed
 */

'use strict';

/**
 * Creates an object that iterates over a collection and passing values
 * into asynchronous functions that returns promises. Each function must wait
 * until the previous one has finished before starting.
 *
 * The `then` method will return all the values resolved by the promises:
 *
 *       new Continuity([1, 2], function(value) {
 *         new Promise(function(resolve) {
 *           resolve(value + 1);
 *         });
 *       }).then(function(values) {
 *         assert(values == [2, 3]);
 *       });
 *
 * The `progress` method will return the value resolved by the current
 * executing promise along with all the returned values and progress:
 *
 *       new Continuity([1, 2], function(value) {
 *         new Promise(function(resolve) {
 *           resolve(value + 1);
 *         });
 *       }).progress(function(value, values, progress) {
 *         assert(value == 2 || value == 3);
 *         assert(values == [2] || values == [2, 3]);
 *         assert(progress == 1 || progress == 2);
 *       });
 *
 * The `catch` method behaves like a Promise in that it returns the object that
 * that caused the promise to reject.
 *
 * @param {Array} Array-like object that will be used to call promise returning function
 * @param {Function} function that returns promises and will be called with array values
 * @return {Continuity} for thenable methods and progress callback
 * @public
 */
var Continuity = function(collection, promiseFn) {
  var continuity,
      promise,
      reject,
      resolve,
      progressCallbacks;

  // Empty array of progress callbacks
  progressCallbacks = [];


  /**
   * Recursive function that queues up promise functionswith values in collection
   *
   * @param {Array} Array-like object that will be used to call promise returning function
   * @param {Function} function that returns promises and will be called with array values
   * @param {Array} values that have been returned from promises
   * @private
   */
  function collectionIterator(collection, promiseFn, values) {
    collection = Array.prototype.slice.call(collection);
    values = Array.prototype.slice.call(values);

    promiseFn(collection[0])
      .then(function(value) {
        collection.shift();
        values.push(value);

        // fire all progress callbacks on each iteration
        progressCallbacks.map(function(callback) {
          callback(value, values, values.length);
        });

        // Still have more to run, execute another promise function
        if ( collection.length > 0 ) {
          collectionIterator(collection, promiseFn, values);
        }

        // All done, resolve promise
        else {
          resolve(values);
        }

      })
      .catch(reject);
  }


  /**
   * Create promise to resolve once all other promises are resolved.
   * Store resolve and reject functions so we can chain with a Promise-like
   * object.
   */
  promise = new Promise(function(_resolve, _reject) {
    resolve = _resolve;
    reject = _reject;
    collectionIterator(collection, promiseFn, []);
  });


  /**
   * Returns Promise-like object that allows thenable chains along with
   * progress callbacks that fire on each iteration.
   */
  continuity = {
    then: function(callback) {
      promise.then(callback);
      return continuity;
    },
    catch: function(callback) {
      promise.catch(callback);
      return continuity;
    },
    progress: function(callback) {
      progressCallbacks.push(callback);
      return continuity;
    }
  };

  return continuity;

};

/**
 * Module exports
 * @public
 */
module.exports = Continuity;
