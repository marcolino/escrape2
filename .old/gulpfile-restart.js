// restart gulp when gulpfile is changed
var spawn = require('child_process').spawn;
gulp.task('gulp-autoreload', function() {
  // store current process if any
  var p;
  
  gulp.watch('gulpfile.js', spawnChildren);
  // comment the line below if server is started anywhere else
  spawnChildren();

  function spawnChildren(e) {
    if (p) {
      p.kill(); 
    }
    p = spawn('gulp', [ 'default' ], { stdio: 'inherit' });
  }
});
