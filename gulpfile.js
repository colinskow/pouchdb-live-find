var gulp   = require('gulp'),
  jshint = require('gulp-jshint'),
  stylish = require('jshint-stylish'),
  mocha = require('gulp-mocha'),
  browserify = require('browserify'),
  Server = require('karma').Server,
  uglify = require('gulp-uglify'),
  rimraf = require('rimraf'),
  source = require('vinyl-source-stream'),
  rename = require('gulp-rename'),
  streamify = require('gulp-streamify');

gulp.task('lint', function() {
  return gulp.src(['./lib/*.js', './test/*.js', './examples/*.js'])
    .pipe(jshint({node: true, browser: true, validthis: true, globals: {Promise: true}}))
    .pipe(jshint.reporter(stylish))
    .pipe(jshint.reporter('fail'));
});

gulp.task('test-node', ['lint'], function () {
  return gulp.src('test/live-find.spec.js', {read: false})
    .pipe(mocha({timeout: 5000}));
});

gulp.task('clean', ['test-node'], function (cb) {
  rimraf('./dist', cb);
});

gulp.task('build-browser', ['clean'], function() {
  return browserify('./lib/index.js')
    .bundle()
    .pipe(source('pouchdb.live-find.js'))
    .pipe(gulp.dest('./dist/'))
    .pipe(rename('pouchdb.live-find.min.js'))
    .pipe(streamify(uglify()))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('build-browser-test', ['build-browser'], function() {
  return browserify('./test/live-find.spec.js')
    .exclude('pouchdb')
    .exclude('pouchdb-find')
    .exclude('memdown')
    .exclude('chai')
    .exclude('./lib/index.js')
    .bundle()
    .pipe(source('live-find.browser.spec.js'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('test-browser', ['build-browser-test'], function (done) {
  new Server({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true
  }, done).start();
});

gulp.task('default', ['test-browser','build-browser-test', 'build-browser', 'clean', 'test-node', 'lint']);