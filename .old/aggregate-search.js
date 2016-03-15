  // aggregate on alias field to get just the first document with the same alias
  var pipeline = [
    {
      '$match': match
    }, {
      '$group': {
        '_id': {
          '$ifNull': [ '$alias', '$_id' ]
        },
        'key': { '$first': '$key' },
        'name': { '$first': '$name' },
        'url': { '$first': '$url' },
        'phone': { '$first': '$phone' },
        'isPresent': { '$first': '$isPresent' },
        'showcaseBasename': { '$first': '$showcaseBasename' },
        'dateOfFirstSync': { '$first': '$dateOfFirstSync', },
        'users': { '$first': '$users', },
        'id': { '$first': '$_id' }
      }
    }, {
      '$project': {
        '_id': '$id',
        'key': true,
        'name': true,
        'url': true,
        'phone': true,
        'isPresent': true,
        'showcaseBasename': true,
        'dateOfFirstSync': true,
        'users': true,
        'alias': {
          '$cond': [
            { '$eq': [ '$_id', '$id' ] },
            null,
            '$_id'
          ]
        },
      },
    },
    options
  ];

//Person.aggregate(pipeline).exec(function(err, persons) {