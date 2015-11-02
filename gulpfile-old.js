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
var print = require('gulp-print');
//var browserSync = require('browser-sync').create();
//var reload = browserSync.reload;
var livereload = require('gulp-livereload');
// TODO: require in tasks

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
    index: [ app + '/index.html' ],
    views: [ app + '/views/**/*.html' ],
    images: [ app + '/images/**' ],
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
var LIVERELOAD_DELAY = 3000; // milliseconds

gulp.task('clean', function() {
  del.sync([ dist ]);
});

gulp.task('backend-scripts', function() {
  return gulp
    .src(cfg.backend.scripts)
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(livereload()) // TODO: really we want to reload frontend after backend scripts did change?
  ;
});

gulp.task('frontend-scripts-vendor-build', function() {
  del([ dist + '/scripts/vendor-*.js', dist + '/scripts/vendor-*.js.map' ]);
  return gulp
    .src(mainBowerFiles([ '**/*.js' ]))
    .pipe(print(function(filepath) {
      return "main bower files: " + filepath;
    }))
    .pipe(concat({ path: 'vendor.js', cwd: '' }))
    .pipe(rev())
    .pipe(gulp.dest(dist + '/scripts'))
  ;
});

gulp.task('frontend-scripts-custom-build', function() {
  del([ dist + '/scripts/custom-*.js', dist + '/scripts/vendor-*.js.map' ]);
  return gulp
    .src(cfg.frontend.scripts)
    // TODO: add gulp-strip-debug()...
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

gulp.task('frontend-scripts-styles', [
  'frontend-scripts-vendor-build', 'frontend-scripts-custom-build',
  'frontend-styles-vendor-build', 'frontend-styles-custom-build',
], function() {
  return gulp
    .src(cfg.frontend.index, { base: app })
    .pipe(inject(gulp.src([ dist + '/scripts/vendor-*.js' ], { read: false }), {
      name: 'inject-vendor',
      ignorePath: dist,
      addRootSlash: false
    }))
    .pipe(inject(gulp.src([ dist + '/scripts/custom-*.js' ], { read: false }), {
      name: 'inject-custom',
      ignorePath: dist,
      addRootSlash: false
    }))
    .pipe(inject(gulp.src([ dist + '/styles/vendor-*.css' ], { read: false }), {
      name: 'inject-vendor',
      ignorePath: dist,
      addRootSlash: false
    }))
    .pipe(inject(gulp.src([ dist + '/styles/custom-*.css' ], { read: false }), {
      name: 'inject-custom',
      ignorePath: dist,
      addRootSlash: false
    }))
    .pipe(gulp.dest(dist + '/'))
    .pipe(livereload({stream: true}))
    .pipe(function() { setTimeout(function() {
console.log('restart after delay');
      livereload();
    }, LIVERELOAD_DELAY)})
  ;
});

gulp.task('DELETEME-frontend-styles', [ ], function() {
  return gulp.src(cfg.frontend.styles)
    .pipe(sass()
    .on('error', function (err) {
      console.error(err);
      this.emit('end');
    }))
    //.pipe(concat({ path: 'custom.css', cwd: '' }))
/*
    .pipe(postcss([ minifyCss(), ]))
*/
    .pipe(gulp.dest(dist + '/styles'))
    .pipe(livereload({stream: true}))
  ;
});

gulp.task('frontend-styles-vendor-build', function() {
  del([ dist + '/styles/vendor-*.css' ]);
  return gulp
    .src(mainBowerFiles([ '**/*.css' ]))
    .pipe(print(function(filepath) {
      return "main bower css files: " + filepath;
    }))
    .pipe(concat({ path: 'vendor.js', cwd: '' }))
    .pipe(rev())
    .pipe(gulp.dest(dist + '/styles'))
    //.pipe(livereload({stream: true}))
  ;
});

gulp.task('frontend-styles-custom-build', function() {
  del([ dist + '/styles/custom-*.css' ]);
  return gulp
    .src(cfg.frontend.styles)
    .pipe(sass()
    .on('error', function (err) {
      console.error(err);
      this.emit('end');
    }))
    .pipe(concat({ path: 'custom.css', cwd: '' }))
    .pipe(rev())
    .pipe(gulp.dest(dist + '/styles'))
    //.pipe(livereload({stream: true}))
  ;
});

/*
gulp.task('vendor', function() {
  return gulp
    .src(mainBowerFiles())
    .pipe(concat({ path: 'vendor.js', cwd: '' }))
    .pipe(rev())
    .pipe(gulp.dest(dist + '/scripts'));
});
*/

gulp.task('frontend-views', function() {
//  gulp
//    .src(cfg.frontend.index)
//    .pipe(gulp.dest(dist));
  return gulp
    .src(cfg.frontend.views)
    //.src(app + '/index.html')
    //.pipe(inject(gulp.src([ dist + '/scripts/custom-*.js' ], { read: false }), {
    //  name: 'inject-custom',
    //}))
    //.pipe(inject(gulp.src([ dist + '/scripts/vendor-*.js' ], { read: false }), {
    //  name: 'inject-vendor',
    //}))
    //  //.pipe(removeHtmlComments())
    //  //.pipe(removeEmptyLines())
    //.pipe(minifyHtml())
    .pipe(gulp.dest(dist + '/views'))
    .pipe(livereload({stream: true}))
  ;
});

gulp.task('frontend-images', [ ], function() {
  return gulp
    .src(cfg.frontend.images)
    .pipe(gulp.dest(dist + '/images'))
    .pipe(livereload({stream: true}))
  ;
});

gulp.task('nodemon', function(cb) {
  return nodemon({
    script: cfg.script,
    ext: '.js',
    watch: cfg.backend.scripts,
    env: {
      'NODE_ENV': cfg.mode,
    },
  })
  .on('restart', function onRestart() {
console.log('restart');
    setTimeout(function reload() {
console.log('restart after delay');
      livereload();
    }, LIVERELOAD_DELAY);
  })
  .on('exit', function() { // assuming a [ctrl-c] will break 
    // to avoid double break to interrupt
    ///process.exit(); // this hides some errors...
  })
  .once('start', function onRestart() {
console.log('start');
    livereload();
    cb();
  })
});

gulp.task('development', [ 'backend-scripts', 'frontend-scripts-styles', 'frontend-views', 'nodemon', /*'browser-sync'*/ ], function() {
  livereload.listen({ quiet: false });
  gulp.watch(cfg.backend.scripts, [ 'backend-scripts' ]);
  gulp.watch(cfg.frontend.index, [ 'frontend-scripts-styles' ]);
  gulp.watch(cfg.frontend.scripts, [ 'frontend-scripts-styles' ]);
  gulp.watch(cfg.frontend.styles, [ 'frontend-scripts-styles' ]);
  gulp.watch(cfg.frontend.views, [ 'frontend-views' ]); // drop html for hbs (handlebars)...
});

gulp.task('build', [ 'clean', 'development', ], function() {
});  

gulp.task('deploy', [ 'build' ], function() { // TODO: deploy to github pages / openshift ?
});  

gulp.task('default', [ 'development' ], function() {
});
