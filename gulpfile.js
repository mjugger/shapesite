const gulp = require('gulp');
const pug = require('gulp-pug');
const htmlMinify = require('gulp-htmlmin');
const babel = require('gulp-babel');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const stylus = require('gulp-stylus');
const cleanMinify = require('gulp-clean-css');
var imagemin = require('gulp-imagemin');

gulp.task('pugToHTML', () =>
    gulp.src(['!app/views/layout.pug','app/views/*.pug'])
        .pipe( pug() )
        .pipe( htmlMinify() )
        .pipe( gulp.dest('dist') )
);

gulp.task('scripts', () =>
    gulp.src([
        'app/scripts/!(cubical)*.js',
        'app/scripts/cubical.js'
    ])
        .pipe(babel({
            presets: ['env']
        }))
        .pipe(concat('all.js'))
        .pipe(gulp.dest('dist/js'))
);

gulp.task('styles', () =>
    gulp.src('app/styles/styles.styl')
        .pipe( stylus() )
        .pipe( cleanMinify() )
        .pipe( gulp.dest('dist/css') )
);

gulp.task('compressImages', () =>
    gulp.src('app/images/*')
        .pipe( imagemin() )
        .pipe( gulp.dest('dist/imgs') )
);

gulp.task('watch', () => {
    gulp.watch('app/views/*.pug',['pugToHTML']);
    gulp.watch('app/styles/*.styl',['styles']);
    gulp.watch('app/scripts/*.js',['scripts']);
});

gulp.task('default',['pugToHTML','styles','scripts','compressImages','watch']);
