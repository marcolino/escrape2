'use strict';

var gulp = require('gulp');
var del = require('del');
var usemin = require('gulp-usemin');
var wiredep = require('wiredep').stream;
var inject = require('gulp-inject');
var jshint = require('gulp-jshint');
var html5lint = require('gulp-html5-lint');
var babel = require('gulp-babel');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var postcss = require('gulp-postcss');
var minifyHtml = require('gulp-minify-html');
var minifyCss = require('gulp-minify-css');
var spawn = require('child_process').spawn;
var nodemon = require('gulp-nodemon');
var path = require('path');
//var browserSync = require('browser-sync').create();
//var reload = browserSync.reload;
var livereload = require('gulp-livereload');

var app = 'public';
var dist = 'public.dist';
var cfg = {
  script: './bin/www',
  url: 'http://test.server.local:3000',
  browser: 'chromium-browser', // @centos: chromim-browser, @ubuntu: 'google-chrome' ...
  glob: {
    backend: {
      scripts: [ 'app.js', 'routes/**/*', 'controllers/**/*', 'models/**/*' ],
    },
    frontend: {
      scripts: [ app + '/scripts/**/*.js' ],
      styles: [ app + '/styles/**/*.scss' ],
      views: [ app + '/index.html', app + '/views/**/*.html' ],
    },
  },
  mode: 'development',
}

//// a slight delay to reload browsers connected to browser-sync after restarting nodemon
//var BROWSER_SYNC_RELOAD_DELAY = 500; // milliseconds
var LIVERELOAD_DELAY = 500; // milliseconds

/*
gulp.task('clean', function () {
  return del([
    dist
  ]);
});
*/

gulp.task('styles-dev', function() {
  console.log(' === task: styles-dev');
  return gulp.src(cfg.glob.frontend.styles)
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest(app + '/styles/')) // /styles-css/ => /styles/ ...
    .pipe(livereload({stream: true}));
  ;
});

gulp.task('scripts-dev', function() {
  console.log(' === task: scripts-dev');
  return gulp
    .src(app + '/scripts/**/*.js')
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
    //.pipe(livereload({stream: true})); // do we need this, if we don't save anything?
});

gulp.task('views-dev', function() {
  console.log(' === task: views-dev');
//  var opts = {
//    conditionals: true,
//    spare: true,
//  };
//console.log('cfg.glob.frontend.views:', cfg.glob.frontend.views);
  return gulp
    .src(cfg.glob.frontend.views)
    .pipe(html5lint()) //.on('error', function(err) { console.error(err); }))
    //.pipe(livereload({stream: true}))
  ;
});

gulp.task('styles-pro', function() {
  console.log(' === task: styles-pro');
  return gulp.src(app + '/styles/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(concat('app.css'))
/*
    .pipe(postcss([
      minifyCss(),
    ]))
*/
    .pipe(gulp.dest(dist + '/styles/'))
    //.pipe(livereload({stream: true}));
});

gulp.task('scripts-pro', function() {
  console.log(' === task: scripts-pro');
  return gulp
    .src(app + '/scripts/**/*.js')
/*
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(sourcemaps.init())
    .pipe(babel({
      stage: 0
    }))
    .pipe(uglify())
    .pipe(sourcemaps.write('.'))
*/
    .pipe(concat('app.js'))
    .pipe(gulp.dest(dist + '/scripts'))
    //.pipe(livereload({stream: true}));
});

gulp.task('views-pro', function() {
  console.log(' === task: views-pro');
//  var opts = {
//    conditionals: true,
//    spare: true,
//  };
//console.log('cfg.glob.frontend.views:', cfg.glob.frontend.views);
  return gulp
    .src(cfg.glob.frontend.views)
//  .pipe(minifyHtml(opts))
    .pipe(gulp.dest(function(file) {
      var cwd = process.cwd();
//console.log('dist:', path.dirname(file.path).replace(cwd + '/' + app, dist) + '/');
      return path.dirname(file.path).replace(cwd + '/' + app, dist) + '/';
    }))
    //.pipe(livereload({stream: true}))
  ;
});

gulp.task('nodemon', function(cb) {
  console.log(' === task: nodemon');
  return nodemon({
    script: cfg.script,
    ext: '.js',
    watch: cfg.glob.backend.scripts,
    env: {
      'NODE_ENV': cfg.mode,
    },
  })
  .once('start', cb)
  .on('restart', function onRestart() {
    // also reload the browsers after a slight delay
    /*
    setTimeout(function reload() {
      browserSync.reload({
        stream: false
      });
      livereload();
    }, BROWSER_SYNC_RELOAD_DELAY);
    */
    setTimeout(function reload() {
      livereload();
    }, LIVERELOAD_DELAY);
  })
  .on('exit', function() { // assuming a [ctrl-c] will break 
    // to avoid double break to interrupt
    //console.log('nodemon emitted exit');
    ///process.exit();
  });
});

gulp.task('browser-sync', [ 'nodemon' ], function() {
  console.log(' === task: browser-sync');
  browserSync.init(
    null,
    {
      proxy: cfg.url,
      files: [ app + '/**/*.*' ],
      browser: [ cfg.browser ],
      port: 3001, // this port must be different from the express app port
    }
  );
  browserSync.notify("This message will only last <span color='green'>5</span> seconds", 5000);
});

gulp.task('build', [ 'styles-pro', 'scripts-pro', 'views-pro', ], function() {
  console.log(' === task: build');
});  

gulp.task('default', [ 'nodemon', 'styles-dev', 'scripts-dev', 'views-dev' /*'browser-sync'*/ ], function() {
  console.log(' === task: default');
  livereload.listen({
    //quiet: true,
    quiet: false,
  });
  gulp.watch(cfg.glob.frontend.styles, [ 'styles-dev' /*browserSync.reload*/ ]);
  gulp.watch(cfg.glob.frontend.scripts, [ 'scripts-dev' ]);
  gulp.watch(cfg.glob.frontend.views, [ 'views-dev' ]); // drop html for hbs (handlebars)...
});