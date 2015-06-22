var assert = require('assert');
var Continuity = require('..');
var should = require('should');

describe('Continuity', function() {
  var initialValues;
  var values;
  var errorMessage, superBadErrorMessage;
  var progress, progressCount;

  beforeEach(function() {
    initialValues = [1];
    progress = [];
  });

  function createContinuityObject(done) {
    return new Continuity(initialValues, function(value, resolve, reject) {
      if ( !isNaN(value) ) {
        if ( value !== 100 ) {
          resolve(value + 10);
        } else {
          // don't do anything to simulate long running function
          done();
        }
      } else {
        reject('Not a number dummy');
      }
    });
  }

  function runContinuitySequence(done) {
    return createContinuityObject(done)
      .then(function(_values) {
        values = _values;
        done();
      }, function(message) {
        superBadErrorMessage = message + '!!!';
      })
      .catch(function(message) {
        errorMessage = message;
        done();
      })
      .progress(function(_value, _originalValue, _values) {
        progress.push({
          value: _value,
          originalValue: _originalValue,
          values: _values
        });
      })
      .progress(function(_value, _originalValue, _values, _progressCount) {
        progressCount = _progressCount;
      });
  }

  describe('with one element in collection', function() {
    beforeEach(function(done){
      runContinuitySequence(done);
    });

    it("runs the function one time", function(){
      assert(values[0] == 11);
    });

    it('calls progress callback for element', function() {
      assert(progress[0].value == 11);
      assert(progress[0].originalValue == 1);
      assert(progress[0].values[0] == 11);
    });

    it('chains progress callbacks', function() {
      assert(progressCount == 1);
    });
  });

  describe('with slow promise', function() {
    beforeEach(function(done) {
      initialValues = [1, 100];
      runContinuitySequence(done);
    });

    it('doesn\'t return any values until finished', function() {
      assert(values.length == 1);
    });

    it('calls progress callback only for completed functions', function() {
      assert(progressCount == 1);
    });
  });

  describe('with multiple values', function() {
    beforeEach(function(done) {
      initialValues = [1, 10, -23];
      runContinuitySequence(done);
    });

    it("runs function on each value", function(){
      assert(values[0] == 11);
      assert(values[1] == 20);
      assert(values[2] == -13);
    });

    it('calls progress callback for all elements', function() {
      assert(progress[0].value == 11);
      assert(progress[0].originalValue == 1);
      assert(progress[0].values[0] == 11);
      assert(progress[1].value == 20);
      assert(progress[1].originalValue == 10);
      assert(progress[1].values[1] == 20);
      assert(progress[2].value == -13);
      assert(progress[2].originalValue == -23);
      assert(progress[2].values[2] == -13);
    });

    it('chains progress callbacks', function() {
      assert(progressCount == 3);
    });
  });

  describe('with error while calculating values', function() {
    beforeEach(function(done) {
      initialValues = [1, 'Not a number', -23];
      runContinuitySequence(done);
    });

    it("fails if one promise fails", function(){
      assert(errorMessage == 'Not a number dummy');
    });

    it('calls second callback in then method', function() {
      assert(superBadErrorMessage == 'Not a number dummy!!!');
    });
  });

  describe('with progress attached after promises resolved', function() {
    var continuity;

    beforeEach(function(done) {
      initialValues = [1, 10];
      continuity = runContinuitySequence(done);
    });

    it('fires progress function for all resolved values', function() {
      var valueSum;
      valueSum = 0;

      continuity.progress(function(value) {
        valueSum += value;
      });

      assert(valueSum == 31);
    });

    it('fires progress function for all collection values', function() {
      var collectionSum;
      collectionSum = 0;

      continuity.progress(function(value, originalValue) {
        collectionSum += originalValue;
      });

      assert(collectionSum == 11);
    });

    it('fires progress function for all arrays of resolved values', function() {
      var resolvedValues;
      resolvedValues = [];

      continuity.progress(function(value, originalValue, values) {
        resolvedValues.push(values);
      });

      assert(resolvedValues[0][0] == 11);
      assert(resolvedValues[1][0] == 11);
      assert(resolvedValues[1][1] == 20);
    });

    it('fires progress function for all progress values', function() {
      var progressSum;
      progressSum = 0;

      continuity.progress(function(value, originalValue, values, progress) {
        progressSum += progress;
      });

      assert(progressSum == 3);
    });
  });

  describe('#queue', function() {
    var continuity;

    describe('with thenable callbacks not attached', function() {
      var progressValues;

      beforeEach(function() {
        progressValues = [];
      });

      describe('with all values resolved', function() {
        beforeEach(function(done) {
          continuity = new Continuity(initialValues, function(value, resolve) {
            resolve(value + 10);
          }).progress(function(value) {
            progressValues.push(value);
          });

          setTimeout(function() {
            continuity.queue(5);
            continuity.then(function(_values) {
              values = _values;
              done();
            });
          }, 50);
        });

        it('calls iteration function with added value', function() {
          assert.equal(values[0], 11);
          assert.equal(values[1], 15);
        });

        it('call progress funtion for added value', function() {
          assert.equal(progressValues[1], 15);
        });
      });

      describe('with current values still resolving', function() {
        beforeEach(function(done) {
          continuity = new Continuity(initialValues, function(value, resolve) {
            setTimeout(function() {
              resolve(value + 10);
            }, 50);
          }).progress(function(value) {
            progressValues.push(value);
            if ( value == 15 ) {
              done();
            }
          });

          continuity.queue(5);
          continuity.then(function(_values) {
            values = _values;
          });
        });

        it('calls iteration function with added value', function() {
          assert.equal(values[0], 11);
          assert.equal(values[1], 15);
        });

        it('call progress funtion for added value', function() {
          assert.equal(progressValues[1], 15);
        });
      });
    });

    describe('with then callback attached', function() {
      beforeEach(function() {
        continuity = createContinuityObject();
        continuity.then(function(){});
      });

      it('throws an error', function() {
        assert.throws(function() {
          continuity.queue(5);
        }, 'All values resolved, cannot push another value');
      });
    });

    describe('with catch callback attached', function() {
      beforeEach(function() {
        initialValues = ['George'];
        continuity = createContinuityObject();
        continuity.catch(function(){});
      });

      it('throws an error', function() {
        assert.throws(function() {
          continuity.queue(5);
        }, 'All values resolved, cannot push another value');
      });
    });
  });

});
