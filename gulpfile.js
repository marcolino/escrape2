'use strict';

var gulp = require('gulp');
var browserSync = require('browser-sync');
var nodemon = require('gulp-nodemon');

gulp.task('default', [ 'browser-sync' ], function() {
});

gulp.task('browser-sync', ['nodemon'], function() {
	browserSync.init(null, {
		proxy: 'http://test.server.local:3000',
    files: [ 'public/**/*.*' ],
    browser: 'google-chrome',
    port: 7000,
	});
});

gulp.task('nodemon', function (cb) {
    return nodemon({
      script: 'bin/www'
    }).once('start', cb); // once only get's run ... once
});
