var gulp = require('gulp'),
    jasmineBrowser = require('gulp-jasmine-browser');

var nittro = require('./nittro.json');

gulp.task('test', function () {
    return gulp.src([
            'node_modules/promiz/promiz.js'
        ].concat(nittro.files.js)
        .concat('tests/specs/**.spec.js'))
        .pipe(jasmineBrowser.specRunner({console: true}))
        .pipe(jasmineBrowser.headless());
});

gulp.task('default', ['test']);
