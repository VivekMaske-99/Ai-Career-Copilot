import React from 'react'
import { UploadCloud, FileText, CheckCircle2 } from 'lucide-react'

export default function UploadBox({
  onFileSelect,
  isLoading = false,
  title = 'Upload file',
  hint = 'PDF/DOCX/TXT',
  accept = '.pdf,.doc,.docx,.txt',
}) {
  const [drag, setDrag] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState(null)

  const inputRef = React.useRef(null)

  const onDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDrag(true)
    }

    if (e.type === 'dragleave') {
      setDrag(false)
    }
  }

  const handleFile = (file) => {
    setSelectedFile(file)
    // Log selected file for debugging
    console.log('UploadBox selected file:', file)

    // Only forward a real File object to parent when possible
    if (typeof File !== 'undefined' && file instanceof File) {
      onFileSelect(file)
    } else if (file && typeof file === 'object' && (file.name || file.size)) {
      // Accept file-like objects (some drop implementations provide FileList-like objects)
      onFileSelect(file)
    } else {
      console.warn('UploadBox: ignored non-File object', file)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()

    setDrag(false)

    const file = e.dataTransfer.files?.[0]

    if (file) handleFile(file)
  }

  const onChange = (e) => {
    const file = e.target.files?.[0]

    if (file) handleFile(file)
  }

  return (
    <div
      onDragEnter={onDrag}
      onDragOver={onDrag}
      onDragLeave={onDrag}
      onDrop={onDrop}
      onClick={() => !isLoading && inputRef.current?.click()}
      className={`
        w-full rounded-3xl border-2 border-dashed p-6 cursor-pointer
        transition-all duration-300 bg-white
        ${drag
          ? 'border-green-400 bg-green-50 shadow-[0_0_30px_rgba(34,197,94,0.12)]'
          : 'border-gray-200 hover:border-green-300 hover:shadow-lg'}
      `}
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center text-white shadow-lg">
          <UploadCloud className="w-7 h-7" />
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {title}
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            {hint} • Drag & drop or click to upload
          </p>

          {/* Uploaded File Preview */}
          {selectedFile && (
            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />

              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-green-700 truncate">
                  {selectedFile.name}
                </p>

                <p className="text-xs text-green-500 mt-1">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB Uploaded Successfully
                </p>
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center gap-2 text-sm text-gray-500">
            <FileText className="w-4 h-4" />
            ATS score, match score, skills and AI suggestions are generated automatically.
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onChange}
        disabled={isLoading}
      />
    </div>
  )
}