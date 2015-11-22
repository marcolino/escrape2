local.setActivityStatus = function(syncStartDate, callback) {
  async.series(
    [
      function(callbackInner) {
        local.presenceReset(syncStartDate, function(err) {
          if (err) {
            return callbackInner('can\'t reset presence:', err);
          }
          callbackInner(null, 'reset');
        });
      },
      function(callbackInner) {
        local.presenceSet(syncStartDate, function(err) {
          if (err) {
            return callbackInner('can\'t set presence:', err);
          }
          callbackInner(null, 'set');
        });
      }
    ],
    function(err, results) {
      // results should be now equal to [ 'reset', 'set' ]
      if (err) {
        return callback('could not set activity status for persons:', err);
      }
      callback(); // success
    }
  );
};

local.presenceReset = function(syncStartDate, callback) {
  // set persons not sync'd or with a not available phone as not present
  Person
    .where({
      $or: [
        { 'dateOfLastSync': { $lt: syncStartDate } },
        { 'phoneIsAvailable': false },
      ]
    })
    .update({}, { $set: { isPresent: false } }, { multi: true }, function(err, count) {
      if (err) {
        console.warn('can\'t reset persons activity status:', err);
        return callback(err);
      }
      log.info(count.n + ' persons are absent');
      callback(null);
    })
  ;
};

local.presenceSet = function(syncStartDate, callback) {
  // set persons sync'd and with an available phone as present
  Person
    .where({
      $and: [
        { 'dateOfLastSync': { $gte: syncStartDate } },
        { 'phoneIsAvailable': true },
      ]
    })
    .update({}, { $set: { isPresent: true } }, { multi: true }, function(err, count) {
      if (err) {
        console.warn('can\'t set persons activity status:', err);
        return callback(err);
      }
      log.info(count.n + ' persons are present');
      callback(null);
    })
  ;
};
