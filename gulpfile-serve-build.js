// Gulp example configuration file for an Express + AngularJS app
// find the complete explanation at blog.scikr.com
//
// usage: `gulp serve` for development and `gulp build` for production
//
// run the following command to get all packages needed:
// npm install --save-dev gulp main-bower-files gulp-inject gulp-livereload gulp-watch gulp-nodemon streamqueue gulp-uglify gulp-concat gulp-ng-annotate gulp-rev gulp-rimraf run-sequence gulp-filter gulp-minify-css

// TODO: use gulp internal watch for gulp-watch

// call the node packages
var gulp = require('gulp'),
  bowerFiles = require('main-bower-files'),
  inject = require('gulp-inject'),
  livereload = require('gulp-livereload'),
  watch = require('gulp-watch'),
  nodemon = require('gulp-nodemon'),
  streamqueue = require('streamqueue');

// jsfiles() streams all the js files (with exceptions) into a single stream for future injection
function jsfiles() {
  return streamqueue({ objectMode: true },
    // first streams vendor files from Bower (with a filter for exceptions)
    gulp.src(bowerFiles(), {read: false}).pipe(gulpFilter(['*.js',])), //'!bootstrap-sass-official', '!bootstrap.js', '!json3', '!es5-shim'])),
    // then streams the app files
    gulp.src(['./public/**/*.js'], {read: false})
  );
}

// cssfiles() streams all the css files (with exceptions) into a single stream for future injection
function cssfiles() {
  return streamqueue({ objectMode: true },
    // first streams vendor files from Bower (with a filter for exceptions)
    gulp.src(bowerFiles(), {read: false}).pipe(gulpFilter(['*.css',])), //'!bootstrap-sass-official', '!bootstrap.js', '!json3', '!es5-shim'])),
    // then streams the app files
    gulp.src(['./public/**/*.css'], {read:false})
  );
}

// create the inject task that inject successively ALL CSS stream, and ALL JS stream into index.html
gulp.task('inject', function(){
  return gulp.src('./public/index.html')
    .pipe(inject(jsfiles(), {relative:true}))
    .pipe(inject(cssfiles(), {relative:true}))
    .pipe(gulp.dest('./public.dist/'));
});

gulp.task('watch', ['inject'], function() {
  // start the livereload server
  livereload.listen();
  // reload the browser when changes to any file in ./client/
  // dont forget to put the app.use(require('connect-livereload')()); in your express app
  gulp.watch('./public/**').on('change', livereload.changed);
});

// the serve task that we use for development
gulp.task('serve', ['watch'], function(){
  // nodemon starts the node app with monitoring of all files in the server folder (livereload takes care of the client)
  nodemon({
    script: 'bin/www', // the app script
    watch: ['api/**/*.js'], // file to watch for reloading
    env: { 'PORT': 3000 } }  // any environment variables
  ).on('restart', function () {
    setTimeout(function() {livereload.changed();}, 2000);
    console.log('restarted!');
  });
});

var uglify = require('gulp-uglify'),
  concat = require('gulp-concat'),
  ngAnnotate = require('gulp-ng-annotate'),
  rev = require('gulp-rev'),
  rimraf = require('gulp-rimraf'),
  runSequence = require('run-sequence'),
  gulpFilter = require('gulp-filter'),
  minifyCSS = require('gulp-minify-css');

gulp.task('build', function(callback) {
  // runSequence is a cool way of choosing what must run sequentially, and what in parallel
  // here, the task clean will run first alone, then all the builds in parallel, then the copies in parallel, then the injection in html
  runSequence(
    'clean',
    ['build-scripts', 'build-scripts-bower', 'build-styles', 'build-styles-bower'],
    ['copy-server', 'copy-assets', 'copy-client'],
    'build-html',
    callback);
});

// clean the dist folder
gulp.task('clean', function(){
  return gulp.src('./dist/**/*.*', {read:false})
    .pipe(rimraf());
});

// concatenate, annotate (for angular JS) and minify the js scripts into one single app.js file, then copy it to dist folder
gulp.task('build-scripts', function() {
  return gulp.src(['./public/scripts/**/*.js'])
    .pipe(concat('app.js')) // concatenate all js files
    .pipe(ngAnnotate()) // annotate to ensure proper dependency injection in AngularJS
    .pipe(uglify()) // minify js
    .pipe(rev()) // add a unique id at the end of app.js (ex: app-f4446a9c.js) to prevent browser caching when updating the website
    .pipe(gulp.dest('./public.dist')) // copy app-**.js to the appropriate folder
  ;
});

// same as above, with the bower files (no need to ngannotate)
gulp.task('build-scripts-bower', function() {
  return gulp.src(bowerFiles())
    .pipe(gulpFilter(['*.js', '!bootstrap-sass-official', '!bootstrap.js', '!json3', '!es5-shim']))
    .pipe(concat('vendor.js'))
    .pipe(uglify())
    .pipe(rev())
    .pipe(gulp.dest('./dist/public/app'))
  ;
});

// yet another concat/minify task, here for the CSS
gulp.task('build-styles',function() {
  return gulp.src(['./public/**/*.css'])
    .pipe(concat('styles.css'))
    .pipe(minifyCSS())
    .pipe(rev())
    .pipe(gulp.dest('./public.dist'))
  ;
});

// and for vendor CSS
gulp.task('build-styles-bower', function() {
  return gulp.src(bowerFiles())
    .pipe(gulpFilter(['*.css']))
    .pipe(concat('vendor.css'))
    .pipe(minifyCSS())
    .pipe(rev())
    .pipe(gulp.dest('./public.dist'))
  ;
});

// simple task to copy the server folder to dist/server
gulp.task('copy-server', function(){
  return gulp.src('./api/**/*.*')
    .pipe(gulp.dest('./public.dist/api'))
  ;
});

// copying the assets (images, fonts, ...)
gulp.task('copy-assets', function() {
  return gulp.src('./public/images/**/*.*')
    .pipe(gulp.dest('./public.dist/images'))
  ;
});

// copying the html files
gulp.task('copy-client', function(){
  return gulp.src('./public/**/*.+(html|txt|ico)')
    .pipe(gulp.dest('./public.dist'))
  ;
});

// queues app.js and vendor.js
function buildjs() {
  return streamqueue({ objectMode: true },
      gulp.src('vendor*.js', {read:false, 'cwd': __dirname + '/public.dist/'}),
      gulp.src('scripts*.js', {read:false, 'cwd': __dirname + '/public.dist/'})
    )
  ;
}

// queues app.css and vendor.css
function buildcss() {
  return streamqueue({ objectMode: true },
      gulp.src('vendor*.css', {read:false, 'cwd': __dirname + '/public.dist/'}),
      gulp.src('scripts*.css', {read:false, 'cwd': __dirname + '/public.dist/'})
    )
  ;
}

// injection of both js files and css files in index.html
gulp.task('build-html', function() {
  return gulp.src('./public/index.html')
    .pipe(inject(buildjs(), {relative:false}))
    .pipe(inject(buildcss(), {relative:false}))
    .pipe(gulp.dest('./public.dist'))
  ;
});
