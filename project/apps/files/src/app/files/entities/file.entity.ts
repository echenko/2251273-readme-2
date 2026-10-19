export type FileKind = 'avatar' | 'photo';

export interface FileEntity {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  kind: FileKind;
  ownerId: string;
  createdAt: Date;
  content: Buffer;
}
