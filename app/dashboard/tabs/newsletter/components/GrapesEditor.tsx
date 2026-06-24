'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import type { Editor } from 'grapesjs'

export type GrapesEditorHandle = {
  getHtml: () => string
  getCss: () => string
  getProjectData: () => Record<string, unknown>
  loadProjectData: (data: Record<string, unknown>) => void
  setComponents: (html: string) => void
}

type Props = {
  onEditorReady?: (editor: Editor) => void
  onChange?: () => void
}

export const GrapesEditor = forwardRef<GrapesEditorHandle, Props>(function GrapesEditor(
  { onEditorReady, onChange },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const [loading, setLoading] = useState(true)
  // Refs so event handlers always call the latest prop without re-creating the editor
  const onChangeRef = useRef(onChange)
  const onEditorReadyRef = useRef(onEditorReady)
  onChangeRef.current = onChange
  onEditorReadyRef.current = onEditorReady

  useImperativeHandle(ref, () => ({
    getHtml: () => editorRef.current?.getHtml() ?? '',
    getCss: () => editorRef.current?.getCss() ?? '',
    getProjectData: () => editorRef.current?.getProjectData() ?? {},
    loadProjectData: (data) => editorRef.current?.loadProjectData(data),
    setComponents: (html) => editorRef.current?.setComponents(html),
  }))

  useEffect(() => {
    if (!containerRef.current || editorRef.current) return

    let editor!: Editor
    let unmounted = false

    const init = async () => {
      const [gjsMod, presetMod] = await Promise.all([
        import('grapesjs'),
        import('grapesjs-preset-newsletter'),
      ])

      // grapesjs is a CJS module; handle both ESM default and CommonJS shapes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const grapesjs = (gjsMod as any).default ?? gjsMod
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const preset: ((ed: Editor, opts?: Record<string, unknown>) => void) =
        typeof (presetMod as any).default === 'function'
          ? (presetMod as any).default
          : (presetMod as any)

      editor = grapesjs.init({
        container: containerRef.current!,
        height: '100%',
        fromElement: false,
        storageManager: false,
        avoidInlineStyle: false,
        plugins: [
          (ed: Editor) =>
            preset(ed, {
              modalTitleImport: 'Import HTML',
              modalTitleExport: 'Export HTML',
            }),
        ],
        assetManager: {
          uploadName: 'image',
          multiUpload: false,
          autoAdd: true,
          assets: [],
        },
        canvas: { styles: [], scripts: [] },
      })

      // Extra TBC blocks
      editor.BlockManager.add('tbc-button', {
        label: 'CTA Button',
        category: 'Basic',
        attributes: { class: 'fa fa-hand-pointer-o' },
        content: `<table cellpadding="0" cellspacing="0" border="0" style="margin:16px auto;"><tr><td style="background-color:#7c6af7;border-radius:8px;"><a href="https://www.tum-blockchain.com" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;font-family:-apple-system,sans-serif;">Apply now →</a></td></tr></table>`,
      })
      editor.BlockManager.add('tbc-divider', {
        label: 'Divider',
        category: 'Basic',
        attributes: { class: 'fa fa-minus' },
        content: `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:12px 0;"><div style="border-top:1px solid #2a2a3e;height:1px;line-height:1px;font-size:1px;">&nbsp;</div></td></tr></table>`,
      })
      editor.BlockManager.add('tbc-spacer', {
        label: 'Spacer',
        category: 'Basic',
        attributes: { class: 'fa fa-arrows-v' },
        content: `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height:32px;line-height:32px;font-size:1px;">&nbsp;</td></tr></table>`,
      })

      if (unmounted) { editor.destroy(); return }

      editorRef.current = editor

      const handleChange = () => onChangeRef.current?.()
      editor.on('component:update', handleChange)
      editor.on('component:add', handleChange)
      editor.on('component:remove', handleChange)
      editor.on('style:change', handleChange)

      onEditorReadyRef.current?.(editor)
      setLoading(false)
    }

    init().catch(console.error)

    return () => {
      unmounted = true
      editor?.destroy()
      editorRef.current = null
    }
  }, [])

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d14] z-10">
          <div className="text-[#8080a0] text-sm animate-pulse">Loading editor…</div>
        </div>
      )}
      <div
        ref={containerRef}
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  )
})
