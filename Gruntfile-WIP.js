module.exports = function(grunt) {
  'use strict';

  grunt.log.write('Loading external tasks...');

  // load grunt tasks automatically
  //require('load-grunt-tasks')(grunt);

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

    // empty folders to start fresh
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

    // ngAnnotate adds, removes, and rebuilds angularjs dependency injection annotations
    ngAnnotate: {
      options: {
        singleQuotes: true
      },
      app: {
        files: [
          {
            expand: true,
            src: [ '<%= cfg.app %>/scripts/**/*.js' ],
            dest: '.tmp'
          }
        ]
      }
    },

    // automatically inject Bower components into the app
    wiredep: {
      app: {
        src: [ '<%= cfg.app %>/index.html' ],
        ignorePath: /^\/|\.\.\//
      }
    },

    // renames files for browser caching purposes
    filerev: {
      dist: {
        src: [
          '<%= cfg.dist %>/scripts/{,*/}*.js',
          '<%= cfg.dist %>/styles/{,*/}*.css',
          '<%= cfg.dist %>/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}',
          '<%= cfg.dist %>/fonts({,*/}*'
        ]
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
        assetsDirs: [ '<%= cfg.dist %>', '<%= cfg.dist %>/images', '<%= cfg.dist %>/fonts' ]
      }
    },

    imagemin: {
      dist: {
        files: [
          {
            expand: true,
            cwd: '<%= cfg.app %>/images',
            src: '{,*/}*.{png,jpg,jpeg,gif}',
            dest: '<%= cfg.dist %>/images'
          }
        ]
      }
    },

    htmlmin: {
      dist: {
        options: {
          collapseWhitespace: true,
          conservativeCollapse: true,
          collapseBooleanAttributes: true,
          removeCommentsFromCDATA: true,
          removeOptionalTags: true
        },
        files: [{
          expand: true,
          cwd: '<%= cfg.app %>',
          src: [ '*.html', 'views/{,*/}*.html' ],
          dest: '<%= cfg.dist %>'
        }]
      }
    },

    // javascript lint
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: {
        src: [
          'Gruntfile.js',
          '<%= cfg.app %>/scripts/{,*/}*.js'
        ]
      },
      test: {
        options: {
          jshintrc: 'test/.jshintrc'
        },
        src: ['test/spec/{,*/}*.js']
      }
    },

    // uglify scripts
    uglify: {
      sourceMap : false,
      compress : {},
      mangle : true
    },

    // concatenate scripts
    concat: {
      options: {
        separator: '\n\n' // TODO...
      },
      dev: {
        src: [ 'public/**/*.js' ],
        dest: 'public.dist/scripts/all.js'
      }
    },

    // compile less to css
    less: {
      dev: {
        files: [
          {
            expand: true,
            cwd: 'styles',
            src: [ '*.less', '!mixins.less', '!var.less' ],
            dest: 'public.dist/styles/',
            ext: '.css'
          },
        ]
      }
    },

    // run express server
    express: {
      dev: {
        options: {
          script: 'bin/www'
        }
      }
    },
    
    // watch files and start actions on any registered modification
    watch: {
      livereload: {
        options: {
          livereload: true
        },
        files: [
          'Gruntfile.js',
          'public/**/*',
          'routes/**/*.js',
          'controllers/**/*.js',
          'models/**/*.js',
          '!data'
        ]
      },
      express: {
        files: [
          'Gruntfile.js',
          'routes/**/*.js',
          'controllers/**/*.js',
          'models/**/*.js',
        ],
        tasks:  [ 'express:dev' ],
        options: {
          spawn: false
        }
      },
      bower: {
        files: ['bower.json'],
        tasks: ['wiredep']
      },
      less: {
        files: [ 'public/styles/**/*.less' ],
        tasks: [ 'less' ],
      },
      concat: {
        files:  [ 'public/scripts/**/*.js' ],
        tasks: [ 'concat' ],
      }
    }
  });

  grunt.loadNpmTasks('grunt-express-server');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-ng-annotate');
  grunt.loadNpmTasks('grunt-wiredep');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-less');

  grunt.registerTask('build', [ 'concat', 'less', 'minify' ]);
  //grunt.registerTask('deploy', [ 'concat', 'less', deploy ]);
  grunt.registerTask('default', [ 'express:dev', 'watch' ]);

  grunt.registerTask('serve', 'compile and watch', function (target) {
    grunt.task.run([
      'clean:server',
      //'configureProxies:livereload',
      'wiredep',
      'useminPrepare',
      'ngAnnotate',
      //'concurrent:server',
      //'ngtemplates:serve',
      //'autoprefixer',
      //'connect:livereload',
      'usemin',
      'express:dev', 
      'watch'
    ]);
  });
};