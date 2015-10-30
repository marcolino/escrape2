'use strict';

var app = angular.module('escrape2', [
  'ngRoute',
  'routes',
  'HomeCtrl',
  'PersonCtrl',
  'AboutCtrl',
  'PersonService'
]);

var config = {
  debug: true
};