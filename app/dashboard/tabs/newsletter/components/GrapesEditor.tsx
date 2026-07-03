'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import type { Editor } from 'grapesjs'
import { Spinner } from '@/components/ui/spinner'

export type GrapesEditorHandle = {
  getHtml: () => string
  getCss: () => string
  getProjectData: () => Record<string, unknown>
  insertImage: (src: string, alt?: string) => void
  loadProjectData: (data: Record<string, unknown>) => void
  setComponents: (html: string) => void
}

type Props = {
  onEditorReady?: (editor: Editor) => void
  onChange?: () => void
}

const escapeAttribute = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

export const GrapesEditor = forwardRef<GrapesEditorHandle, Props>(function GrapesEditor(
  { onEditorReady, onChange },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const [loading, setLoading] = useState(true)
  const onChangeRef = useRef<Props['onChange']>(undefined)
  const onEditorReadyRef = useRef<Props['onEditorReady']>(undefined)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    onEditorReadyRef.current = onEditorReady
  }, [onEditorReady])

  useImperativeHandle(ref, () => ({
    getHtml: () => editorRef.current?.getHtml() ?? '',
    getCss: () => editorRef.current?.getCss() ?? '',
    getProjectData: () => editorRef.current?.getProjectData() ?? {},
    insertImage: (src, alt = 'Newsletter image') => {
      const editor = editorRef.current
      if (!editor) return

      editor.AssetManager.add({ src, name: alt })

      const selected = editor.getSelected()
      if (selected?.get('type') === 'image') {
        selected.addAttributes({ src, alt })
        return
      }

      editor.addComponents(
        `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" style="display:block;max-width:100%;height:auto;margin:0 auto;" />`
      )
    },
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

      type GrapesModule = { init(options: import('grapesjs').InitOptions): Editor }
      type NewsletterPreset = (ed: Editor, opts?: Record<string, unknown>) => void
      type PresetModule = { default?: NewsletterPreset } | NewsletterPreset

      const grapesjs = (
        'default' in gjsMod ? gjsMod.default : gjsMod
      ) as GrapesModule
      const presetModule = presetMod as PresetModule
      const preset = typeof presetModule === 'function' ? presetModule : presetModule.default

      if (!preset) {
        throw new Error('Could not load GrapesJS newsletter preset.')
      }

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
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
          <Spinner />
        </div>
      )}
      <div
        ref={containerRef}
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  )
})
