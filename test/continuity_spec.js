var assert = require('assert');
var Continuity = require('..');
var should = require('should');

describe('Continuity', function() {
  var initialValues;
  var values;
  var errorMessage;
  var progress, progressCount;

  beforeEach(function() {
    initialValues = [1];
    progress = [];
  });

  function runContinuitySequence(done) {
    new Continuity(initialValues, function(value, resolve, reject) {
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
    })
    .then(function(_values) {
      values = _values;
      done();
    })
    .catch(function(message) {
      errorMessage = message;
      done();
    })
    .progress(function(_value, _values) {
      progress.push({value: _value, values: _values});
    })
    .progress(function(_value, _values, _progressCount) {
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
      assert(progress[0].values[0] == 11);
      assert(progress[1].value == 20);
      assert(progress[1].values[1] == 20);
      assert(progress[2].value == -13);
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
  });
});
