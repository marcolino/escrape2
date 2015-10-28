'use strict';

// dependencies
var gulp = require('gulp');
var nodemon = require('gulp-nodemon');
var notify = require('gulp-notify');
var livereload = require('gulp-livereload');
 
// default task
gulp.task('default', function() {
  livereload.listen({
    quiet: true,
  });
  nodemon({
    script: 'bin/www',
    ext: 'js scss'
  }).on('restart', function() {
    // when the app has restarted, run livereload
    gulp.src('public/scripts/**/*')
      .pipe(livereload())
      //.pipe(notify('Reloading page, please wait...'))
    ;
  })
});