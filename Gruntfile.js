/*
   sample usage:

 $ grunt serve
 $ grunt serve:dist
 $ grunt serve:dist --api=qa
 $ grunt test
 $ grunt test:jshint
 $ grunt test:e2e.update
 $ grunt test:e2e.start
 $ grunt test:e2e
 $ grunt test:suite
 $ grunt deploy
 $ grunt deploy:staging

*/
'use strict';

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to recursively match all subfolders:
// 'test/spec/**/*.js'

var modRewrite = require('connect-modrewrite');

module.exports = function (grunt) {

  //var flag = grunt.option('flag'),

  // load grunt tasks automatically
  //require('load-grunt-tasks')(grunt);

  // time how long tasks take; can help when optimizing build times
  require('time-grunt')(grunt);

  // configurable paths for the application
  var appConfig = {
    app: require('./bower.json').appPath || 'app',
    dist: 'dist'
  };

  // define the configuration for all the tasks
  grunt.initConfig({

    // project settings
    cfg: appConfig,

    // watches files for changes and runs tasks based on the changed files
    watch: {
      bower: {
        files: [ 'bower.json' ],
        tasks: [ 'wiredep' ]
      },
      js: {
        files: [ '<%= cfg.app %>/scripts/**/*.js' ],
        tasks: [ 'newer:jshint:all' ],
        options: {
          livereload: true
        }
      },
      jsTest: {
        files: [ '<%= cfg.app %>/scripts/**/*.test.js', 'test/e2e/**/*.js', 'test/karma.conf.js', 'test/protractor.conf.js' ],
        tasks: [ 'newer:jshint:test' ]
      },
      html: {
        files: [ '<%= cfg.app %>/**/*.html' ],
        tasks: [ 'ngtemplates:serve' ],
        options: {
          livereload: true
        }
      },
      less: {
        files: [ '<%= cfg.app %>/**/*.{less}'],
        tasks: [ 'less:server', 'autoprefixer']
      },
      gruntfile: {
        files: [ 'Gruntfile.js' ]
      },
      livereload: {
        options: {
          livereload: true
        },
        files: [
          '<%= cfg.app %>/**/*.html',
          '.tmp/styles/{,*/}*.css',
          '<%= cfg.app %>/images/**/*.{png,jpg,jpeg,gif,webp,svg}'
        ]
      }
    },

    // lint javascript
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: {
        src: [
          'Gruntfile.js',
          '<%= cfg.app %>/scripts/**/*.js',
        ]
      },
      test: {
        options: {
          jshintrc: 'test/.jshintrc'
        },
        src: [
          'test/e2e/**/*.js',
          'test/karma.conf.js',
          'test/protractor.conf.js'
        ]
      }
    },

    // html linting with good angular support
    // https://github.com/nikestep/grunt-html-angular-validate
    htmlangular: {
      options: {

      },
      all: {
        src: [
          '<%= cfg.app %>/**/*.html'
        ]
      }
    },

    ngtemplates:  {
      options: {
        module: 'SourceClear',
        url: function (templateString) {
          return '/' + templateString;
        }
      },
      serve: {
        cwd: '<%= cfg.app %>/',
        src: [
          '**/*.html',
          '!index.html',
          '!404.html'
        ],
        dest: '.tmp/scripts/templates.js',
        options: {

        }
      },
      dist: {
        cwd: '<%= cfg.app %>/',
        src: [
          '**/*.html',
          '!index.html',
          '!404.html'
        ],
        dest: '.tmp/scripts/templates.js',
        options: {
          usemin: '/scripts/app.js' // <~~ This came from the <!-- build:js --> block
        }
      }
    },

    injector: {
      options: {
        ignorePath: '<%= cfg.app %>/'
      },
      localDependencies: {
        files: {
          '<%= cfg.app %>/index.html': [
            '<%= cfg.app %>/**/*.js',
            '!<%= cfg.app %>/**/*.test.js', // no tests in client... duh
            '!<%= cfg.app %>/scripts/segment.js' // any files in our <head> area
          ],
        }
      }
    },

    // Empties folders to start fresh
    clean: {
      dist: {
        files: [{
          dot: true,
          src: [
            '.tmp',
            '<%= cfg.dist %>'
          ]
        }]
      },
      server: '.tmp'
    },

    // Add vendor prefixed styles
    autoprefixer: {
      options: {
        browsers: ['last 3 versions', 'ie 8', 'ie 9']
      },
      dist: {
        files: [{
          expand: true,
          cwd: '.tmp/styles/',
          src: '{,*/}*.css',
          dest: '.tmp/styles/'
        }]
      }
    },

    // Automatically inject Bower components into the app
    wiredep: {
      options: {

      },
      app: {
        src: ['<%= cfg.app %>/index.html'],
        exclude: ['bower_components/bootstrap-sass-official', 'sourceclear-style-guide'],
        ignorePath:  /\.\./ // removes ".."
      },
      sass: {
        src: ['<%= cfg.app %>/styles/{,*/}*.{scss,sass}'],
        ignorePath: /(\.\.\/){1,2}bower_components\// // removes "../bower_components"
      }
    },

    // Compiles sass to CSS and generates necessary files if requested
    sass: {
      options: {
        // libsassDir: '<%= cfg.app %>/styles',
        // cssDir: '.tmp/styles',
        // generatedImagesDir: '.tmp/images/generated',
        // imagesDir: '<%= cfg.app %>/images',
        // javascriptsDir: '<%= cfg.app %>/scripts',
        // fontsDir: '<%= cfg.app %>/styles/fonts',
        // importPath: './bower_components',
        // httpImagesPath: '/images',
        // httpGeneratedImagesPath: '/images/generated',
        // httpFontsPath: '/styles/fonts',
        // relativeAssets: false,
        // assetCacheBuster: false,
        // raw: 'sass::Script::Number.precision = 10\n'
        precision: 10,
        update: true
      },
      dist: {
        options: {
          sourceMap: true
        },
        files: {
          '.tmp/styles/main.css': '<%= cfg.app %>/styles/main.scss'
        }
      },
      server: {
        options: {
          debugInfo: true
        },
        files: {
          '.tmp/styles/main.css': '<%= cfg.app %>/styles/main.scss'
        }
      }
    },

    // Renames files for browser caching purposes
    filerev: {
      dist: {
        src: [
          '.tmp/scripts/templates.js',
          '<%= cfg.dist %>/scripts/{,*/}*.js',
          '<%= cfg.dist %>/styles/{,*/}*.css',
          '<%= cfg.dist %>/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}',
          '<%= cfg.dist %>/styles/fonts/*'
        ]
      }
    },

    // Reads HTML for usemin blocks to enable smart builds that automatically
    // concat, minify and revision files. Creates configurations in memory so
    // additional tasks can operate on them
    useminPrepare: {
      html: '<%= cfg.app %>/**/*.html',
      options: {
        dest: '<%= cfg.dist %>'
      }
    },

    // Performs rewrites based on filerev and the useminPrepare configuration
    usemin: {
      html: ['<%= cfg.dist %>/**/*.html'],
      js: ['<%= cfg.dist %>/**/*.js'],
      css: ['<%= cfg.dist %>/**/*.css'],
      options: {
        assetsDirs: ['<%= cfg.dist %>','<%= cfg.dist %>/images'],
        patterns: {
          // FIXME While usemin won't have full support for revved files we have to put all references manually here
          js: [
              [/(images\/.*?\.(?:gif|jpeg|jpg|png|webp|svg))/gm, 'Update the JS to reference our revved images']
          ]
        }
      }
    },

    // The following *-min tasks will produce minified files in the dist folder
    // By default, your `index.html`'s <!-- Usemin block --> will take care of
    // minification. These next options are pre-configured if you do not wish
    // to use the Usemin blocks.
    // cssmin: {
    //   dist: {
    //     files: {
    //       '<%= cfg.dist %>/styles/main.css': [
    //         '.tmp/styles/{,*/}*.css'
    //       ]
    //     }
    //   }
    // },
    uglify: {
      options: {
        mangle: false
      }
    },
    // concat: {
    //   dist: {}
    // },

    imagemin: {
      dist: {
        files: [{
          expand: true,
          cwd: '<%= cfg.app %>/images',
          src: '{,*/}*.{png,jpg,jpeg,gif}',
          dest: '<%= cfg.dist %>/images'
        }]
      }
    },

    svgmin: {
      dist: {
        files: [{
          expand: true,
          cwd: '<%= cfg.app %>/images',
          src: '{,*/}*.svg',
          dest: '<%= cfg.dist %>/images'
        }]
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
          cwd: '<%= cfg.dist %>',
          src: ['*.html', 'views/{,*/}*.html'],
          dest: '<%= cfg.dist %>'
        }]
      }
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
            src: ['<%= cfg.app %>/**/*.js', '!<%= cfg.app %>/**/*.test.js'],
            dest: '.tmp'
          }
        ]
      }
    },

    // Copies remaining files to places other tasks can use
    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= cfg.app %>',
          dest: '<%= cfg.dist %>',
          src: [
            '*.{ico,png,txt}',
            'index.html',
            '404.html',
            'images/{,*/}*.{webp}',
            'fonts/**/*'
          ]
        }, {
          expand: true,
          cwd: '.tmp/images',
          dest: '<%= cfg.dist %>/images',
          src: ['generated/*']
        }, {
          expand: true,
          cwd: './bower_components/components-font-awesome/fonts',
          src: '*',
          dest: '<%= cfg.dist %>/fonts'
        }]
      }
    },

    // Run some tasks in parallel to speed up the build process
    concurrent: {
      server: [
        'sass:server'
      ],
      test: [
        'sass'
      ],
      dist: [
        'sass:dist',
        'imagemin',
        'svgmin'
      ]
    },

    // Test settings
    karma: {
      unit: {
        configFile: 'test/karma.conf.js',
        singleRun: true
      }
    },

    buildcontrol: {
      options: {
        dir: 'dist',
        commit: true,
        push: true,
        message: 'Built %sourceName% from commit %sourceCommit% on branch %sourceBranch%'
      },
      staging: {
        options: {
          remote: 'git@github.com:sourceclear/app.sourceclear.com-frontend.git',
          branch: 'staging'
        }
      },
      release: {
        options: {
          remote: 'git@github.com:sourceclear/app.sourceclear.com-frontend.git',
          branch: 'release'
        }
      }
    },

    bump: {
      options: {
        files: ['package.json'],
        updateConfigs: [],
        commit: true,
        commitMessage: 'Release v%VERSION%',
        commitFiles: ['package.json'],
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'Version %VERSION%',
        push: true,
        pushTo: 'origin',
        gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d'
      }
    },

    exec: {
      // Download and update webdriver-manager script within protractor node module
      updateWebDriverManager: './node_modules/protractor/bin/webdriver-manager update',

      // Start webdriver-manager server
      startWebDriverManager: './node_modules/protractor/bin/webdriver-manager start',

      // Run protractor e2e tests
      runProtractor: './node_modules/protractor/bin/protractor test/protractor.conf.js'
    }
  });

  grunt.registerTask('serve', 'Compile then start a connect web server', function (target) {
    if (target === 'dist') {
      return grunt.task.run(['build', 'connect:dist:keepalive']);
    }

    grunt.task.run([
      'clean:server',
      'injector',
      'configureProxies:livereload',
      'wiredep',
      'concurrent:server',
      'ngtemplates:serve',
      'autoprefixer',
      'connect:livereload',
      'watch'
    ]);
  });

  grunt.registerTask('test', 'Execute tests', function (target) {
    // Update webdriver-manager on 'grunt test:e2e.update'
    if (target === 'e2e.update') {
      return grunt.task.run(['exec:updateWebDriverManager']);
    }

    // Start webdriver-manager on 'grunt test:e2e.start'
    if (target === 'e2e.start') {
      return grunt.task.run(['exec:startWebDriverManager']);
    }

    // Execute karma unit tests on 'grunt test' or 'grunt test:suite'
    if (typeof target === 'undefined' || target === 'suite') {
      grunt.task.run([
        'clean:server',
        'injector',
        'concurrent:test',
        'autoprefixer',
        'connect:test',
        'karma'
      ]);
    }

    // Execute protractor e2e tests on 'grunt test:e2e' or 'grunt test:suite'
    if (target === 'e2e' || target === 'suite') {
      grunt.task.run(['exec:runProtractor']);
    }

    // Execute jshint on 'grunt test:jshint' or 'grunt test:suite'
    if (target === 'jshint' || target === 'suite') {
      grunt.task.run(['newer:jshint']);
    }
  });

  grunt.registerTask('build', [
    'clean:dist',
    'configureProxies:dist',
    'wiredep',
    'ngAnnotate',
    'injector',
    'concurrent:dist',
    'useminPrepare',
    'ngtemplates:dist',
    'autoprefixer',
    'concat',
    'copy:dist',
    'cssmin',
    'uglify',
    'filerev',
    'usemin',
    'htmlmin'
  ]);

  /**
   * Use:
   * grunt deploy:target --force
   * @param  {string} target  matches what follows deploy:*
   */
  grunt.registerTask('deploy', 'Test, build, then git deploy', function (target) {

    // returns true if included but not set to anything in particular
    var force = grunt.option('force');

    /*
      Don't allow forced deploys to prod... for now.
     */
    if(force) {
      return grunt.task.run(['build', 'buildcontrol:staging']);
    }

    if(target === 'prod') {

      grunt.task.run([
        'test:suite',
        'build',
        'buildcontrol:' + target
      ]);

    } else {

      grunt.task.run([
        'test:suite',
        'build',
        'buildcontrol:' + target
      ]);

    }

  });
};