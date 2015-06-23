var assert = require('assert');
var Continuity = require('..');
var should = require('should');

describe('Continuity', function() {
  var values;
  var errorMessage, superBadErrorMessage;
  var progress, progressCount, isComplete;
  var continuity;

  beforeEach(function() {
    progress = [];
    progressCount = 0;
    isComplete = false;
  });

  //function createContinuityObject(willRejectWith, withTimeout) {
    //return new Continuity(initialValues, function(value, resolve, reject) {
      //if ( willRejectWith != value ) {
        //if ( !withTimeout ) {
          //resolve(value + 10);
        //} else {
          //setTimeout(function() {
            //resolve(value + 10);
          //}, 50);
        //}
      //} else {
        //if ( !withTimeout ) {
          //reject('Rejected: ' + value);
        //} else {
          //setTimeout(function() {
            //reject('Rejected: ' + value);
          //}, 50);
        //}
      //}
    //});
  //}

  function createContinuity(startValues) {
    return new Continuity(startValues, function(value, resolve, reject) {
      setTimeout(function() {
        if ( !isNaN(value) ) {
          resolve(value + 10);
        } else {
          reject('"' + value + '" is not a number');
        }
      }, 50);
    }).progress(function(_value, _originalValue, _values, _progressCount) {
      progressCount = _progressCount;
    }).then(function() {
      isComplete = true;
    }).catch(function() {
      isComplete = true;
    });
  }

  function tick(step) {
    var stepTo, count, waitForComplete;
    count = 0;

    if ( typeof step === 'undefined' ) {
      waitForComplete = true;
    } else {
      stepTo = progressCount + step;
    }

    return new Promise(function(resolve, reject) {

      function checkProgressComplete() {
        if ( waitForComplete && isComplete ) {
          resolve();
        } else if ( !waitForComplete && progressCount !== stepTo ) {
          resolve();
        } else if ( count > 1000 ) {
          throw new Error('Continuity will never resolve!');
        } else {
          count += 1;
          setTimeout(checkProgressComplete, 50);
        }
      }

      checkProgressComplete();

    }).catch(function(error) {
      throw error;
    });
  }

  function runContinuitySequence(done) {
    //return new Continuity(initialValues, function(value, resolve, reject) {
      //if ( !isNaN(value) ) {
        //if ( value !== 100 ) {
          //resolve(value + 10);
        //} else {
          //// don't do anything to simulate long running function
          //done();
        //}
      //} else {
        //reject('Not a number dummy');
      //}
    //})

    //.then(function(){}, function(message) {
      //superBadErrorMessage = message + '!!!';
    //})
    //.catch(function(message) {
      //errorMessage = message;
      //done();
    //})
    //.progress(function(_value, _originalValue, _values) {
      //progressCount += 1;
      //progress.push({
        //value: _value,
        //originalValue: _originalValue,
        //values: _values
      //});
    //})
  }

  describe('#then', function() {
    var values;
    beforeEach(function() {
      values = null;
    });

    function runContinuity(startValues) {
      createContinuity(startValues).then(function(_values) {
        values = _values;
      });
    }

    describe('with one element in collection', function() {
      beforeEach(function(){
        runContinuity([1]);
      });

      describe('before resolved', function() {
        it('does not set values', function() {
          assert.equal(values, null);
        });
      });

      describe('after resolve', function() {
        beforeEach(function(done) {
          tick().then(function() {
            done();
          });
        });

        it('sets values to resolved', function(){
          assert.equal(values[0], 11);
        });
      });

    });

    describe('with multiple values', function() {
      beforeEach(function() {
        runContinuity([1, 10, -23]);
      });

      describe('before resolved', function() {
        it('does not set values', function() {
          assert.equal(values, null);
        });
      });

      describe('in the middle of resolving', function() {
        beforeEach(function(done) {
          tick(2).then(function() {
            done();
          });
        });

        it('does not set values', function() {
          assert.equal(values, null);
        });
      });

      describe('after resolve', function() {
        beforeEach(function(done) {
          tick().then(function() {
            done();
          });
        });

        it('sets values to resolved', function(){
          assert.equal(values[0], 11);
          assert.equal(values[1], 20);
          assert.equal(values[2], -13);
        });
      });
    });

    describe('with chained methods', function() {
      describe('with #then', function() {
        var sum;

        beforeEach(function(done) {
          createContinuity([1, 10])
            .then(function(_values) {
              values = _values;
            })
            .then(function(_values) {
              sum = 0;
              _values.map(function(value) {
                sum += value;
              });
            });

          tick().then(done);
        });

        it('sets values in first then callback', function() {
          assert.equal(values[0], 11);
          assert.equal(values[1], 20);
        });

        it('sums values', function() {
          assert.equal(sum, 31);
        });
      });

      describe('with #catch', function() {
        var error;

        beforeEach(function(done) {
          createContinuity(['George'])
            .then(function(_values) {
              values = _values;
            })
            .catch(function(_error) {
              error = _error;
            });

          tick().then(done);
        });

        it('sets error', function() {
          assert.equal(error, '"George" is not a number');
        });
      });

      describe('with #progress', function() {
        var progressValues;

        beforeEach(function(done) {
          progressValues = [];

          createContinuity([1, 10])
            .then(function(_values) {
              values = _values;
            })
            .progress(function(value) {
              progressValues.push(value);
            });

          tick().then(done);
        });

        it('adds all resolved values', function() {
          assert.equal(progressValues[0], 11);
          assert.equal(progressValues[1], 20);
        });
      });
    });
  });

  //describe('with one element in collection', function() {
    //beforeEach(function(done){
      //runContinuitySequence(done);
    //});

    //it('calls progress callback for element', function() {
      //assert(progress[0].value == 11);
      //assert(progress[0].originalValue == 1);
      //assert(progress[0].values[0] == 11);
    //});

    //it('chains progress callbacks', function() {
      //assert(progressCount == 1);
    //});
  //});

  //describe('with slow promise', function() {
    //beforeEach(function(done) {
      //initialValues = [1, 100];
      //runContinuitySequence(done);
    //});

    //it('calls progress callback only for completed functions', function() {
      //assert(progressCount == 1);
    //});
  //});

  //describe('with multiple values', function() {
    //beforeEach(function(done) {
      //initialValues = [1, 10, -23];
      //runContinuitySequence(done);
    //});

    //it('calls progress callback for all elements', function() {
      //assert(progress[0].value == 11);
      //assert(progress[0].originalValue == 1);
      //assert(progress[0].values[0] == 11);
      //assert(progress[1].value == 20);
      //assert(progress[1].originalValue == 10);
      //assert(progress[1].values[1] == 20);
      //assert(progress[2].value == -13);
      //assert(progress[2].originalValue == -23);
      //assert(progress[2].values[2] == -13);
    //});

    //it('chains progress callbacks', function() {
      //assert(progressCount == 3);
    //});
  //});

  //describe('with error while calculating values', function() {
    //beforeEach(function(done) {
      //initialValues = [1, 'Not a number', -23];
      //runContinuitySequence(done);
    //});

    //it("fails if one promise fails", function(){
      //assert(errorMessage == 'Not a number dummy');
    //});

    //it('calls second callback in then method', function() {
      //assert(superBadErrorMessage == 'Not a number dummy!!!');
    //});
  //});

  //describe('with progress attached after promises resolved', function() {
    //var continuity;

    //beforeEach(function(done) {
      //initialValues = [1, 10];
      //continuity = runContinuitySequence(done);
    //});

    //it('fires progress function for all resolved values', function() {
      //var valueSum;
      //valueSum = 0;

      //continuity.progress(function(value) {
        //valueSum += value;
      //});

      //assert(valueSum == 31);
    //});

    //it('fires progress function for all collection values', function() {
      //var collectionSum;
      //collectionSum = 0;

      //continuity.progress(function(value, originalValue) {
        //collectionSum += originalValue;
      //});

      //assert(collectionSum == 11);
    //});

    //it('fires progress function for all arrays of resolved values', function() {
      //var resolvedValues;
      //resolvedValues = [];

      //continuity.progress(function(value, originalValue, values) {
        //resolvedValues.push(values);
      //});

      //assert(resolvedValues[0][0] == 11);
      //assert(resolvedValues[1][0] == 11);
      //assert(resolvedValues[1][1] == 20);
    //});

    //it('fires progress function for all progress values', function() {
      //var progressSum;
      //progressSum = 0;

      //continuity.progress(function(value, originalValue, values, progress) {
        //progressSum += progress;
      //});

      //assert(progressSum == 3);
    //});
  //});

  //describe('#queue', function() {
    //describe('with thenable callbacks not attached', function() {
      //var progressValues;

      //beforeEach(function() {
        //progressValues = [];
      //});

      //describe('with all values resolved', function() {
        //describe('with then method', function() {
          //beforeEach(function(done) {
            //continuity = createContinuityObject()

            //continuity.progress(function(value) {
              //progressValues.push(value);
            //});

            //setTimeout(function() {
              //continuity.queue(5);
              //continuity.then(function(_values) {
                //values = _values;
                //done();
              //});
            //}, 50);
          //});

          //it('calls iteration function with added value', function() {
            //assert.equal(values[0], 11);
            //assert.equal(values[1], 15);
          //});

          //it('call progress function for added value', function() {
            //assert.equal(progressValues[1], 15);
          //});
        //});

        //describe('with catch method', function() {
          //beforeEach(function(done) {
            //continuity = createContinuityObject(1);

            //continuity.progress(function(value) {
              //progressValues.push(value);
            //});

            //setTimeout(function() {
              //continuity.queue(5);
              //continuity.catch(function(_errorMessage) {
                //errorMessage = _errorMessage;
                //done();
              //});
            //}, 50);
          //});


          //it('calls iteration function with added value', function() {
            //assert.equal(errorMessage, 'Rejected: 1');
          //});
        //});
      //});

      //describe('with current values still resolving', function() {
        //describe('with then method', function() {
          //beforeEach(function(done) {
            //continuity = createContinuityObject(false, true);

            //continuity.progress(function(value) {
              //progressValues.push(value);
              //if ( value == 15 ) {
                //done();
              //}
            //});

            //continuity.queue(5);
            //continuity.then(function(_values) {
              //values = _values;
            //});
          //});

          //it('calls iteration function with added value', function() {
            //assert.equal(values[0], 11);
            //assert.equal(values[1], 15);
          //});

          //it('call progress function for added value', function() {
            //assert.equal(progressValues[1], 15);
          //});
        //});

        //describe('with catch method', function() {
          //beforeEach(function(done) {
            //continuity = createContinuityObject(5, true);

            //setTimeout(function() {
              //continuity.queue(5);
              //continuity.catch(function(_errorMessage) {
                //errorMessage = _errorMessage;
                //done();
              //});
            //}, 50);
          //});


          //it('calls iteration function with added value', function() {
            //assert.equal(errorMessage, 'Rejected: 5');
          //});
        //});
      //});
    //});

    //describe('with then callback attached', function() {
      //beforeEach(function() {
        //continuity = createContinuityObject();
        //continuity.then(function(){});
      //});

      //it('throws an error', function() {
        //assert.throws(function() {
          //continuity.queue(5);
        //}, 'All values resolved, cannot push another value');
      //});
    //});

    //describe('with catch callback attached', function() {
      //beforeEach(function() {
        //initialValues = ['George'];
        //continuity = createContinuityObject();
        //continuity.catch(function(){});
      //});

      //it('throws an error', function() {
        //assert.throws(function() {
          //continuity.queue(5);
        //}, 'All values resolved, cannot push another value');
      //});
    //});
  //});

});
