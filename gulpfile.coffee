'use strict'

_ = require('lodash')
gulp = require('gulp')
gutil = require('gulp-util')
coffee = require('gulp-coffee')
plumber = require('gulp-plumber')
eslint = require('gulp-eslint')

source = {
  coffee: './src/*.coffee'
  js: './lib/*.js'
}

dest = {
  js: './lib'
}

gulp.task('coffee', ->
  return gulp.src(source.coffee)
    .pipe( plumber() )
    .pipe( coffee({map: false}).on('error', gutil.log) )
    .pipe( gulp.dest(dest.js) )
)

gulp.task('lint', ->
  return gulp.src(source.js)
    .pipe( eslint() )
    .pipe( eslint.format() )
)

gulp.task('watch', ->
  gulp.watch(source.coffee, ['coffee'])
  gulp.watch(source.js, ['lint'])
)

gulp.task('default', ['coffee', 'watch'])
