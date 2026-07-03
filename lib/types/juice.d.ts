declare module 'juice' {
  interface JuiceOptions {
    removeStyleTags?: boolean
    preserveImportant?: boolean
    applyAttributesTableElements?: boolean
    applyHeightAttributes?: boolean
    applyWidthAttributes?: boolean
    extraCss?: string
  }

  function juice(html: string, options?: JuiceOptions): string
  export = juice
}
