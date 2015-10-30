var basePaths = {
  src: 'public/',
  dest: 'public.dist/',
  bower: 'bower_components/'
};
var paths = {
  images: {
    src: basePaths.src + 'images/',
    dest: basePaths.dest + 'images/min/'
  },
  scripts: {
    src: basePaths.src + 'scripts/',
    dest: basePaths.dest + 'scripts/min/'
  },
  styles: {
    src: basePaths.src + 'styles/',
    dest: basePaths.dest + 'styles/min/'
  },
  sprite: {
    src: basePaths.src + 'sprite/*'
  }
};

var appFiles = {
  styles: paths.styles.src + '**/*.scss',
  scripts: [paths.scripts.src + 'scripts.js']
};

var vendorFiles = {
  styles: '',
  scripts: ''
};

var spriteConfig = {
  imgName: 'sprite.png',
  cssName: '_sprite.scss',
  imgPath: paths.images.dest.replace('public', '') + 'sprite.png'
};

// let the magic begin

var gulp = require('gulp');

var es = require('event-stream');
var gutil = require('gulp-util');
var autoprefixer = require('gulp-autoprefixer');

var plugins = require("gulp-load-plugins")({
  pattern: ['gulp-*', 'gulp.*'],
  replaceString: /\bgulp[\-.]/
});

// allows gulp --dev to be run for a more verbose output
var isProduction = true;
var sassStyle = 'compressed';
var sourceMap = false;

if (gutil.env.dev === true) {
  sassStyle = 'expanded';
  sourceMap = true;
  isProduction = false;
}

var changeEvent = function(evt) {
  gutil.log('File', gutil.colors.cyan(evt.path.replace(new RegExp('/.*(?=/' + basePaths.src + ')/'), '')), 'was', gutil.colors.magenta(evt.type));
};

gulp.task('css', function() {
  var sassFiles = gulp.src(appFiles.styles)
/*
  .pipe(plugins.rubySass({
    style: sassStyle, sourcemap: sourceMap, precision: 2
  }))
*/
  .pipe(plugins.sass())
  .on('error', function(err) {
    new gutil.PluginError('CSS', err, {showStack: true});
  });

  return es.concat(gulp.src(vendorFiles.styles), sassFiles)
    .pipe(plugins.concat('style.min.css'))
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4', 'Firefox >= 4'))
    /*
    .pipe(isProduction ? plugins.combineMediaQueries({
      log: true
    }) : gutil.noop())
    */
    .pipe(isProduction ? plugins.cssmin() : gutil.noop())
    .pipe(plugins.size())
    .pipe(gulp.dest(paths.styles.dest))
  ;
});

gulp.task('scripts', function() {
  gulp.src(vendorFiles.scripts.concat(appFiles.scripts))
    .pipe(plugins.concat('app.js'))
    .pipe(isProduction ? plugins.uglify() : gutil.noop())
    .pipe(plugins.size())
    .pipe(gulp.dest(paths.scripts.dest))
  ;
});

// sprite generator
gulp.task('sprite', function() {
  var spriteData = gulp.src(paths.sprite.src).pipe(plugins.spritesmith({
    imgName: spriteConfig.imgName,
    cssName: spriteConfig.cssName,
    imgPath: spriteConfig.imgPath,
    cssOpts: {
      functions: false
    },
    cssVarMap: function (sprite) {
      sprite.name = 'sprite-' + sprite.name;
    }
  }));
  spriteData.img.pipe(gulp.dest(paths.images.dest));
  spriteData.css.pipe(gulp.dest(paths.styles.src));
});

gulp.task('watch', ['sprite', 'css', 'scripts'], function() {
  gulp.watch(appFiles.styles, ['css']).on('change', function(evt) {
    changeEvent(evt);
  });
  gulp.watch(paths.scripts.src + '*.js', ['scripts']).on('change', function(evt) {
    changeEvent(evt);
  });
  gulp.watch(paths.sprite.src, ['sprite']).on('change', function(evt) {
    changeEvent(evt);
  });
});

gulp.task('default', ['css', 'scripts']);