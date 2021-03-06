'use strict';

var gulp = require('gulp');
var jshint = require('gulp-jshint');
var babel = require('gulp-babel');
var uglify = require('gulp-uglify');
var sass = require('gulp-sass');
var sourcemaps = require("gulp-sourcemaps");
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var cssnano = require('cssnano');
var minifyHtml = require('gulp-minify-html');
var nodemon = require('gulp-nodemon');
var path = require('path');
var concat = require('gulp-concat');
var browserSync = require('browser-sync').create();
var reload = browserSync.reload;

var cfg = {
  script: './bin/www',
  //port: 3000,
  url: 'http://test.server.local:3000',
  browser: null, // @home: 'google-chrome' ...
  app: './public',
  dist: './public.dist',
  glob: {
    backend: {
      scripts: [ '*.js', 'routes/**/*', 'controllers/**/*', 'models/**/*' ],
    },
    frontend: {
      scripts: [ this.app + '/scripts/**/*.js' ],
      styles: [ this.app + '/styles/**/*.scss' ],
      html: [ this.app + '/views/*.html', this.app + '/views/**/*.html' ],
    },
  },
  mode: 'development',
}

gulp.task('js', function() {
  return gulp
    .src(cfg.app + '/scripts/**/*.js')
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(sourcemaps.init())
    .pipe(babel({
      stage: 0
    }))
    .pipe(concat('app.js'))
    .pipe(uglify())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(cfg.dist + '/scripts'))
    .pipe(reload({stream: true}))
  ;
});

gulp.task('sass', function() {
  return gulp
    .src(cfg.app + '/styles/*.scss')
    .pipe(concat('app.css'))
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss([
      autoprefixer({browsers: ['last 4 version']}),
      cssnano(),
    ]))
    .pipe(gulp.dest(cfg.dist + '/styles/'))
    .pipe(reload({stream: true}))
  ;
});

gulp.task('html', function() {
  var opts = {
    conditionals: true,
    spare: true,
  };
  return gulp
    .src([ cfg.app + '*.html', cfg.app + '/views/**/*.html' ])
    .pipe(minifyHtml(opts))
    .pipe(reload({stream: true}))
  ;
});

gulp.task('nodemon', function(cb) {
  var monitor = nodemon({
    script: cfg.script,
    ext: '.js',
    watch: [ '*.js', 'routes/**/*', 'controllers/**/*', 'models/**/*' ],
    //watch: cfg.glob.backend.scripts,
    env: {
      'NODE_ENV': cfg.mode,
      //'PORT': cfg.port
    },
  }).once('start', cb);
  monitor.on('exit', function() {
    /*
    // to avoid double break to interrupt
    console.log('nodemon emmitted exit');
    //process.exit();
    */
  });
  return monitor;
});
gulp.task('reload', function() {
  return reload();
});

gulp.task('browser-sync', ['nodemon'], function() {
  browserSync.init(
    null,
    {
      //proxy: cfg.url + ':' + cfg.port,
      proxy: cfg.url,
      files: [ cfg.app + '/**/*.*' ],
      browser: cfg.browser,
      //port: 7000, // can we comment this? what's its use???
    }
  );
});


//gulp.task('build', [ 'js', 'sass' ]);
gulp.task('build', [ 'js', 'sass', 'html' ]);

gulp.task('default', [ 'js', 'sass', 'html', 'browser-sync' ], function() {
  gulp.watch(cfg.app + '/styles/**/*.scss', [ 'sass' ]);
  gulp.watch(cfg.app + '/scripts/**/*.js', [ 'js' ]);
  gulp.watch(cfg.app + '/views/**/*.html', [ 'html' ]); // drop html for hbs (handlebars) ...
  //gulp.watch(cfg.app + '/views/**/*.hbs', [ 'reload' ]);
});