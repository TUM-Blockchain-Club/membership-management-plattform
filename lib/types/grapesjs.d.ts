declare module 'grapesjs' {
  export interface Component {
    addAttributes(attributes: Record<string, string>): void
    get(key: string): unknown
  }

  export interface Editor {
    addComponents(html: string): void
    getHtml(): string
    getCss(): string
    getProjectData(): Record<string, unknown>
    getSelected(): Component | null
    loadProjectData(data: Record<string, unknown>): void
    setComponents(html: string): void
    destroy(): void
    on(event: string, cb: () => void): void
    AssetManager: {
      add(assets: { src: string; name: string } | Array<{ src: string; name: string }>): void
    }
    BlockManager: {
      add(id: string, opts: {
        label: string
        category: string
        attributes?: Record<string, string>
        content: string
      }): void
    }
  }

  export interface InitOptions {
    container: string | HTMLElement
    height?: string
    fromElement?: boolean
    storageManager?: boolean | Record<string, unknown>
    avoidInlineStyle?: boolean
    plugins?: Array<(editor: Editor) => void>
    assetManager?: {
      uploadName?: string
      multiUpload?: boolean
      autoAdd?: boolean
      assets?: unknown[]
      uploadFile?: (e: DragEvent | Event) => void | Promise<void>
    }
    canvas?: {
      styles?: string[]
      scripts?: string[]
    }
  }

  export function init(options: InitOptions): Editor
}

declare module 'grapesjs-preset-newsletter' {
  import type { Editor } from 'grapesjs'
  function presetNewsletter(
    editor: Editor,
    options?: { modalTitleImport?: string; modalTitleExport?: string }
  ): void
  export default presetNewsletter
}
