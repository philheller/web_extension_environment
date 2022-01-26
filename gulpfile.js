// IMPORTS
// gulp & globals
const gulp = require("gulp");
const plumber = require("gulp-plumber");
const rename = require("gulp-rename");
const sourcemaps = require("gulp-sourcemaps");
const argv = require("yargs").argv;
const gulpif = require("gulp-if");
const log = require("fancy-log");
const notifier = require("node-notifier");
const npmDist = require("gulp-npm-dist");
const del = require("del");
const gzip = require("gulp-zip");

// media (imgs and svgs)
const svgmin = require("gulp-svgmin");
const svg2png = require("gulp-svg2png-update");

// sass
const sass = require("gulp-sass")(require("sass"));
sass.compiler = require("sass");
const postcss = require("gulp-postcss");
const autoprefixer = require("autoprefixer");
const cssnano = require("cssnano");

// html
const htmlmin = require("gulp-htmlmin");

// js
const buffer = require("vinyl-buffer");
const { createGulpEsbuild } = require("gulp-esbuild");
const gulpEsbuild = createGulpEsbuild({ incremental: false });

// IMPORTANT VARIABLES
const src = "./src";
const dist = "./dist";
const pack = "./package";

// png icons from svg
const extensionSVGIcon = "cursor.svg";
const iconSettings = {};

const browserDirExtension = ".zip";
const thunderbirdDirExtension = ".xpi";

// HELPER FUNCTIONS
// check for production marker
function isProduction() {
  return argv.production ? true : false;
}

function isIncludeDependencies() {
  return argv.includeDependencies ? true : false;
}

function howIncludeDependencies() {
  return argv.includeDependencies;
}

function notify(cb, title, message) {
  notifier.notify({
    title,
    message,
    wait: false,
  });
  cb();
}

// TASKS
// clear build
const clear = async (cb) => {
  await del(["dist"]);
  cb();
};

// copy imgs
const copyImgs = () =>
  gulp
    .src([`${src}/img/*.jpg`, `${src}/img/*.png`])
    .pipe(plumber())
    .pipe(gulp.dest(`${dist}/img/`));

// copy svgs
const svg = () =>
  gulp
    .src(`${src}/img/*.svg`)
    .pipe(plumber())
    .pipe(
      svgmin({
        plugins: [{ name: "removeViewBox", active: false }],
      })
    )
    .pipe(gulp.dest(`${dist}/img/`));

// create icons from svg
const svgToIcon = (size) =>
  gulp
    .src(`${src}/img/${extensionSVGIcon}`)
    .pipe(plumber())
    .on("end", () => log(`Creating icon with size ${size}`))
    .pipe(
      svg2png({
        width: size,
        height: size,
      })
    )
    .pipe(
      rename({
        suffix: size,
      })
    )
    .pipe(gulp.dest(`${dist}/img/icons`));

const svgToIcons = (cb) => {
  const sizes = [16, 24, 32, 48, 128];
  log(`Attempting to create the following icon sizes: ${sizes}`);
  sizes.forEach((size) => svgToIcon(size));
  cb();
};

// Copy _locales
const locales = () =>
  gulp
    .src(`${src}/_locales/**/messages.json`)
    .pipe(plumber())
    .pipe(gulp.dest("dist/_locales"));

// copy manifest
const cpManifest = () =>
  gulp
    .src(`${src}/manifest.json`)
    .pipe(plumber())
    .pipe(gulp.dest(`${dist}`));

// html => minified .html
const html = () =>
  gulp
    .src(`${src}/html/*.html`)
    // plumber for error-handling
    .pipe(plumber())
    // minify html
    .pipe(
      htmlmin({
        html5: true,
        collapseWhitespace: true,
        useShortDoctype: true,
        removeComments: true,
        removeRedundantAttributes: true,
        sortClassName: true,
        sortAttributes: true,
        minifyCSS: true,
        minifyJS: true,
      })
    )
    .pipe(gulp.dest(`${dist}/html/`));

// scss => min.css
const css = () =>
  gulp
    .src(`${src}/scss/**/*.scss`)
    // plumber for error-handling
    .pipe(plumber())
    // init sourcemap
    .pipe(sourcemaps.init())
    // Compile SASS to CSS
    .pipe(
      sass({
        includePaths: ["./node_modules"],
      }).on("error", sass.logError)
    )
    // add autoprefixer & cssNano
    .pipe(postcss([autoprefixer(), cssnano()]))
    // add suffix
    .pipe(rename({ suffix: ".min" }))
    // write sourcemap
    .pipe(sourcemaps.write(""))
    .pipe(gulp.dest(`${dist}/css`));

// js => minified js
const js = (inputFromSrc) => {
  // check if this is the background script
  const bgScriptName = require(`${src}/manifest.json`).background
    .service_worker;

  const isBgScript = inputFromSrc === bgScriptName ? true : false;
  // ignore jest test files
  const jestTestsGlob = inputFromSrc.slice(0, -2).concat("test.js");

  // if it is backgroundscript, write to root folder, else write all to js
  const outputPath = isBgScript ? `${dist}/` : `${dist}/js`;
  return gulp
    .src([`${src}/${inputFromSrc}`, `!${src}/${jestTestsGlob}`])
    .pipe(plumber())
    .pipe(
      gulpEsbuild({
        bundle: false,
        minifyWhitespace: true,
        minifyIdentifiers: true,
        minifySyntax: true,
        sourcemap: true,
        platform: "browser",
      })
    )
    .pipe(buffer())
    .pipe(gulp.dest(outputPath));
};
const contentScripts = () => js(`js/**/*.js`);
const backgroundScript = () => js(`background.js`);

// Copy dependencies to dist/public/libs/
const publicLibs = (cb) => {
  if (!npmDist().length) {
    log("There is no dependency to be included.");
    log("Use 'npm i <package_name>' to install dependencies.");
    return cb();
  }
  return gulp
    .src(npmDist(), { base: "./node_modules/" })
    .pipe(plumber())
    .pipe(
      rename(function (path) {
        path.dirname = path.dirname.replace(/\/dist/, "").replace(/\\dist/, "");
      })
    )
    .pipe(gulp.dest(`${dist}/public/libs`));
};

// Copy dependencies to dist/js/libs/
const contentScriptLibs = (cb) => {
  if (!npmDist().length) {
    log("There is no dependency to be included.");
    log("Use 'npm i <package_name>' to install dependencies.");
    return cb();
  }
  return gulp
    .src(npmDist(), { base: "./node_modules/" })
    .pipe(plumber())
    .pipe(
      rename(function (path) {
        path.dirname = path.dirname.replace(/\/dist/, "").replace(/\\dist/, "");
      })
    )
    .pipe(gulp.dest(`${dist}/js/libs`));
};

// determine lib packing style (f.e. using libs as content script or in public folder)
const packDependencies = (cb) => {
  if (isIncludeDependencies()) {
    log("Dependencies will be packed with build.");
    const how = howIncludeDependencies();
    if (how == 1) return publicLibs(cb);
    else if (how == 2) return contentScriptLibs(cb);
  }
  cb();
};

// to folders for installs
const compress = (ext) => {
  const manifest = require(`${dist}/manifest.json`);
  const version = manifest.version;
  const name = manifest.name;
  const fileName = `${name}_${version}`;

  return gulp
    .src(`${dist}/**/*`)
    .pipe(plumber())
    .pipe(gzip(`${fileName}${ext}`))
    .pipe(gulp.dest(`${pack}`));
};

// zip for chrome, firefox
const zip = () => compress(browserDirExtension);
// xpi for thunderbird
const thunderZip = () => compress(thunderbirdDirExtension);

// function to watch
const watch = () => {
  log("Watching files...");
  gulp.watch(`${src}/manifest.json`, gulp.series(cpManifest));
  gulp.watch(`${src}/_locales/**/messages.json`, gulp.series(locales));
  gulp.watch(
    [`${src}/img/**/*.png`, `${src}/img/**/*.png`],
    gulp.series(copyImgs)
  );
  gulp.watch(`${src}/img/**/*.svg`, gulp.series(svg));
  gulp.watch(`${src}/html/**/*.html`, gulp.series(html));
  gulp.watch(`${src}/scss/**/*.scss`, gulp.series(css));
  gulp.watch(`${src}/**/*.js`, gulp.series(contentScripts, backgroundScript));
};

// all basic Tasks that are performed at beginning of sessions
const allBasicTasks = gulp.series(
  cpManifest,
  gulp.parallel(
    locales,
    copyImgs,
    svg,
    svgToIcons,
    html,
    css,
    contentScripts,
    backgroundScript
  ),
  packDependencies
);

// dev task (building and watching afterwards)
const dev = gulp.series(
  clear,
  allBasicTasks,
  (cb) =>
    notify(
      cb,
      "Clear build produced!",
      "The dist was cleared and freshly build. Any changes will be processed on save."
    ),
  watch
);

// build without watching
const build = gulp.series(clear, allBasicTasks, (cb) =>
  notify(cb, "Build done!", "The build is done.")
);

const package = gulp.series(clear, allBasicTasks, zip, thunderZip, (cb) => {
  notify(cb, "Packages are zipped.", "Packages are finished zipping.");
});

exports.dev = dev;
exports.build = build;
exports.clear = clear;
exports.package = package;
// default function (used with just "gulp")
exports.default = dev;
