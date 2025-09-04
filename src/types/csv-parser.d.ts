declare module 'csv-parser' {
  import { Transform } from 'stream';
  
  interface Options {
    separator?: string;
    quote?: string;
    escape?: string;
    headers?: string[] | boolean;
    strict?: boolean;
    skipEmptyLines?: boolean;
    maxRowBytes?: number;
    skipLinesWithError?: boolean;
  }
  
  function csv(options?: Options): Transform;
  export = csv;
}