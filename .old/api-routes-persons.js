// GET new person page
router.get('/new', function(req, res) {
  res.render('persons/new', { title: 'Add New Person' });
});

router.route('/').post(function(req, res) { // post a new person
  var record = {
    name: req.body.name,
    vote: req.body.vote,
    dateofcreation: req.body.dateofcreation,
    company: req.body.company,
    isloved: req.body.isloved
  };

  mongoose.model('Person').create(record, function(err, person) {
    if (err) {
      log.error('error adding a person to the database:', err);
      res.json({ error: err });
    } else { // person has been created
      log.info('persons/ post success');
      res.json(person);
    }
  });
});

router.route('/:id/edit').get(function(req, res) { // get person by id
  mongoose.model('Person').findById(req.id, function(err, person) {
    if (err) {
      log.error('error retrieving person with id ' + req.id + ':', err);
      res.json({ error: err });
    } else { // get the person
      log.info('persons/:id/edit get success');
      res.json(person);
    }
  });
});

router.route('/:id/edit').put(function(req, res) { // update a person by id
  var record = {
    name: req.body.name,
    vote: req.body.vote,
    dateofcreation: req.body.dateofcreation,
    company: req.body.company,
    isloved: req.body.isloved
  };

  // find the document by ID
  mongoose.model('Person').findById(req.id, function(err, person) {
    if (err) {
      log.error('error retrieving person with id ' + req.id + ':', err);
      res.json({ error: err });
    } else { // update the person
      person.update(record, function(err, person) {
        if (err) {
          log.error('error updating person with id', req.id + ':', err);
          res.json({ error: err });
        } else {
          log.info('persons/:id/edit put success');
          res.json(person);
        }
      });
    }
  });
});

router.route('/:id/edit').delete(function(req, res) { // delete a person by id
  // find person by id
  mongoose.model('Person').findById(req.id, function(err, person) {
    if (err) {
      log.error('error retrieving person with id ' + req.id + ':', err);
      res.json({ erorr: err });
    } else { // remove the person
      person.remove(function(err, person) { // TODO: don't delete, mark as deleted
        if (err) {
          log.error('error deleting person with id ' + req.id + ':', err);
          res.json({ error: err });
        } else {
          log.info('persons/:id/edit put success');
          res.json(person);
        }
      });
    }
  });
});
