# Continuity

Continuity is a small library that allows iteration over a collection and passing each value into into asynchronous functions that resolve or reject promises. Each function must wait until the previous one has finished before starting therefore allow asynchronous Promise functions to run sequentially. I know, kind of an oxymoron.

## Usage

To start a Continuity array of Promise calls, just pass the collection of values
and Promise resolving/rejecting function:

```js
new Continuity([1, 2], function(value, resolve, reject) {

  setTimeout(function() {
    if ( isNaN(value) ) {
      reject('Cannot operate on ' + value + ' because it\'s not a number');
    } else {
      resolve(value + 1);
    }
  }, 1000);

});
```

Make sure whatever function is passed as the second parameter resolves
or rejects the Promise.

### Thenable Methods

The `then` method will return all the values resolved by the promises. It has
the exact same syntax as regular Promises:

Without reject callback:

```js
new Continuity([1, 2], function(value, resolve) {

  setTimeout(function() {
    resolve(value + 1);
  }, 1000);

}).then(function(values) {

  assert(values == [2, 3]);

});
```

With reject callback:

```js
new Continuity([1, 2, 'George'], function(value, resolve, reject) {

  setTimeout(function() {
    if ( isNaN(value) ) {
      reject('Cannot operate on ' + value + ' because it\'s not a number');
    } else {
      resolve(value + 1);
    }
  }, 1000);

}).then(function(values) {

  assert(values == [2, 3]);

}, function(error) {

  console.warn("There was an error!", error);

});
```

The `catch` method will execute if *any* of the Promises fail to resolve. It has
the exact same syntax as regular Promises:

```js
new Continuity([1, 2], function(value, resolve, reject) {

  setTimeout(function() {
    reject('Dislike this value: ' + value);
  }, 1000);

}).catch(function(error) {

  assert(error == 'Dislike this value: 1');

});
```

**NOTE**: Once a Promise is rejected, iteration over the array will stop.

### Progress Callback

The `progress` method will return the value resolved by the current executing
promise along with the original value, all calculated values and progress:

```js
new Continuity([1, 2], function(value, resolve) {

  setTimeout(function() {
    resolve(value + 1);
  }, 1000);

}).progress(function(value, originalValue, values, progress) {

  // First iteration
  if ( progress == 1 ) {
    assert(value == 2);
    assert(originalValue == 1);
    assert(values == [2]);
    assert(progress == 1);
  }

  // Second iteration
  else {
    assert(value == 3);
    assert(originalValue == 2);
    assert(values == [2, 3]);
    assert(progress == 2);
  }

});
```

**NOTE**: The progress callback can be attached even after Continuity
has resolved. Such is the nature of promises that it matters not when
the "thenable" functions are called, so `progress` works the same. The
progress callback will execute for each resolved value just as it would
if it were attached before any were resolved.

**Another Note**: If a promise is rejected, the iteration that caused the
failure state will not fire a progress call.

### Pushing Extra Values
Sometimes the collection may need extra values even while it's running or
having been completely resolved. Continuity allows queuing extra values using
the `queue` method.

```js
var continuity = new Continuity([1, 2], function(value, resolve) {

  setTimeout(function() {
    resolve(value + 1);
  }, 1000);

});

continuity.queue(3);

continuity.then(function(values) {
  assert(values == [2, 3, 4]);
});
```

**WARNING**: Values cannot be queued if any thenable callbacks have been
attached. This is because there is no guarantee that the promise hasn't already
resolved and cannot resolve twice. An error will be thrown if extra values are
queued.

## Running Tests

```bash
npm install
npm test
```

## Contributors

 [https://github.com/rsnorman/continuity/graphs/contributors](https://github.com/rsnorman/continuity/graphs/contributors)

## Node Compatibility

  - node `0.12`

## License

[MIT](LICENSE)
