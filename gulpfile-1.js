'use strict';

//var gulp = require('gulp');
//var browserSync = require('browser-sync');
//var nodemon = require('gulp-nodemon');

var gulp = require('gulp');  
var sass = require('gulp-sass');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var notify = require('gulp-notify');
var minifycss = require('gulp-minify-css');
var concat = require('gulp-concat');
var plumber = require('gulp-plumber');
var browserSync = require('browser-sync');
var nodemon = require('gulp-nodemon');
//var reload = browserSync.reload;

var script = 'bin/www';

gulp.task('default', [ 'browser-sync' ], function() {
});

gulp.task('browser-sync', ['nodemon'], function() {
  browserSync.init(
    null,
    {
      proxy: 'http://test.server.local:3000',
      files: [ 'public/**/*.*' ],
      //browser: 'google-chrome',
      port: 7000,
    }
  );
});

gulp.task('nodemon', function (cb) {
  return nodemon({
    script: script
  }).once('start', cb); // once only get's run ... once
});
