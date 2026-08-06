// ── DocumentIcon — type-aware icon for the documents list ───────────
import {
  FileText, FileSpreadsheet, FileImage, FileVideo, FileAudio, FileArchive,
  FileCode, FileType, File, Link2, Figma, HardDrive, PlayCircle, BookOpen,
} from 'lucide-react';
import { visualType, type ClientDocument } from '@/data/documentsApi';

const MAP: Record<string, { Icon: any; tint: string }> = {
  pdf: { Icon: FileType, tint: '#DC2626' },
  word: { Icon: FileText, tint: '#2563EB' },
  spreadsheet: { Icon: FileSpreadsheet, tint: '#059669' },
  presentation: { Icon: FileText, tint: '#EA580C' },
  image: { Icon: FileImage, tint: '#7C3AED' },
  video: { Icon: FileVideo, tint: '#DB2777' },
  audio: { Icon: FileAudio, tint: '#0891B2' },
  archive: { Icon: FileArchive, tint: '#B45309' },
  code: { Icon: FileCode, tint: '#4B5563' },
  text: { Icon: FileText, tint: '#4B5563' },
  figma: { Icon: Figma, tint: '#A259FF' },
  drive: { Icon: HardDrive, tint: '#0F9D58' },
  loom: { Icon: PlayCircle, tint: '#625DF5' },
  notion: { Icon: BookOpen, tint: '#111827' },
  link: { Icon: Link2, tint: '#3B66F0' },
  file: { Icon: File, tint: '#6B7280' },
};

export default function DocumentIcon({
  doc,
  size = 34,
}: {
  doc: Pick<ClientDocument, 'kind' | 'mimeType' | 'fileName' | 'provider'>;
  size?: number;
}) {
  const v = visualType(doc);
  const { Icon, tint } = MAP[v] || MAP.file;
  return (
    <span
      className="inline-flex items-center justify-center rounded flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: `color-mix(in srgb, ${tint} 12%, transparent)`,
        color: tint,
      }}
      aria-hidden
    >
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={1.75} />
    </span>
  );
}
