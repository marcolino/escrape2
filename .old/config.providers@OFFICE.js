// development only... for production, add a method to update provider's collection
providers = [
  {
    key: 'FORBES',
    mode: 'fake',
    type: 'persons',
    url: 'http://it.wikipedia.org',
    language: 'it',
    categories: {
      overall: {
        pathList: '/wiki/Lista_delle_persone_pi%C3%B9_potenti_del_mondo_secondo_Forbes#2014.5B2.5D',
        pathDetails: ''
      },
      women: { 
        pathList: '/wiki/Lista_delle_100_donne_pi%C3%B9_potenti_del_mondo_secondo_Forbes#2015',
        pathDetails: ''
      },
    },
  },
  {
    key: 'GF',
    mode: 'normal',
    type: 'comments',
    // ...
  },

];

module.exports = providers;