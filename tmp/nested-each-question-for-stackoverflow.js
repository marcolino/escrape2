/*
I am implementing a module (using `express.js`) function to get persons (public) data from different providers.  
Providers publish a page with a list of persons urls, which link to each person's page.  
Each person's data will be saved to a (`mongo`) database.  
The function (`getPersonsData()`) should `res.json(persons.length)` when all persons are retrieved.  
I'm using async.each from async package.  
Hereafter I'm ignoring error handling for sake of simplicity.
*/

var request = require('request'),
    async = require('async');

var providers = [
  { name: 'Google', url: 'http://google.com/personsList.html' },
  { name: 'Yahoo', url: 'http://yahoo.com/personsList.html' },
];
var persons = [];

exports.getPersonsData = function(req, res) { // sync persons method
  async.each( // outer async.each to get persons lists from each provider
    providers, // 1st param in async.each() is the array of items
    function(provider, callbackOuter) { // 2nd param is the function that each item is passed to
      request(provider.url, function(err, response, contents) {
        // parseList() estracts a list of urls from contents
        var urlsList = parseList(contents);
        async.each(
          urlsList, // 1st param in async.each() is the array of items
          function(listElement, callbackInner) { // 2nd param is the function that each item is passed to
            var person = {};
            // parseUrl() estracts an url from a listElement
            person.url = parseUrl(listElement);
            request(person.url, function(err, response, contents) {
              // parseUrl() estracts the name a person's page
              person.name = parseName(contents);
              persons.push(person);
              callbackInner();
            });
          },
          function(err) { // 3rd param is the function to call when everything's done (callbackInner)
            // all tasks are successfully done now
            console.log('provider', provider.key, 'persons fetch done');
            callbackOuter();
          }
        ); // end of (inner) async.each(providers)
      });
    },
    function(err) { // 3rd param is the function to call when everything's done (callbackOuter)
      console.log('total persons fetched from providers:', persons);  
      // TODO: save persons to db...
      res.json(persons.length); // respond to client
    }
  ); // end of async.each(providers)

} // end of exports.syncPersons()

module.exports = exports;