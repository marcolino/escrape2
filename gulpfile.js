'use strict';

var gulp = require('gulp')
  , gutil = require('gulp-util')
  , del = require('del')
  , usemin = require('gulp-usemin')
  , wiredep = require('wiredep').stream
  , inject = require('gulp-inject')
  , mainBowerFiles = require('main-bower-files')
  , jshint = require('gulp-jshint')
  , jscs = require('gulp-jscs')
  , validateHtml = require('gulp-html-angular-validate')
  , removeHtmlComments = require('gulp-remove-html-comments')
  , removeEmptyLines = require('gulp-remove-empty-lines')
  , babel = require('gulp-babel')
  , ngAnnotate = require('gulp-ng-annotate')
  , uglify = require('gulp-uglify')
  , concat = require('gulp-concat')
  , sass = require('gulp-sass')
  , sourcemaps = require('gulp-sourcemaps')
  , rev = require('gulp-rev')
  , postcss = require('gulp-postcss')
  , minifyHtml = require('gulp-minify-html')
  , minifyCss = require('gulp-minify-css')
  , spawn = require('child_process').spawn
  , nodemon = require('gulp-nodemon')
  , path = require('path')
  , print = require('gulp-print')
  , livereload = require('gulp-livereload')
;

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

var isProduction = false;

if (gutil.env.dev === true) {
  isProduction = false;
}
if (gutil.env.pro === true) {
  isProduction = true;
}

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
      .pipe(print(function(filepath) { return "main bower js file: " + filepath; }))
    .pipe(concat({ path: 'vendor.js', cwd: '' }))
    //bower.pipe(uglify({
    //compress: {
    //    negate_iife: false
    //  }
    //}))
    .pipe(rev())
    .pipe(gulp.dest(dist + '/scripts'))
  ;
});

gulp.task('frontend-scripts-custom-build', function() {
  del([ dist + '/scripts/custom-*.js', dist + '/scripts/custom-*.js.map' ]);
  return gulp
    .src(cfg.frontend.scripts)
    //.pipe(gulp-strip-debug())
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jscs())
    .pipe(sourcemaps.init())
    .pipe(concat({ path: 'custom.js', cwd: '' }))
    .pipe(ngAnnotate())
    .pipe(uglify({
      compress: {
        negate_iife: false
      }
    }))
    .pipe(rev())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(dist + '/scripts'))
  ;
});

gulp.task('frontend-styles-vendor-build', function() {
  del([ dist + '/styles/vendor-*.css' ]);
  return gulp
    .src(mainBowerFiles([ '**/*.css' ]))
    .pipe(print(function(filepath) { return "main bower css file: " + filepath; }))
    //.pipe(postcss([ minifyCss(), ]))
    .pipe(concat({ path: 'vendor.css', cwd: '' }))
    .pipe(rev())
    .pipe(gulp.dest(dist + '/styles'))
  ;
});

gulp.task('frontend-styles-custom-build', function() {
  del([ dist + '/styles/custom-*.css' ]);
  return gulp
    .src(cfg.frontend.styles)
    //.pipe(print(function(filepath) { return "main custom css files: " + filepath; }))
    .pipe(sass()
    .on('error', function (err) {
      console.error(err);
      this.emit('end');
    }))
    //.pipe(postcss([ minifyCss(), ]))
    .pipe(concat({ path: 'custom.css', cwd: '' }))
    .pipe(rev())
    .pipe(gulp.dest(dist + '/styles'))
    //.pipe(livereload({stream: true}))
  ;
});

gulp.task('frontend-scripts', [ 'frontend-scripts-vendor-build', 'frontend-scripts-custom-build' ], function() {
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
    .pipe(livereload())
  ;
});

gulp.task('frontend-styles', [ 'frontend-styles-vendor-build', 'frontend-styles-custom-build' ], function() {
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
    .pipe(livereload())
  ;
});

gulp.task('frontend-views', function() {
  return gulp
    .src(cfg.frontend.views)
    //  //.pipe(removeHtmlComments())
    //  //.pipe(removeEmptyLines())
    //.pipe(minifyHtml())
    .pipe(gulp.dest(dist + '/views'))
    .pipe(livereload(/*{stream: true}*/))
  ;
});

gulp.task('frontend-images', [ ], function() {
  return gulp
    .src(cfg.frontend.images)
    .pipe(gulp.dest(dist + '/images'))
    .pipe(livereload(/*{stream: true}*/))
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
  .once('start', function onStart() {
    livereload();
    cb();
  })
  .on('restart', function onRestart() {
      livereload();
  })
  .on('exit', function() { // assuming a [ctrl-c] will break 
    // to avoid double break to interrupt
    ///process.exit(); // this hides some errors...
  })
});

gulp.task('development', [ 'backend-scripts', 'frontend-scripts', 'frontend-styles', 'frontend-views', 'nodemon', /*'browser-sync'*/ ], function() {
  livereload.listen({ quiet: false });
  gulp.watch(cfg.backend.scripts, [ 'backend-scripts' ]);
  gulp.watch(cfg.frontend.index, [ 'frontend-scripts', 'frontend-syles' ]);
  gulp.watch(cfg.frontend.scripts, [ 'frontend-scripts' ]);
  gulp.watch(cfg.frontend.styles, [ 'frontend-styles' ]);
  gulp.watch(cfg.frontend.views, [ 'frontend-views' ]); // drop html for hbs (handlebars)...
});

gulp.task('build', [ 'clean', 'development', ], function() {
});  

gulp.task('deploy', [ 'build' ], function() { // TODO: deploy to github pages / openshift ?
});  

gulp.task('default', [ 'development' ], function() {
});
