'use client'

import { useRef, useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Asset } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  assets: Asset[]
  uploadingAsset: boolean
  onUpload: (file: File) => Promise<Asset | null>
  onSelect: (asset: Asset) => void
}

export function AssetPickerModal({ open, onClose, assets, uploadingAsset, onUpload, onSelect }: Props) {
  const [selected, setSelected] = useState<Asset | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setSelected(null)
  }, [open])


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const asset = await onUpload(file)
    if (asset) setSelected(asset)
    e.target.value = ''
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#15151f] border-[#2a2a3e] text-[#e2e2ee] max-w-lg flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-[#e2e2ee]">🖼️ Images</DialogTitle>
        </DialogHeader>

        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-[#2a2a3e] rounded p-3.5 text-center cursor-pointer text-[#4a4a60] text-[11px] mb-2 hover:border-[#7c6af7] hover:text-[#8080a0] transition-colors"
        >
          {uploadingAsset ? 'Uploading…' : 'Click to upload image (max 5MB)'}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="overflow-y-auto flex-1 min-h-0">
          {assets.length === 0 ? (
            <p className="text-center text-[12px] text-[#8080a0] py-5">No images yet. Upload one above.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
              {assets.map((a) => (
                <div
                  key={a.name}
                  onClick={() => setSelected(a)}
                  className={`relative border-2 rounded overflow-hidden cursor-pointer transition-all ${
                    selected?.name === a.name ? 'border-[#7c6af7] bg-[#232333]' : 'border-[#2a2a3e] bg-[#1c1c28] hover:border-[#7c6af7]'
                  }`}
                >
                  <div className="h-16 flex items-center justify-center bg-white p-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.src} alt={a.name} className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="text-[9px] text-[#8080a0] px-1.5 py-1 text-center truncate">{a.name}</div>
                  {selected?.name === a.name && (
                    <div className="absolute top-1 right-1 bg-[#7c6af7] text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]">
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="border-[#2a2a3e] text-[#e2e2ee]">
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!selected}
            onClick={() => { if (selected) { onSelect(selected); onClose() } }}
            className="bg-[#7c6af7] text-white hover:bg-[#6a58e5] disabled:opacity-40"
          >
            ✓ Use Image
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
