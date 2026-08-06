/**
 * Cheerio 1.x → undici expects global File (Node 20+).
 * Netlify may still boot on older runtimes; stub before cheerio loads.
 */
if (typeof (globalThis as { File?: unknown }).File === 'undefined') {
  class FilePolyfill extends Blob {
    readonly name: string
    readonly lastModified: number
    constructor(
      bits: BlobPart[],
      name: string,
      options: FilePropertyBag = {}
    ) {
      super(bits, options)
      this.name = String(name)
      this.lastModified = options.lastModified ?? Date.now()
    }
  }
  ;(globalThis as { File: typeof File }).File = FilePolyfill as unknown as typeof File
}
