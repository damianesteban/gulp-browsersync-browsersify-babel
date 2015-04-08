var gulp = require('gulp');
var browserSync = require('browser-sync');
var browserify = require('browserify');
var babelify = require('babelify');
var watchify = require('watchify');
var source = require('vinyl-source-stream');
var plugins = require('gulp-load-plugins')({ camelize: true });

var paths = {
  reload: {
    watch: ['*.html']
  },

  scss: {
    src: ['scss/**/[!_]*.scss'],
    watch: 'scss/**/*',
    dest: 'css'
  },

  js: {
    src: ['./scripts/main.js'],
    compiled: 'bundle.js',
    minified: 'bundle.min.js',
    dest: 'build'
  }
};

// Main Tasks
// ---------------------------------------------------
gulp.task('default', ['watch']);
gulp.task('watch', ['browser-sync', 'watch-files', 'styles', 'scripts']);
gulp.task('build', ['styles:production', 'scripts:production']);

// Watch
// ---------------------------------------------------
gulp.task('watch-files', function () {
  gulp.watch(paths.scss.watch, ['styles']);
  gulp.watch(paths.reload.watch, ['browser-reload']);
});


// Sub Tasks
// -----------------------------------
// Browser Sync
gulp.task('browser-sync', ['styles', 'scripts'], function () {
  browserSync({
    server: {
      baseDir: "./"
    }
  });
});

gulp.task('browser-reload', function () {
  browserSync.reload();
});

// Styles
// -----------------------------------
/**
 * Takes main.scss, add the prefixes and set the compiled file in the css folder.
 * @param {boolean} [develop] Activates development mode
 */
function compileStyles(develop) {
  var bundle = gulp.src(paths.scss.src)
    // Sass with sourcemaps
    .pipe(plugins.sass({
      onError: handleErrors,
      sourceComments: 'map',
      sourceMap: true,
      includePaths: ['bower_components/bootstrap-sass/assets/stylesheets']
    }))
    .pipe(plugins.sourcemaps.init({loadMaps: true}))
    .pipe(plugins.autoprefixer(['last 3 versions', '> 1%'], { cascade: true }));

  if (develop) {
    return bundle
      .pipe(plugins.sourcemaps.write('./'))
      .pipe(gulp.dest(paths.scss.dest))
      .pipe(plugins.filter('**/*.css')) // Only inject css files to the browser
      .pipe(browserSync.reload({stream: true}));
  }

  // Production
  return bundle
    .pipe(plugins.rename({ suffix: '.min' }))
    .pipe(plugins.minifyCss())
    .pipe(plugins.sourcemaps.write('./'))
    .pipe(gulp.dest(paths.scss.dest));

}

gulp.task('styles', function () {
  compileStyles(true);
});

gulp.task('styles:production', function () {
  compileStyles();
});


// Scripts
// -----------------------------------
/**
 * Handles scripts task for development and production.
 *
 * @param {boolean} [watch]
 * @returns {*}
 */
function compileScripts(watch) {
  // Create the browserify instance
  var bundler = browserify({
    cache: {},
    packageCache: {},
    fullPaths: true,
    debug: true,
    entries: paths.js.src
  });

  bundler.transform(babelify); // 6to5 compiler

  // For production
  if (!watch) {
    return bundler.bundle();
  }

  // Development
  bundler = watchify(bundler);

  bundler.on('update', function () {
    rebundle();
    plugins.util.log('Rebundle...')
  });

  function rebundle() {
    return bundler
      .bundle()
      .on('error', handleErrors)
      .pipe(source(paths.js.compiled))
      .pipe(gulp.dest(paths.js.dest))
      .pipe(browserSync.reload({stream: true})); // Reload browsers!!!
  }

  return rebundle();
}

gulp.task('scripts', function () {
  compileScripts(true);
});

gulp.task('scripts:production', function () {
  var st = plugins.streamify;

  // transform regular node stream to gulp (buffered vinyl) stream
  return compileScripts()
    .pipe(source(paths.js.minified))
    .pipe(st(plugins.sourcemaps.init({loadMaps: true})))
    // Add transformation tasks to the pipeline here.
    .pipe(st(plugins.ngAnnotate()))
    .pipe(st(plugins.uglify()))
    .pipe(st(plugins.sourcemaps.write('./')))
    .pipe(gulp.dest(paths.js.dest));
});


// Utils
// -----------------------------------
/**
 * Handler for errors. Shows the notification in the browser and the console.
 *
 * @param {Object|String} e
 * @returns {boolean}
 */
 function handleErrors(e) {
  var message = null;

  if (typeof e === 'object') message = e.message;
  if (typeof e === 'string') message = e;

  browserSync.notify(message);
  console.log(message);
  return true;
}
