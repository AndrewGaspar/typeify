import through = require("through");
import fs = require("fs");
import childproc = require("child_process");
import path = require("path");

import convert = require("convert-source-map");
import embed = require("embed-source-map");

var myPathMap: { [key: string]: string } = {};

class TypescriptCompileError implements Error {
	name = "Compile Error";
	message = "Could not compile TypeScript file";
	stdout: string;
	stderr: string;
}

var sourceMapUrlRegex = /\/\/# sourceMappingURL=(([\w-\.]+)\.js\.map)/;

// Turns out the following code is not necessary - it seemingly works, but tsc will automatically compile dependencies

var postCompileRequireRegex = /(var \w* = require\(")([\.\\\/]*\w+)("\))/;

function replaceFirstRequire(dir: string, originalText: string, callback: (err, data: {
	match: string;
	replacement: string;
	requirePath: string;
	tsPath: string;
	newText: string;
	matchIndex: number;
}) => void) {
	var matchObj = postCompileRequireRegex.exec(originalText);
	if (!matchObj) return callback(null, { match: "", replacement: "", requirePath: null, tsPath: null, newText: originalText, matchIndex: originalText.length });
	else {
		var match = matchObj[0];
		var prefix = matchObj[1];
		var requirePath = matchObj[2];
		var postFix = matchObj[3];
		var index: number = matchObj.index

		var tsPath = requirePath + ".ts";
		var filePath = path.join(dir, tsPath);
		fs.exists(filePath, exists => {
			var output = originalText;
			if (exists) {
				var replacement = prefix + tsPath + postFix;
				output = originalText.replace(match, replacement);
			}
			callback(null, { match: match, replacement: replacement, requirePath: requirePath, tsPath: tsPath, newText: output, matchIndex: index });
		});
	}
}

function convertRequirePaths(fileName: string, originalText: string, cb: (err, newText?: string) => void) {
	var dir = path.dirname(fileName);

	function replacer(text: string, cb: (err, text?: string) => void) {
		replaceFirstRequire(dir, text, (err, data) => {
			if (err) return cb(err);

			if (data.matchIndex == text.length) {
				return cb(null, data.newText);
			}

			myPathMap[path.normalize(path.join(dir, data.tsPath))] = path.normalize(path.join(dir, data.requirePath));

			var pre = data.newText.substring(0, data.matchIndex + data.replacement.length);
			var sub = data.newText.substr(data.matchIndex + data.replacement.length);

			replacer(sub, (err, text?: string) => {
				if (err) return cb(err);

				cb(null, pre + text);
			});
		});
	}

	replacer(originalText, cb);
}


function compile(file, cb: (err, text?: string) => void) {
	if (!isTypescript(file)) {
		return cb(new Error("Not a typescript file"));
	}

	var fileName = path.basename(file, ".ts");
	var dir = path.dirname(file);

	var jsPath: string;
	if (jsPath = myPathMap[path.normalize(file)]) {
		console.log(file + " already compiled.");
		fs.readFile(jsPath, { encoding: "utf8" }, cb);
	} else {
		console.log("Compiling " + file);
		childproc.exec("tsc --sourcemap -m commonjs " + file, { encoding: "utf8" }, function (error, stdout, stderr) {
			if ((stdout && stdout.length > 0) || (stderr && stderr.length > 0)) {
				var tce = new TypescriptCompileError();
				tce.stdout = stdout.toString();
				tce.stderr = stderr.toString();
				return cb(tce);
			} else {
				fs.readFile(path.join(dir, fileName + ".js"), { encoding: "utf8" }, cb);
			}
		});
	}
}

function isTypescript(file) {
	return /\.ts$/.test(file);
}

function typeify(file) {
	return through(() => { }, end);

	function end() {
		var onCompile = (err, data?: string) => {
			if (err) return this.emit('error', err);

			embed(jsFile, (err, text?: string) => {
				if (err) return this.emit('error', err);

				var converter = convert.fromSource(text);
				var sourceContents: string[] = converter.getProperty("sourcesContent");
				console.log(sourceContents[0]);

				convertRequirePaths(file, text, (err, text?) => {
					if (err) return this.emit('error', err);

					this.queue(text);
					this.queue(null);
				});
			});
		}

		var jsFile: string, dir: string = path.dirname(file);
		if (isTypescript(file)) {
			jsFile = path.join(dir, path.basename(file, ".ts") + ".js");
			compile(file, onCompile);
		} else {
			jsFile = file;
			fs.readFile(file, { encoding: "utf8" }, onCompile);
		}
	}
};

export = typeify;