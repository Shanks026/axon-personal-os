import { File, FileArchive, FileCode, FileImage, FileSpreadsheet, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fileKind } from '@/features/attachments/utils'

const ICONS = {
  image: FileImage,
  pdf: FileText,
  sheet: FileSpreadsheet,
  doc: FileText,
  archive: FileArchive,
  code: FileCode,
  other: File,
}

/** The lucide icon for a file's kind (from its MIME type and name). */
export function AttachmentIcon({ mime, name, className }) {
  const Icon = ICONS[fileKind(mime, name)]
  return <Icon className={cn('size-4 text-muted-foreground', className)} aria-hidden />
}
