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

    // automatically inject bower components into the app
    wiredep: {
      app: {
        src: [ '<%= cfg.app %>/index.html' ],
        ignorePath:  /\.\.\//
      }
    },

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
              js: [ 'concat', 'uglifyjs' ],
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

    // uglify scripts
    uglify: {
      options: {
        banner: '/*! <%= grunt.template.today("yyyy-mm-dd") %> */\n',
        //mangleProperties: true,
        //reserveDOMCache: true
      },
      build: {
        files: [{
          expand: true,
          cwd: '<%= cfg.app %>/scripts',
          src: '**/*.js',
          dest: '<%= cfg.dist %>/scripts'
        }]
      }
    }
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
        'concurrent:server',
//        'autoprefixer',
//        'open',
//        'connect:livereload',
//        'watch',
      ]);
    }
  });

  grunt.registerTask('test', [
    'clean:server',
    'concurrent:test',
//    'autoprefixer',
//    'connect:test',
//    'karma'
  ]);

  grunt.registerTask('build', [
    'clean:dist',
    'wiredep',
    'useminPrepare',
    'concurrent:dist',
//    'autoprefixer',
//    'concat',
//    'ngAnnotate',
//    'copy:dist',
//    'cdnify',
//    'cssmin',
    'uglify',
//    'filerev',
//    'usemin',
//    'htmlmin'
  ]);

  // default task(s)
  grunt.registerTask('default', [
    //'newer:jshint',
    //'test',
    'build',
  ]);
};