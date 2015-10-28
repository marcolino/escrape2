'use strict';

var gulp = require('gulp');
var del = require('del');
var usemin = require('gulp-usemin');
var wiredep = require('wiredep').stream;
var inject = require('gulp-inject');
var jshint = require('gulp-jshint');
var babel = require('gulp-babel');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var cssnano = require('cssnano');
var minifyHtml = require('gulp-minify-html');
var nodemon = require('gulp-nodemon');
var path = require('path');
var browserSync = require('browser-sync').create();
var reload = browserSync.reload;

var app = 'public';
var dist = 'public.dist';
var cfg = {
  script: './bin/www',
  url: 'http://test.server.local:3000',
  browser: null, // @office: null, @home: 'google-chrome' ...
  glob: {
    backend: {
      scripts: [ './app.js', './routes/**/*', './controllers/**/*', './models/**/*' ],
    },
    frontend: {
      scripts: [ app + '/scripts/**/*.js' ],
      styles: [ app + '/styles/**/*.scss' ],
      //markup: [ app + '/index.html', app + '/views/**/*.html' ],
      markup: app + '/index.html',
    },
  },
  mode: 'development',
}
//console.log('cfg:', cfg);

gulp.task('clean', function () {
  return del([
    dist + '/**'
  ]);
});

// TODO: restart on gulpfile.js file change ...

gulp.task('build-styles', function() {
  return gulp.src(app + '/styles/**/*.scss')
    .pipe(sass())
    .pipe(gulp.dest(dist))
  ;
});

gulp.task('build-js', function() {
  return gulp.src(app + 'scripts/**/*.js')
    .pipe(gulp.dest(dist))
  ;
});

gulp.task('build-html', function() {
  return gulp.src(dist + '/**/*.*')
    // and inject them into the HTML
    .pipe(inject(app + '/index.html', {
      addRootSlash: false, // ensures proper relative paths
      ignorePath: dist, // ignore dist paths
    }))
    .pipe(gulp.dest(dest))
  ;
});

gulp.task('build', [ 'build-styles', 'build-js' ], function(cb) {
  gulp.run('build-html', cb);
});

gulp.task('nodemon', function(cb) {
  var monitor = nodemon({
    script: cfg.script,
    ext: '.js',
    watch: [ 'app.js', 'routes/**/*', 'controllers/**/*', 'models/**/*' ],
    //watch: cfg.glob.backend.scripts,
    env: {
      'NODE_ENV': cfg.mode,
      //'PORT': cfg.port
    },
  }).once('start', cb);
  return monitor;
});

/*
gulp.task('reload', function() {
  return reload();
});
*/

gulp.task('browser-sync', ['nodemon'], function() {
  browserSync.init(
    null,
    {
      proxy: cfg.url,
      files: [ app + '/**/*' ],
      browser: cfg.browser,
      port: 7000, // can we comment this? what's its use???
    }
  );
});

gulp.task('default', [ 'build', 'browser-sync' ], function() {
  gulp.watch(app + '/**/*.scss', function() {
    gulp.run('build-styles');
  });
  gulp.watch([ dist + '/**/*.*', '!' + dist + '/index.html', app + '/index.html' ], function() {
    gulp.run('build-html');
  });
});
