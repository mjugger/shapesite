# shapesite
web application for shape security

# Get up and running
install
```
npm install
```
then
```
node index.js
```
to start the express server. Go to `localhost:3003` to see the site.
The web server runs the site from the `dist/` build directory.
# How to build
This project leverages `gulp.js` to build the project and watch for changes.
to do a build just run:
```
gulp
```
from the command line. Once the files are built, `gulp` will watch for changes in `.pug`, `.styl`, and `.js` files.
If the `gulp` command doesn't work then you may have to install `gulp` globally as well.