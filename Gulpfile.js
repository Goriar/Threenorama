var gulp = require('gulp'),
del = require('del'),
gulpSequence = require('gulp-sequence'),
ghPages = require('gulp-gh-pages'),
server = require('gulp-server-livereload'),
coffee = require('gulp-coffee'),
sass = require('gulp-sass'),
jade = require('gulp-jade');

gulp.task('clean', function(){
	return del('public');	
});

gulp.task('copy', ['clean'], function(){
	gulp.src(['node_modules/angular/angular.js','node_modules/three/three.js','js/*.js'])
	.pipe(gulp.dest('public/js'));
	gulp.src('img/*')
	.pipe(gulp.dest('public/img'));
	gulp.src('node_modules/bootstrap-sass/assets/fonts/bootstrap/*')
	.pipe(gulp.dest('public/fonts'));
});

gulp.task('coffee', function(){
	gulp.src('coffee/*.coffee')
	.pipe(coffee())
	.pipe(gulp.dest('public/js'));
});

gulp.task('sass', function(){
	gulp.src('sass/[^_]*.sass')
	.pipe(sass())
	.pipe(gulp.dest('public/css'));
});

gulp.task('jade', function(){
	gulp.src('jade/[^_]*.jade')
	.pipe(jade())
	.pipe(gulp.dest('public'));
});

gulp.task('build',['copy'],gulpSequence(['coffee','sass','jade']));

gulp.task('deployDemo', function(){
	return gulp.src('./public/**/*')
	.pipe(ghPages());
});

gulp.task('watch', function(){
	gulp.watch('coffee/*.coffee',['coffee']);
	gulp.watch('sass/*.sass',['sass']);
	gulp.watch('jade/*.jade',['jade']);
	gulp.src('public')
	.pipe(server({
		livereload: true,
		open: true
	}));
});