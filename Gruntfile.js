module.exports = function(grunt) {
  'use strict';

  grunt.log.write('Loading external tasks...');

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
    //pkg: grunt.file.readJSON('package.json'),

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

    watch: {
      // for scripts, run jshint and uglify
      scripts: {
        files: '<%= jshint.build %>',
        //files: [ 'Grunfile.js', 'routes/** /*.js', 'controllers/** /*.js', 'models/** /*.js' ],
        tasks: [ 'jshint' ]
      },
      livereload: {
        options: {
          livereload: true
        },
        files: [
          'public/**/*.{html,css,js}',
        ]
      }
    },

    // configure jshint to validate js files
    jshint: {
      options: {
        laxcomma: true,
        reporter: require('jshint-stylish') // use jshint-stylish to make our errors look and read good
      },

      // when this task is run, lint the Gruntfile and all js files in src
      build: [ 'Gruntfile.js', 'routes/**/*.js', 'controllers/**/*.js', 'models/**/*.js' ]
    },

    nodemon: {
      dev: {
        options: {
          file: 'bin/www'
        }
      }
    },

    concurrent: {
      dev: {
        tasks: [ 'nodemon:dev', 'watch', ],
        options: {
          logConcurrentOutput: true
        }
      }
    },

  });

  grunt.registerTask('default', [
    'concurrent',
  ]);

};
