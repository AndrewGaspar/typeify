import through = require("through");
import fs = require("fs");
import childproc = require("child_process");
import path = require("path");

class TypescriptCompileError implements Error {
	name = "Compile Error";
	message = "Could not compile TypeScript file";
	stdout: string;
	stderr: string;
}

// Turns out the following code is not necessary - it seemingly works, but tsc will automatically compile dependencies
/*
var postCompileRequireRegex = /(var \w* = require\(")([\.\\\/]*\w+)("\))/;

function replaceFirstRequire(originalText: string, callback: (err, data: {
	newText: string;
	matchIndex: number;
}) => void) {
	var matchObj = postCompileRequireRegex.exec(originalText);
	if (!matchObj) return callback(null, { newText: originalText, matchIndex: originalText.length });
	else {
		var match = matchObj[0];
		var prefix = matchObj[1];
		var requirePath = matchObj[2];
		var postFix = matchObj[3];
		var index: number = matchObj.index

		var tsPath = requirePath + ".ts";
		fs.exists(tsPath, function (exists) {
			var output = originalText;
			if (exists) {
				output = originalText.replace(match, prefix + tsPath + postFix);
			}
			callback(null, { newText: output, matchIndex: index });
		});
	}
}

function convertRequirePaths(fileName: string, originalText: string, cb: (err, newText?: string) => void) {
	function replacer(text: string, cb: (err, text?: string) => void) {
		replaceFirstRequire(text, (err, data) => {
			if (err) return cb(err);

			if (data.matchIndex == text.length) {
				return cb(null, data.newText);
			}

			var pre = data.newText.substring(0, data.matchIndex + 1);
			var sub = data.newText.substr(data.matchIndex + 1);

			console.log("Replacing:\n");
			console.log(sub);
			replacer(sub, (err, text?: string) => {
				if (err) return cb(err);

				console.log("Replaced with:")
				console.log(text);

				cb(null, pre + text);
			});
		});
	}

	replacer(originalText, cb);
}
*/

function compile(file, data, cb: (err, text?: string) => void) {
	if (!isTypescript(file)) return cb(new Error("Not a typescript file"));

	var fileName = path.basename(file, ".ts");
	var dir = path.dirname(file);

	childproc.exec("tsc -m commonjs " + file, { encoding: "utf8" }, function (error, stdout, stderr) {
		if ((stdout && stdout.length > 0) || (stderr && stderr.length > 0)) {
			var tce = new TypescriptCompileError();
			tce.stdout = stdout.toString();
			tce.stderr = stderr.toString();
			return cb(tce);
		} else {
			fs.readFile(path.join(dir, fileName + ".js"), { encoding: "utf8" }, function (err, originalText: string) {
				cb(err, originalText);
				//convertRequirePaths(file, originalText, cb);
			});
		}
	});
}

function isTypescript(file) {
	return /\.ts$/.test(file);
}

function typeify(file) {
	if (!isTypescript(file)) return through();

	var data = '';
	return through(write, end);

	function write(buf) { data += buf }
	function end() {
		compile(file, data, (err, data?: string) => {
			if (err) this.emit('error', err);

			this.queue(data);
			this.queue(null);
		});
	}
};

export = typeify;