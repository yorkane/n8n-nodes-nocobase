const gulp = require('gulp');
const svgmin = require('gulp-svgmin');
const rename = require('gulp-rename');

gulp.task('build:icons', () => {
  return gulp
    .src('nodes/**/*.svg')
    .pipe(
      svgmin({
        plugins: [
          {
            removeViewBox: false,
          },
        ],
      }),
    )
    .pipe(
      rename((path) => {
        path.basename = path.basename.replace('icon', '');
        return path;
      }),
    )
    .pipe(gulp.dest('dist/nodes'));
}); 