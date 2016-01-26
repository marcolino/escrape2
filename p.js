var persons = [
  { id: '1', name: 'alice' },
  { id: '2', name: 'bob' },
  { id: '3', name: 'charlie' },
];   

var usersToPersons = [
  { userId: '1', personId: '1', hide: true },
  { userId: '1', personId: '2', hide: false },
  { userId: '7', personId: '3' },
];

function getPersonsForUserOLD(userId) {
  var result = {};
  for (var p = 0; p < persons.length; p++) {
    for (var u = 0; u < usersToPersons.length; u++) {
      if (usersToPersons[u].userId === userId) {
        if (persons[p].id === usersToPersons[u].personId) {
          if (usersToPersons[u].hide === true) {
            console.warn('person', persons[p].name, 'skipped because this user hides it');
            break;
          } else {
            result[persons[p].id] = persons[p];
          }
        } else {
          result[persons[p].id] = persons[p];
        }
      } else {
        result[persons[p].id] = persons[p];
      }
    }
  }
  return result;
}

function getPersonsForUser(userId) {
  var visiblePersons = persons.filter(function(eP, iP, aP) {
    var isThisPersonVisible = !usersToPersons.filter(function(eU, iU, aU) {
      return (!eU.userId || (eU.personId === eP.id && !eU.hide && eU.userId === userId));
    }).length;
    return isThisPersonVisible;
  });
  return visiblePersons;
}

console.log(getPersonsForUser('1'));
