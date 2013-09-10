var browserify = require("browserify");
var typeify = require("../typeify");

var b = browserify();
b.transform(typeify);
b.add("./A.ts");
b.bundle({ debug: true }).pipe(process.stdout);