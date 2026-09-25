/**
 * Type declarations for the `pdf-parse` deep import used in
 * `src/app/api/profile/resume/route.ts`.
 *
 * `@types/pdf-parse` only declares the bare `pdf-parse` specifier. We import
 * `pdf-parse/lib/pdf-parse.js` directly on purpose: the package's `index.js`
 * runs a debug branch that reads a test PDF from disk when `module.parent` is
 * falsy, which throws in a bundled serverless environment. The deep path is the
 * library implementation itself and carries no declaration, so we supply one.
 */
declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PDFParseInfo {
    PDFFormatVersion?: string;
    IsAcroFormPresent?: boolean;
    IsXFAPresent?: boolean;
    Title?: string;
    Author?: string;
    Subject?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
    [key: string]: unknown;
  }

  interface PDFParseResult {
    /** Total number of pages in the document. */
    numpages: number;
    /** Number of pages actually rendered (bounded by `options.max`). */
    numrender: number;
    /** Document information dictionary. */
    info: PDFParseInfo;
    /** XMP metadata, `null` when the document has none. */
    metadata: unknown;
    /** Concatenated text content of every rendered page. */
    text: string;
    /** pdf.js version used to perform the parse. */
    version: string;
  }

  interface PDFParseOptions {
    /** Custom per-page render callback. */
    pagerender?: (pageData: unknown) => string | Promise<string>;
    /** Maximum number of pages to parse. `0` (default) means all pages. */
    max?: number;
    /** pdf.js build version to load. */
    version?: string;
  }

  function pdfParse(
    dataBuffer: Buffer | Uint8Array,
    options?: PDFParseOptions
  ): Promise<PDFParseResult>;

  export = pdfParse;
}
