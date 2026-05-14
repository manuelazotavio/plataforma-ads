export function getFileExtension(file: File) {
  const fromName = file.name.split('.').pop()?.trim()
  if (fromName) return fromName.toLowerCase()

  const fromType = file.type.split('/').pop()?.trim()
  return fromType ? fromType.toLowerCase() : 'bin'
}

export function fileKind(file: File): 'image' | 'video' | 'file' {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return 'file'
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

