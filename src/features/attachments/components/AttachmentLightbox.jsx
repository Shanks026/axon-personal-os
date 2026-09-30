import { Loader2 } from 'lucide-react'
import Lightbox from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import Download from 'yet-another-react-lightbox/plugins/download'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import 'yet-another-react-lightbox/plugins/counter.css'
import { toast } from 'sonner'
import { formatDateShort } from '@/lib/dates'
import { openLink } from '@/lib/download'
import { getDownloadUrl, useSignedUrls } from '@/features/attachments/api'
import { LIGHTBOX_CLASS } from '@/features/attachments/constants'
import { formatBytes, isPdfAttachment } from '@/features/attachments/utils'

/**
 * A task's images and PDFs in a full-screen preview (yet-another-react-lightbox, the user's
 * request, 2026-09-30): zoom, arrow keys and swipe between files, a counter, the name and
 * "4.2 MB · 30 Sep" as the caption, and Download (the file under its own name). PDFs show in the
 * browser's own viewer inside the slide. `index` < 0 means closed.
 * @param {{ files: object[], index: number, onIndexChange: (i: number) => void, onClose: () => void }} props
 */
export function AttachmentLightbox({ files, index, onIndexChange, onClose }) {
  const urls = useSignedUrls(files.map((f) => f.path))
  const slides = files.map((f) => ({
    src: urls.get(f.path) ?? '',
    alt: f.name,
    width: f.width ?? undefined,
    height: f.height ?? undefined,
    title: f.name,
    description: `${formatBytes(f.size)} · ${formatDateShort(f.created_at)}`,
    attachment: f,
  }))

  return (
    <Lightbox
      open={index >= 0}
      index={Math.max(index, 0)}
      close={onClose}
      slides={slides}
      plugins={[Captions, Counter, Download, Zoom]}
      className={LIGHTBOX_CLASS}
      // Over the task dialog, Radix sets pointer-events: none on the body; the lightbox opts back in.
      styles={{ root: { pointerEvents: 'auto' } }}
      carousel={{ finite: files.length <= 1 }}
      controller={{ closeOnBackdropClick: true }}
      captions={{ descriptionTextAlign: 'center' }}
      zoom={{ maxZoomPixelRatio: 4 }}
      on={{ view: ({ index: i }) => onIndexChange?.(i) }}
      download={{
        download: ({ slide }) =>
          getDownloadUrl(slide.attachment).then(
            (url) => openLink(url),
            (err) => toast.error(err.message ?? 'Couldn’t download the file'),
          ),
      }}
      render={{
        slide: ({ slide }) => {
          if (!slide.src) {
            return <Loader2 className="size-6 animate-spin text-white/70" aria-label="Loading" />
          }
          if (isPdfAttachment(slide.attachment)) {
            return (
              <iframe
                src={slide.src}
                title={slide.title}
                className="h-full w-full max-w-5xl rounded-md bg-white"
              />
            )
          }
          return undefined // the library's own image slide
        },
      }}
    />
  )
}
