/*!
 * Continuity
 * Copyright(c) 2015 Ryan Scott Norman
 * MIT Licensed
 */

'use strict';

/**
 * Creates an object that iterates over a collection and passing values
 * into asynchronous functions that resolve or reject promises. Each function
 * must wait until the previous one has finished before starting.
 *
 * To create a Continuity object:
 *
 *       new Continuity([1, 2], function(value, resolve, reject) {
 *
 *         setTimeout(function() {
 *           if ( isNaN(value) ) {
 *             reject('Cannot operate on ' + value + ' because it\'s not a number');
 *           } else {
 *             resolve(value + 1);
 *           }
 *         }, 1000);
 *
 *       });
 *
 * The `then` method will return all the values resolved by the promises:
 *
 *       new Continuity([1, 2], function(value, resolve) {
 *
 *         setTimeout(function() {
 *           resolve(value + 1);
 *         }, 1000);
 *
 *       }).then(function(values) {
 *
 *         assert(values == [2, 3]);
 *
 *       });
 *
 * The `progress` method will return the value resolved by the current
 * executing promise along with the original value, all the returned
 * values and progress:
 *
 *       new Continuity([1, 2], function(value, resolve) {
 *
 *         setTimeout(function() {
 *           resolve(value + 1);
 *         }, 1000);
 *
 *       }).progress(function(value, originalValue, values, progress) {
 *
 *         // First iteration
 *         if ( progress == 1 ) {
 *           assert(value == 2);
 *           assert(originalValue == 1);
 *           assert(values == [2]);
 *           assert(progress == 1);
 *         }
 *
 *         // Second iteration
 *         else {
 *           assert(value == 3);
 *           assert(originalValue == 2);
 *           assert(values == [2, 3]);
 *           assert(progress == 2);
 *         }
 *
 *       });
 *
 * The `catch` method behaves like a Promise in that it returns the object that
 * that caused the promise to reject, effectively stopping the iterator.
 *
 *       new Continuity([1, 2], function(value, resolve, reject) {
 *
 *         setTimeout(function() {
 *           reject('Dislike this value: ' + value);
 *         }, 1000);
 *
 *       }).catch(function(error) {
 *
 *         assert(error == 'Dislike this value: 1');
 *
 *       });
 *
 * @param {Array} collection that will be used to call function
 * @param {Function} asynchronous function that will be called for each value
 *                   in the collection
 * @return {Continuity} for thenable methods and progress callback
 * @public
 */
var Continuity = function(originalCollection, iterationFn) {
  var continuityPromise,
      continuityResolve,
      continuityReject,
      progressCallbacks,
      valueQueue,
      resolvedValues;

  // Empty array of progress callbacks
  progressCallbacks = [];

  // Initialize empty array of values
  resolvedValues = [];

  // Clone collection to create queue of values to call iteration function
  valueQueue = Array.prototype.slice.call(originalCollection);


  /**
   * Returns whether or not there are any values left in the queue
   *
   * @return {Bool} true if valueQueue length is greater than zero,
   *                false otherwise
   * @private
   */
  function isFinishedIterating() {
    return valueQueue.length == 0;
  }

  /**
   * Pushes new value into values array and fires all progress callbacks
   *
   * @param {Any} The value that is resolved from asynchronous function
   * @private
   */
  function onSuccessIteration(resolvedValue) {
    resolvedValues.push(resolvedValue); // push newest value

    // fire all progress callbacks on each iteration
    progressCallbacks.map(function(callback) {
      callback(
        resolvedValue,
        originalCollection[resolvedValues.length -1],
        resolvedValues,
        resolvedValues.length
      );
    });
  }

  /**
   * Recursive function that queues up functions that resolve or reject promises
   * with values in collection
   *
   * @private
   */
  function collectionIterator() {
    var iterationPromise;

    // Create iteration promise to pass resolver and rejecter into function. The
    // iteration function is called with the first element of the collection.
    iterationPromise = new Promise(function(iterationResolve, iterationReject) {
      iterationFn(valueQueue.shift(), iterationResolve, iterationReject)
    });

    // Resolved iteration
    iterationPromise.then(function(resolvedValue) {
      onSuccessIteration(resolvedValue);

      if ( !isFinishedIterating() ) {
        collectionIterator();
      } else {
        continuityResolve(resolvedValues);
      }

    });

    // Rejected iteration
    iterationPromise.catch(continuityReject);

  }


  /**
   * Create promise to resolve once all other promises are resolved.
   * Store resolve and reject functions so we can chain with a Promise-like
   * object.
   */
   continuityPromise = new Promise(function(resolve, reject) {
    continuityResolve = resolve;
    continuityReject = reject;
    collectionIterator();
  });

  /**
   * @method then
   *
   * Adds resolve and reject callbacks that behave exactly like Promise
   * `then` method
   *
   * Without reject callback:
   *
   *       new Continuity([1, 2], function(value, resolve) {
   *
   *         setTimeout(function() {
   *           resolve(value + 1);
   *         }, 1000);
   *
   *       }).then(function(values) {
   *
   *         assert(values == [2, 3]);
   *
   *       });
   *
   * With reject callback:
   *
   *       new Continuity([1, 2, 'George'], function(value, resolve, reject) {
   *
   *         setTimeout(function() {
   *           if ( isNaN(value) ) {
   *             reject('Cannot operate on ' + value + ' because it\'s not a number');
   *           } else {
   *             resolve(value + 1);
   *           }
   *         }, 1000);
   *
   *       }).then(function(values) {
   *
   *         assert(values == [2, 3]);
   *
   *       }, function(error) {
   *
   *         console.warn("There was an error!", error);
   *
   *       });
   *
   * @param {Function} asynchronous function that will be called with
   *                   resolved value
   * @param {Function} asynchronous function that will be called with
   *                   error value
   * @return {Continuity} for thenable methods and progress callback
   * @public
   */
  this.then = function(resolveCallback, rejectCallback) {
    continuityPromise.then(resolveCallback, rejectCallback);
    return this;
  };

  /**
   * @method catch
   *
   * Adds reject callback that behave exactly like Promise `catch` method
   *
   *       new Continuity([1, 2], function(value, resolve, reject) {
   *
   *         setTimeout(function() {
   *           if ( isNaN(value) ) {
   *             reject('Cannot operate on ' + value + ' because it\'s not a number');
   *           } else {
   *             resolve(value + 1);
   *           }
   *         }, 1000);
   *
   *       }).catch(function(error) {
   *
   *         console.warn("There was an error!", error);
   *
   *       });
   *
   * @param {Function} asynchronous function that will be called with
   *                   error value
   * @return {Continuity} for thenable methods and progress callback
   * @public
   */
  this.catch = function(callback) {
    continuityPromise.catch(callback);
    return this;
  };

  /**
   * @method progress
   *
   * Adds progress callback that is called for each iteration of collection.
   * The callback will be called with resolved value, original value, all
   * resolved values, and the current progress.
   *
   *       new Continuity([1, 2], function(value, resolve) {
   *
   *         setTimeout(function() {
   *           resolve(value + 1);
   *         }, 1000);
   *
   *       }).progress(function(value, originalValue, values, progress) {
   *
   *         // First iteration
   *         if ( progress == 1 ) {
   *           assert(value == 2);
   *           assert(originalValue == 1);
   *           assert(values == [2]);
   *           assert(progress == 1);
   *         }
   *
   *         // Second iteration
   *         else {
   *           assert(value == 3);
   *           assert(originalValue == 2);
   *           assert(values == [2, 3]);
   *           assert(progress == 2);
   *         }
   *
   *       });
   *
   * @param {Function} asynchronous function that will be called with resolved
   *                   value, original value, all resolved values, and the
   *                   current progress
   * @return {Continuity} for thenable methods and progress callback
   * @public
   */
  this.progress = function(callback) {
    resolvedValues.map(function(resolvedValue, index) {
      callback(
        resolvedValue,
        originalCollection[index],
        resolvedValues.slice(0, index + 1),
        index + 1
      );
    });

    progressCallbacks.push(callback);
    return this;
  };

};

/**
 * Module exports
 * @public
 */
module.exports = Continuity;
