export interface StoredFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  ownerId: string;
  createdAt: Date;
}
