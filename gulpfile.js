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
    dist
  ]);
});

// TODO: restart on gulpfile.js file change ...

gulp.task('index', function () {
  var target = gulp.src(app + '/index.html');
  var sources = gulp.src([ app + '/scripts/**/*.js', app + 'styles/**/*.scss' ], { read: false });
  return target.pipe(inject(sources))
    .pipe(gulp.dest(dist))
  ;
});

gulp.task('usemin', function() {
  return gulp.src(dist + '/index.html')
    .pipe(usemin({
      css: [
        // prefix('> 1%') // doesnt work
        cssnano()
      ],
      html: [
        //minifyHtml({ empty: true })
      ],
      jsv: [
        wiredep()
      ],
      js: [
        uglify
      ]
    }))
    .pipe(gulp.dest(dist))
    .pipe(reload({stream: true}))
  ;
});

gulp.task('styles', function() {
  console.log(' === task: styles');
  return gulp.src(app + '/styles/*.scss')
    .pipe(concat('app.css'))
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss([
      autoprefixer({browsers: ['last 4 version']}),
      cssnano(),
    ]))
    .pipe(gulp.dest(dist + '/styles/'))
    .pipe(reload({stream: true}));
});

gulp.task('scripts', function() {
  console.log(' === task: scripts');
  return gulp
    .src(app + '/scripts/**/*.js')
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(sourcemaps.init())
    .pipe(babel({
      stage: 0
    }))
    .pipe(concat('app.js'))
    .pipe(uglify())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(dist + '/scripts'))
    .pipe(reload({stream: true}));
});

gulp.task('markup', function() {
  console.log(' === task: markup');
  var opts = {
    conditionals: true,
    spare: true,
  };
console.log('cfg.glob.frontend.markup:', cfg.glob.frontend.markup);
  return gulp
    .src(cfg.glob.frontend.markup)
    // .pipe(minifyHtml(opts))
    .pipe(gulp.dest(function(file) {
      var cwd = process.cwd();
console.log('dist:', path.dirname(file.path).replace(cwd + '/' + app, dist) + '/');
      return path.dirname(file.path).replace(cwd + '/' + app, dist) + '/';
    }))
    .pipe(reload({stream: true}))
  ;
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
  /*
  monitor.on('exit', function() {
    // to avoid double break to interrupt
    console.log('nodemon emmitted exit');
    //process.exit();
  });
  */
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

gulp.task('build', [ 'styles', 'scripts', 'markup', ]);

//gulp.task('default', [ 'styles', 'scripts', 'markup', 'browser-sync' ], function() {
gulp.task('default', [ 'clean', 'index', 'usemin', 'browser-sync' ], function() {
  gulp.watch(cfg.glob.frontend.styles, [ 'styles' ]);
  gulp.watch(cfg.glob.frontend.scripts, [ 'scripts' ]);
  gulp.watch(cfg.glob.frontend.markup, [ 'markup' ]); // drop html for hbs (handlebars) ...
  //gulp.watch('./public/index.html', [ 'markup' ]); // drop html for hbs (handlebars) ...
});