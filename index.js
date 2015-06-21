/*!
 * continuity
 * Copyright(c) 2015 Ryan Scott Norman
 * MIT Licensed
 */

'use strict';

/**
 * Creates an object that iterates over a collection and passing values
 * into asynchronous functions that resolve or reject promises. Each function
 * must wait until the previous one has finished before starting.
 *
 * The `then` method will return all the values resolved by the promises:
 *
 *       new Continuity([1, 2], function(value, resolve) {
 *         resolve(value + 1);
 *       }).then(function(values) {
 *         assert(values == [2, 3]);
 *       });
 *
 * The `progress` method will return the value resolved by the current
 * executing promise along with all the returned values and progress:
 *
 *       new Continuity([1, 2], function(value, resolve) {
 *         resolve(value + 1);
 *       }).progress(function(value, values, progress) {
 *         // First iteration
 *         if ( progress == 1 ) {
 *           assert(value == 2);
 *           assert(values == [2]);
 *           assert(progress == 1);
 *         }
 *
 *         // Second iteration
 *         else {
 *           assert(value == 3);
 *           assert(values == [2, 3]);
 *           assert(progress == 2);
 *         }
 *       });
 *
 * The `catch` method behaves like a Promise in that it returns the object that
 * that caused the promise to reject, effectively stopping the iterator.
 *
 *       new Continuity([1, 2], function(value, resolve, reject) {
 *         reject('Dislike this value: ' + value);
 *       }).catch(function(error) {
 *         assert(error == 'Dislike this value: 1');
 *       });
 *
 * @param {Array} Array-like object that will be used to call function
 * @param {Function} asynchronous function that will be called with array value
 * @return {Continuity} for thenable methods and progress callback
 * @public
 */
var Continuity = function(collection, iterationFn) {
  var continuity,
      promise,
      reject,
      resolve,
      progressCallbacks;

  // Empty array of progress callbacks
  progressCallbacks = [];


  /**
   * Recursive function that queues up functions that resolve or reject promises
   * with values in collection
   *
   * @param {Array} Array-like object that will be used to call promise returning function
   * @param {Function} function that returns promises and will be called with array values
   * @param {Array} values that have been returned from promises
   * @private
   */
  function collectionIterator(collection, values) {
    collection = Array.prototype.slice.call(collection);
    values = Array.prototype.slice.call(values);

    // Create iteration promise to pass resolver and rejecter into function
    new Promise(function(iterationResolve, iterationReject) {
      iterationFn(collection[0], iterationResolve, iterationReject)
    })

    // Resolved iteration
    .then(function(value) {

      // push newest value
      values.push(value);

      // fire all progress callbacks on each iteration
      progressCallbacks.map(function(callback) {
        callback(value, collection[0], values, values.length);
      });

      // dequeue value in collection
      collection.shift();

      // Still have more to run, execute another promise function
      if ( collection.length > 0 ) {
        collectionIterator(collection, values);
      }

      // All done, resolve promise
      else {
        resolve(values);
      }

    })

    // Rejected iteration
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
    collectionIterator(collection, []);
  });

  this.then = function(callback) {
    promise.then(callback);
    return this;
  };

  this.catch = function(callback) {
    promise.catch(callback);
    return this;
  };

  this.progress = function(callback) {
    progressCallbacks.push(callback);
    return this;
  };

};

/**
 * Module exports
 * @public
 */
module.exports = Continuity;
