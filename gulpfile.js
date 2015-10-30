'use strict';

var gulp = require('gulp');
var del = require('del');
var usemin = require('gulp-usemin');
var wiredep = require('wiredep').stream;
var inject = require('gulp-inject');
var mainBowerFiles = require('main-bower-files');
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var validateHtml = require('gulp-html-angular-validate');
var removeHtmlComments = require('gulp-remove-html-comments');
var removeEmptyLines = require('gulp-remove-empty-lines');
var babel = require('gulp-babel');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var rev = require('gulp-rev');
var postcss = require('gulp-postcss');
var minifyHtml = require('gulp-minify-html');
var minifyCss = require('gulp-minify-css');
var spawn = require('child_process').spawn;
var nodemon = require('gulp-nodemon');
var path = require('path');
//var browserSync = require('browser-sync').create();
//var reload = browserSync.reload;
var livereload = require('gulp-livereload');

var api = 'api';
var app = 'public';
var dist = 'public.dist';
var cfg = {
  script: './bin/www',
  url: 'http://test.server.local:3000',
  browser: 'chromium-browser', // @centos: chromim-browser, @ubuntu: 'google-chrome' ...
  backend: {
    scripts: [ api + '/*.js', api + '/routes/**/*', api + '/controllers/**/*', api + '/models/**/*' ],
  },
  frontend: {
    scripts: [ app + '/scripts/**/*.js' ],
    styles: [ app + '/styles/**/*.scss' ],
    views: [ app + '/index.html', app + '/views/**/*.html' ],
  },
  validation: {
    html: {
      reportpath: 'logs/html-angular-validate-report.json',
      relaxerror: [
        'Element “form” does not need a “role” attribute.',
        'Element “img” is missing required attribute “src”.',
      ],
    },
  },
  mode: 'development',
}

// a slight delay to reload browsers connected to livereload after restarting nodemon
var LIVERELOAD_DELAY = 0; // 500; // milliseconds

gulp.task('clean', function () {
  console.log(' !!! clean !!!');
//  del([ dist ]);
});

gulp.task('backend-scripts-dev', function() {
  console.log(' === task: backend-scripts-dev');
  return gulp
    .src(cfg.backend.scripts)
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
});

gulp.task('backend-scripts-pro', [ 'clean' ], function() {
  console.log(' === task: backend-scripts-pro');
  return gulp
    .src(cfg.backend.scripts)
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
});

gulp.task('frontend-scripts-dev', function() {
  console.log(' === task: frontend-scripts-dev');
  return gulp
    .src(cfg.frontend.scripts)
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
});

gulp.task('frontend-scripts-pro', [ 'clean' ], function() {
  console.log(' === task: frontend-scripts-pro');
  // order matters, of course
  return gulp
    .src(cfg.frontend.scripts)
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jscs())
    .pipe(sourcemaps.init())
    .pipe(concat({ path: 'custom.js', cwd: '' }))
    .pipe(rev())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(dist + '/scripts'))
  ;
});

gulp.task('frontend-styles-dev', function() {
  console.log(' === task: frontend-styles-dev');
  return gulp.src(cfg.frontend.styles)
    .pipe(sass().on('error', sass.logError))
  ;
});

gulp.task('frontend-styles-pro', [ 'clean' ], function() {
  console.log(' === task: frontend-styles-pro');
  return gulp.src(cfg.frontend.styles)
    .pipe(sass().on('error', sass.logError))
    .pipe(concat({ path: 'custom.css', cwd: '' }))
/*
    .pipe(postcss([
      minifyCss(),
    ]))
*/
    .pipe(gulp.dest(dist + '/styles'))
    //.pipe(livereload({stream: true}));
});

gulp.task('frontend-views-dev', function() {
  console.log(' === task: frontend-views-dev');

  return gulp
    .src(cfg.frontend.views)
    .pipe(validateHtml(cfg.validation.html))
  ;
});

gulp.task('vendor', function() {
  console.log(' === task: vendor');
  return gulp
    .src(mainBowerFiles())
    .pipe(concat({ path: 'vendor.js', cwd: '' }))
    .pipe(rev())
    .pipe(gulp.dest(dist + '/scripts'));
});

gulp.task('frontend-views-pro', [ 'clean', 'vendor' ], function() {
  console.log(' === task: frontend-views-pro');
  return gulp
    .src(app + '/index.html')
    .pipe(inject(gulp.src([ dist + '/scripts/custom-*.js' ], { read: false }), {
      name: 'inject-custom',
      removeTags: true,
    }))
    .pipe(inject(gulp.src([ dist + '/scripts/vendor-*.js' ], { read: false }), {
      name: 'inject-vendor',
      removeTags: true,
    }))
      //.pipe(removeHtmlComments())
      //.pipe(removeEmptyLines())
    //.pipe(minifyHtml())
    .pipe(gulp.dest(dist))
  ;
});

gulp.task('nodemon', function(cb) {
  console.log(' === task: nodemon');
  return nodemon({
    script: cfg.script,
    ext: '.js',
    watch: cfg.backend.scripts,
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

gulp.task('deploy', [ '...', ], function() { // TODO...
  console.log(' === task: deploy');
});  

gulp.task('test', [ '...', ], function() { // TODO...
  console.log(' === task: test');
   // mocha --recursive
   // mocha --recursive --reporter progress
});

gulp.task('build', [ 'backend-scripts-pro', 'frontend-scripts-pro', 'frontend-styles-pro', 'frontend-views-pro', ], function() {
  console.log(' === task: build');
});  

gulp.task('default', [ 'backend-scripts-dev', 'frontend-scripts-dev', 'frontend-styles-dev', 'frontend-views-dev', 'nodemon', /*'browser-sync'*/ ], function() {
  console.log(' === task: default');
  livereload.listen({
    quiet: true,
  });

  gulp.watch(cfg.backend.scripts, [ 'backend-scripts-dev' ]);
  gulp.watch(cfg.frontend.scripts, [ 'frontend-scripts-dev' ]);
  gulp.watch(cfg.frontend.styles, [ 'frontend-styles-dev' /*browserSync.reload*/ ]);
  gulp.watch(cfg.frontend.views, [ 'frontend-views-dev' ]); // drop html for hbs (handlebars)...
});