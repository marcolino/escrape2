'use strict';

module.exports = function(grunt) {

  // load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // time how long tasks take - can help when optimizing build times
  require('time-grunt')(grunt);

  // configurable paths for the application
  var cfg = {
    app: require('./bower.json').appPath || 'public',
    dist: 'public.dist'
  };

  // project configuration
  grunt.initConfig({

    // import configuration
    cfg: cfg,

    // read package.json file
    pkg: grunt.file.readJSON('package.json'),

    // empties folders to start fresh
    clean: {
      dist: {
        files: [{
          dot: true,
          src: [
            '.tmp',
            '<%= cfg.dist %>/{,*/}*',
            '!<%= cfg.dist %>/.git{,*/}*'
          ]
        }]
      },
      server: '.tmp'
    },

    // watches files for changes and runs tasks based on the changed files
    watch: {
      bower: {
        files: [ 'bower.json' ],
        tasks: [ 'wiredep' ]
      },
      js: {
        files: [ '<%= cfg.app %>/scripts/{,*/}*.js' ],
        tasks: [ 'newer:jshint:all' ],
        options: {
          livereload: '<%= connect.options.livereload %>'
        }
      },
      //jsTest: {
      //  files: [ 'test/spec/{,*/}*.js' ],
      //  tasks: [ 'newer:jshint:test', 'karma' ]
      //},
      styles: {
        files: [ '<%= cfg.app %>/styles/{,*/}*.css' ],
        tasks: [ 'newer:copy:styles', 'autoprefixer' ]
      },
      gruntfile: {
        files: [ 'Gruntfile.js' ]
      },
      livereload: {
        options: {
          livereload: '<%= connect.options.livereload %>'
        },
        files: [
          '<%= cfg.app %>/{,*/}*.html',
          '.tmp/styles/{,*/}*.css',
          '<%= cfg.app %>/assets/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}'
        ]
      }
    },

    // automatically inject bower components into the app
    wiredep: {
      app: {
        src: [ '<%= cfg.app %>/index.html' ],
        ignorePath:  /\.\.\//
      }
    },

    // concatenate javascript files
    concat: {
      options : {
        sourceMap: true
      },
      dist: {
        src: ['<%= cfg.app %>/scripts/**/*.js'],
        dest: '.tmp/concat-app.js'
      }
    },

    // ng-annotate tries to make the code safe for minification automatically
    // by using the Angular long form for dependency injection
    ngAnnotate: {
      dist: {
        files: [{
          expand: true,
          cwd: '.tmp',
          src: [ 'concat-app.js' ],
          dest: '.tmp/concat-annotated-app.js'
        }]
      }
    },

    // uglify (compress) javascript
    uglify: {
      options: {
        sourceMap: true,
        sourceMapIncludeSources: true,
        sourceMapIn: '.tmp/concat-app-annotated.js.map'
      },
      dist: {
        src: '.tmp/concat-annotated-app.js',
        dest: '<%= cfg.dist %>/scripts/app.min.js'
      }
    },

/*
    // compile less stylesheets to css
    less: {
      build: {
        files: {
          '<%= cfg.dist %>/styles/style.css': '<%= cfg.dist %>/styles/style.less'
        }
      }
    }
*/

    // reads HTML for usemin blocks to enable smart builds that automatically
    // concat, minify and revision files; creates configurations in memory so
    // additional tasks can operate on them
    useminPrepare: {
      html: '<%= cfg.app %>/index.html',
      options: {
        dest: '<%= cfg.dist %>',
        flow: {
          html: {
            steps: {
              js: [ 'ngAnnotate', 'concat', 'uglifyjs' ],
              css: [ 'cssmin' ]
            },
            post: {}
          }
        }
      }
    },

    // performs rewrites based on filerev and the useminPrepare configuration
    usemin: {
      html: [ '<%= cfg.dist %>/{,*/}*.html' ],
      css: [ '<%= cfg.dist %>/styles/{,*/}*.css' ],
      options: {
        assetsDirs: [ '<%= cfg.dist %>','<%= cfg.dist %>/assets' ] // /images
      }
    },

    // run some tasks in parallel to speed up the build process
    concurrent: {
      server: [
        //'copy:styles'
      ],
      test: [
        //'copy:styles'
      ],
      dist: [
/*
        //'copy:styles',
        //'imagemin',
        //'svgmin'
        tasks: [ 'nodemon', 'watch' ],
        options: {
          logConcurrentOutput: true
        }
*/
      ]
    },

  });

  // load the plugin that provides the "uglify" task
  //grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('start', 'Compile then start a connect web server', function (target) {
    if (target === 'dist') {
      grunt.task.run([
        'build',
        'connect:dist:keepalive'
      ]);
    } else {
      grunt.task.run([
        'clean:server',
        'wiredep',
///       'postcss',
//        'open',
//        'connect:livereload',
//        'watch',
      ]);
    }
  });

  grunt.registerTask('test', [
    'clean:server',
    'concurrent:test',
///   'postcss',
//    'connect:test',
//    'karma'
  ]);

  grunt.registerTask('build', [
    'clean:dist',
    'wiredep',
    'useminPrepare',
    'concurrent:dist',
///   'postcss',
///    'concat',
///   'ngAnnotate',
//    'copy:dist',
//    'cdnify',
///    'cssmin',
///    'uglify',
//    'filerev',
    'usemin',
//    'htmlmin'
  ]);

  // default task(s)
  grunt.registerTask('default', [
    //'newer:jshint',
    //'test',
    'build',
  ]);
};