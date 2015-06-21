# Continuity

Continuity is a small library that allows iteration over a collection and passing each value into into asynchronous functions that resolve or reject promises. Each function must wait until the previous one has finished before starting therefore allow asynchronous Promise functions to run sequentially. I know, kind of an oxymoron.

## Usage

To start a Continuity array of Promise calls, just pass the collection of values and Promise resolving function:

    new Continuity([1, 2], function(value, resolve) {
      resolve(value + 1);
    });

Make sure whatever function is passed as the second parameter resolves or rejects the Promise.

### Thenable Methods

The `then` method will return all the values resolved by the promises:

    new Continuity([1, 2], function(value, resolve) {
      resolve(value + 1);
    }).then(function(values) {
      assert(values == [2, 3]);
    });

The `catch` method will execute if *any* of the Promises fail to resolve:

    new Continuity([1, 2], function(value, resolve, reject) {
      reject('Dislike this value: ' + value);
    }).catch(function(error) {
      assert(error == 'Dislike this value: 1');
    });

### Progress Method

The `progress` method will return the value resolved by the current executing promise along with the original value, all calculated values and progress:

    new Continuity([1, 2], function(value, resolve) {
      resolve(value + 1);
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

**NOTE**: The progress callback can be attached even after Continuity
has resolved. Such is the nature of promises that it matters not when
the "thenable" functions are called, so `progress` works the same. The
progress callback will execute for each resolved value just as it would
if it were attached before any were resolved.

## Running Tests

```bash
npm install
npm test
```

## Contributors

 https://github.com/rsnorman/continuity/graphs/contributors

## Node Compatibility

  - node `0.12`

## License

[MIT](LICENSE)
