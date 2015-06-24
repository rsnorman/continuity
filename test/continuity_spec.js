var assert = require('assert');
var Continuity = require('..');
var should = require('should');

describe('Continuity', function() {
  var values, sum, error, progressValues;
  var continuity;

  beforeEach(function() {
    values = null;
    progressValues = [];
    error = null
  });

  function setValues(resolvedValues) {
    values = resolvedValues;
  }

  function sumValues(resolvedValues) {
    sum = 0;
    resolvedValues.map(function(value) {
      sum += value;
    });
  }

  function collectProgressValues(resolvedValue) {
    progressValues.push({
      resolvedValue: resolvedValue
    });
  }

  function setError(_error) {
    error = _error;
  }

  function createContinuity(startValues) {
    continuity = new Continuity(startValues, function(value, resolve, reject) {
      setTimeout(function() {
        if ( !isNaN(value) ) {
          resolve(value + 10);
        } else {
          reject('"' + value + '" is not a number');
        }
      }, 20);
    });

    return continuity;
  }

  function tick(step) {
    return new Promise(function(resolve, reject) {
      if ( typeof step === 'undefined' ) {
        continuity.then(function() {
          resolve();
        }).catch(function() {
          resolve();
        });
      } else {
        continuity.progress(function(v, o, vs, progressCount) {
          if ( progressCount >= step ) {
            resolve();
          }
        });
      }
    }).catch(function(error) {
      throw error;
    });
  }

  afterEach(function(done) {
    tick().then(done);
  });

  describe('#then', function() {
    function runContinuity(startValues) {
      createContinuity(startValues).then(setValues);
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
          tick().then(done);
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
          tick(2).then(done);
        });

        it('does not set values', function() {
          assert.equal(values, null);
        });
      });

      describe('after resolve', function() {
        beforeEach(function(done) {
          tick().then(done);
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
        beforeEach(function(done) {
          createContinuity([1, 10])
            .then(setValues)
            .then(sumValues);

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
        beforeEach(function(done) {
          createContinuity(['George'])
            .then(setValues)
            .catch(setError);

          tick().then(done);
        });

        it('sets error', function() {
          assert.equal(error, '"George" is not a number');
        });
      });

      describe('with #progress', function() {
        beforeEach(function(done) {
          createContinuity([1, 10])
            .then(setValues)
            .progress(collectProgressValues);

          tick().then(done);
        });

        it('adds all resolved values', function() {
          assert.equal(progressValues[0].resolvedValue, 11);
          assert.equal(progressValues[1].resolvedValue, 20);
        });
      });
    });

    describe('with reject callback', function() {
      beforeEach(function(done) {
        createContinuity(['George'])
          .then(function(_values) {
            setValues(_values);
          }, function(_error) {
            error = _error;
          });

        tick().then(done);
      });

      it('sets error', function() {
        assert.equal(error, '"George" is not a number');
      });
    });
  });

  describe('#catch', function() {
    beforeEach(function(){
      continuity = createContinuity(['George']);
    });

    describe('before resolved', function() {
      it('does not set error', function() {
        assert.equal(error, null);
      });
    });

    describe('after resolve', function() {
      describe('before catch attached', function() {
        beforeEach(function(done) {
          tick().then(done);
          continuity.catch(setError);
        });

        it('sets error', function() {
            assert.equal(error, '"George" is not a number');
        });

      });

      describe('after catch attached', function() {
        beforeEach(function(done) {
          continuity.catch(setError);
          tick().then(done);
        });

        it('sets error', function() {
          assert.equal(error, '"George" is not a number');
        });
      });
    });

    describe('with chained methods', function() {
      describe('with #then', function() {
        beforeEach(function(done) {
          createContinuity([1, 10])
            .catch(setError)
            .then(function(_values) {
              sumValues(_values);
              done();
            });

        });

        it('sums values', function() {
          assert.equal(sum, 31);
        });
      });

      describe('with #catch', function() {
        var superBadError;

        beforeEach(function(done) {
          createContinuity(['George'])
            .catch(setError)
            .catch(function(_error) {
              superBadError = _error + '!!!';
            });

          tick().then(done);
        });

        it('sets error', function() {
          assert.equal(error, '"George" is not a number');
        });

        it('sets super bad error', function() {
          assert.equal(superBadError, '"George" is not a number!!!');
        });
      });

      describe('with #progress', function() {
        beforeEach(function(done) {
          createContinuity([1, 10])
            .then(setValues)
            .progress(collectProgressValues);

          tick().then(done);
        });

        it('adds all resolved values', function() {
          assert.equal(progressValues[0].resolvedValue, 11);
          assert.equal(progressValues[1].resolvedValue, 20);
        });
      });
    });
  });

  describe('#progress', function() {
    describe('with one element in collection', function() {
      beforeEach(function(){
        createContinuity([1]).progress(collectProgressValues);
      });

      describe('before resolved', function() {
        it('does not set values', function() {
          assert.equal(progressValues.length, 0);
        });
      });

      describe('after resolve', function() {
        beforeEach(function(done) {
          tick(1).then(done);
        });

        it('sets values to resolved', function(){
          assert.equal(progressValues[0].resolvedValue, 11);
        });
      });
    });

    describe('with multiple values', function() {
      beforeEach(function() {
        values = []
        createContinuity([1, -23]).progress(collectProgressValues);
      });

      describe('before resolved', function() {
        it('does not set any progress values', function() {
          assert.equal(progressValues.length, 0);
        });
      });

      describe('in the middle of resolving', function() {
        beforeEach(function(done) {
          values = [];
          continuity = createContinuity([1, -23]);
          tick(1).then(function() {
            continuity.progress(collectProgressValues);
            done();
          });
        });

        it('sets first progress value', function() {
          assert.equal(progressValues[0].resolvedValue, 11);
        });

        it('does not set second progress value', function() {
          assert.equal(progressValues.length, 1);
        });
      });

      describe('after all resolved', function() {
        beforeEach(function(done) {
          continuity = createContinuity([1, -23]);
          tick().then(function() {
            continuity.progress(collectProgressValues);
          });
          tick(2).then(done);
        });

        it('sets first progress value', function() {
          assert.equal(progressValues[0].resolvedValue, 11);
        });

        it('sets second progress value', function() {
          assert.equal(progressValues[1].resolvedValue, -13);
        });
      });
    });

    describe('with chained methods', function() {
      describe('with #then', function() {
        beforeEach(function(done) {
          createContinuity([1, 10])
            .progress(collectProgressValues)
            .then(sumValues);

          tick().then(done);
        });

        it('sums values', function() {
          assert.equal(sum, 31);
        });
      });

      describe('with #catch', function() {
        beforeEach(function(done) {
          createContinuity(['George'])
            .progress(collectProgressValues)
            .catch(setError);

          tick().then(done);
        });

        it('sets error', function() {
          assert.equal(error, '"George" is not a number');
        });
      });

      describe('with #progress', function() {
        var progressSum;

        beforeEach(function(done) {
          progressSum = 0;
          createContinuity([1, 10])
            .progress(collectProgressValues)
            .progress(function(_value) {
              progressSum += _value;
            });

          tick().then(done);
        });

        it('sums values', function() {
          assert.equal(progressSum, 31);
        });
      });
    });
  });

  describe('#queue', function() {
    describe('with thenable callbacks not attached', function() {
      describe('with all values resolved', function() {
        describe('with then method', function() {
          beforeEach(function(done) {
            continuity = createContinuity([1]);

            continuity.progress(collectProgressValues);

            tick(1).then(function() {
              continuity.queue(5);
              continuity.then(function(_values) {
                setValues(_values);
                done();
              });
            });
          });

          it('calls iteration function with added value', function() {
            assert.equal(values[0], 11);
            assert.equal(values[1], 15);
          });

          it('call progress function for added value', function() {
            assert.equal(progressValues[1].resolvedValue, 15);
          });
        });

        describe('with catch method', function() {
          beforeEach(function(done) {
            continuity = createContinuity([1]);

            continuity.progress(function(value) {
              progressValues.push(value);
            });

            tick(1).then(function() {
              continuity.queue('George');
              continuity.catch(function(_error) {
                setError(_error);
                done();
              });
            });
          });

          it('calls iteration function with added value', function() {
            assert.equal(error, '"George" is not a number');
          });
        });
      });

      describe('with current values still resolving', function() {
        describe('with then method', function() {
          beforeEach(function(done) {
            continuity = createContinuity([1]);

            continuity.progress(collectProgressValues);

            continuity.queue(5);
            continuity.then(function(_values) {
              setValues(_values);
              done();
            });
          });

          it('calls iteration function with added value', function() {
            assert.equal(values[0], 11);
            assert.equal(values[1], 15);
          });

          it('call progress function for added value', function() {
            assert.equal(progressValues[1].resolvedValue, 15);
          });
        });

        describe('with catch method', function() {
          beforeEach(function(done) {
            continuity = createContinuity([1]);

            continuity.queue('George');
            continuity.catch(function(_error) {
              setError(_error);
              done();
            });
          });

          it('calls iteration function with added value', function() {
            assert.equal(error, '"George" is not a number');
          });
        });
      });
    });

    describe('with then callback attached', function() {
      beforeEach(function() {
        continuity = createContinuity([1]);
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
        continuity = createContinuity(['George']);
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
