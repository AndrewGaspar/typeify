/// <reference path="node.d.ts" />
declare function embed(compiledFile: string, cb: (err: any, text?: string) => void): void;
declare module embed {
    class NoSourceMapError implements Error {
        public file: string;
        public name: string;
        public message: string;
        constructor(file: string);
    }
    function fromFile(filePath: string, cb: (err: any, text?: string) => void): void;
    function overwriteFile(filePath: string, cb: (err: any) => void): void;
    var sourceMapUrlRegex: RegExp;
}
export = embed;
