var assert = require('assert');
var Continuity = require('..');
var should = require('should');

describe('Continuity', function() {
  var initialValues, values;
  var continuity;

  beforeEach(function() {
    initialValues = [1];
  });

  function createContinuityObject(willRejectWith, withTimeout) {
    return new Continuity(initialValues, function(value, resolve, reject) {
      if ( willRejectWith != value ) {
        if ( !withTimeout ) {
          resolve(value + 10);
        } else {
          setTimeout(function() {
            resolve(value + 10);
          }, 50);
        }
      } else {
        if ( !withTimeout ) {
          reject('Rejected: ' + value);
        } else {
          setTimeout(function() {
            reject('Rejected: ' + value);
          }, 50);
        }
      }
    });
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

    describe('with reject callback', function() {
      var error;

      beforeEach(function(done) {
        createContinuity(['George'])
          .then(function(_values) {
            values = _values;
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
    var error;

    it('sets error', function() {
      createContinuity(['George'])
        .catch(function(_error) {
          error = _error;
        });

      tick().then(function() {
        assert.equal(error, '"George" is not a number');
      });
    });

    describe('with chained methods', function() {
      describe('with #then', function() {
        var sum;

        beforeEach(function(done) {
          createContinuity([1, 10])
            .catch(function(_error) {
              error = _error;
            })
            .then(function(_values) {
              sum = 0;
              _values.map(function(value) {
                sum += value;
              });

              done();
            });

        });

        it('sums values', function() {
          assert.equal(sum, 31);
        });
      });

      describe('with #catch', function() {
        var error, superBadError;

        beforeEach(function(done) {
          createContinuity(['George'])
            .catch(function(_error) {
              error = _error;
            })
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

  describe('#progress', function() {
    var values;
    beforeEach(function() {
      values = [];
    });

    function runContinuity(startValues) {
      createContinuity(startValues)
        .progress(function(resolvedValue) {
          values.push({
            resolvedValue: resolvedValue
          });
        });
    }

    describe('with one element in collection', function() {
      beforeEach(function(){
        runContinuity([1]);
      });

      describe('before resolved', function() {
        it('does not set values', function() {
          assert.equal(values.length, 0);
        });
      });

      describe('after resolve', function() {
        beforeEach(function(done) {
          tick(1).then(done);
        });

        it('sets values to resolved', function(){
          assert.equal(values[0].resolvedValue, 11);
        });
      });
    });

    describe('with multiple values', function() {
      beforeEach(function() {
        values = []
        runContinuity([1, -23]);
      });

      describe('before resolved', function() {
        it('does not set any progress values', function() {
          assert.equal(values.length, 0);
        });
      });

      describe('in the middle of resolving', function() {
        beforeEach(function(done) {
          values = [];
          tick(1).then(function() {
            done();
          });
        });

        it('sets first progress value', function() {
          assert.equal(values[0].resolvedValue, 11);
        });

        it('does not set second progress value', function() {
          assert.equal(values.length, 1);
        });
      });

      describe('after all resolved', function() {
        beforeEach(function(done) {
          tick(2).then(done);
        });

        it('sets first progress value', function() {
          assert.equal(values[0].resolvedValue, 11);
        });

        it('sets second progress value', function() {
          assert.equal(values[1].resolvedValue, -13);
        });
      });
    });

    describe('with chained methods', function() {
      describe('with #then', function() {
        var sum;

        beforeEach(function(done) {
          createContinuity([1, 10])
            .progress(function(resolvedValue) {
              values.push({
                resolvedValue: resolvedValue
              });
            })
            .then(function(_values) {
              sum = 0;
              _values.map(function(value) {
                sum += value;
              });
            });

          tick().then(done);
        });

        it('sums values', function() {
          assert.equal(sum, 31);
        });
      });

      describe('with #catch', function() {
        var error;

        beforeEach(function(done) {
          createContinuity(['George'])
            .progress(function(resolvedValue) {
              values.push({
                resolvedValue: resolvedValue
              });
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
        var sum;

        beforeEach(function(done) {
          sum = 0;
          createContinuity([1, 10])
            .progress(function(resolvedValue) {
              values.push({
                resolvedValue: resolvedValue
              });
            })
            .progress(function(_value) {
              sum += _value;
            });

          tick().then(done);
        });

        it('sums values', function() {
          assert.equal(sum, 31);
        });
      });
    });
  });

  describe('#queue', function() {
    describe('with thenable callbacks not attached', function() {
      var progressValues, errorMessage;

      beforeEach(function() {
        progressValues = [];
      });

      describe('with all values resolved', function() {
        describe('with then method', function() {
          beforeEach(function(done) {
            continuity = createContinuity([1]);

            continuity.progress(function(value) {
              progressValues.push(value);
            });

            tick(1).then(function() {
              continuity.queue(5);
              continuity.then(function(_values) {
                values = _values;
                done();
              });
            });
          });

          it('calls iteration function with added value', function() {
            assert.equal(values[0], 11);
            assert.equal(values[1], 15);
          });

          it('call progress function for added value', function() {
            assert.equal(progressValues[1], 15);
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
              continuity.catch(function(_errorMessage) {
                errorMessage = _errorMessage;
                done();
              });
            });
          });


          it('calls iteration function with added value', function() {
            assert.equal(errorMessage, '"George" is not a number');
          });
        });
      });

      // describe('with current values still resolving', function() {
        // describe('with then method', function() {
        //   beforeEach(function(done) {
        //     continuity = createContinuityObject(false, true);
        //
        //     continuity.progress(function(value) {
        //       progressValues.push(value);
        //       if ( value == 15 ) {
        //         done();
        //       }
        //     });
        //
        //     continuity.queue(5);
        //     continuity.then(function(_values) {
        //       values = _values;
        //     });
        //   });
        //
        //   it('calls iteration function with added value', function() {
        //     assert.equal(values[0], 11);
        //     assert.equal(values[1], 15);
        //   });
        //
        //   it('call progress function for added value', function() {
        //     assert.equal(progressValues[1], 15);
        //   });
        // });
        //
        // describe('with catch method', function() {
        //   beforeEach(function(done) {
        //     continuity = createContinuityObject(5, true);
        //
        //     setTimeout(function() {
        //       continuity.queue(5);
        //       continuity.catch(function(_errorMessage) {
        //         errorMessage = _errorMessage;
        //         done();
        //       });
        //     }, 50);
        //   });
        //
        //
        //   it('calls iteration function with added value', function() {
        //     assert.equal(errorMessage, 'Rejected: 5');
        //   });
        // });
      // });
    });
    //
    // describe('with then callback attached', function() {
    //   beforeEach(function() {
    //     continuity = createContinuityObject();
    //     continuity.then(function(){});
    //   });
    //
    //   it('throws an error', function() {
    //     assert.throws(function() {
    //       continuity.queue(5);
    //     }, 'All values resolved, cannot push another value');
    //   });
    // });
    //
    // describe('with catch callback attached', function() {
    //   beforeEach(function() {
    //     initialValues = ['George'];
    //     continuity = createContinuityObject();
    //     continuity.catch(function(){});
    //   });
    //
    //   it('throws an error', function() {
    //     assert.throws(function() {
    //       continuity.queue(5);
    //     }, 'All values resolved, cannot push another value');
    //   });
    // });
  });
});
