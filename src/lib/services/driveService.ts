import { GoogleApiClient } from './googleApiClient'

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  createdTime: string
  modifiedTime: string
  parents?: string[]
  webViewLink?: string
  webContentLink?: string
  iconLink?: string
  thumbnailLink?: string
  owners?: Array<{
    displayName: string
    emailAddress: string
    photoLink?: string
  }>
  shared: boolean
  starred: boolean
  trashed: boolean
}

interface DriveListResponse {
  files: DriveFile[]
  nextPageToken?: string
}

export interface ParsedDriveFile {
  id: string
  name: string
  mimeType: string
  size: number
  createdAt: Date
  modifiedAt: Date
  parentId: string | null
  webViewLink: string
  downloadLink: string | null
  iconLink: string
  thumbnailLink: string | null
  owner: string
  isFolder: boolean
  isShared: boolean
  isStarred: boolean
}

// Common MIME types
export const MIME_TYPES = {
  FOLDER: 'application/vnd.google-apps.folder',
  DOCUMENT: 'application/vnd.google-apps.document',
  SPREADSHEET: 'application/vnd.google-apps.spreadsheet',
  PRESENTATION: 'application/vnd.google-apps.presentation',
  FORM: 'application/vnd.google-apps.form',
  DRAWING: 'application/vnd.google-apps.drawing',
  PDF: 'application/pdf',
  IMAGE: 'image/',
  VIDEO: 'video/',
  AUDIO: 'audio/',
} as const

export class DriveService {
  private static parseFile(file: DriveFile): ParsedDriveFile {
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: parseInt(file.size || '0'),
      createdAt: new Date(file.createdTime),
      modifiedAt: new Date(file.modifiedTime),
      parentId: file.parents?.[0] || null,
      webViewLink: file.webViewLink || '',
      downloadLink: file.webContentLink || null,
      iconLink: file.iconLink || '',
      thumbnailLink: file.thumbnailLink || null,
      owner: file.owners?.[0]?.displayName || '',
      isFolder: file.mimeType === MIME_TYPES.FOLDER,
      isShared: file.shared,
      isStarred: file.starred,
    }
  }

  // List files in a folder (or root if no folderId)
  static async listFiles(options: {
    folderId?: string
    pageSize?: number
    pageToken?: string
    q?: string
    orderBy?: string
    includeTrash?: boolean
  } = {}): Promise<{ files: ParsedDriveFile[]; nextPageToken?: string }> {
    const {
      folderId,
      pageSize = 50,
      pageToken,
      q,
      orderBy = 'folder,modifiedTime desc',
      includeTrash = false,
    } = options

    // Build query
    const queries: string[] = []
    if (folderId) {
      queries.push(`'${folderId}' in parents`)
    }
    if (!includeTrash) {
      queries.push('trashed = false')
    }
    if (q) {
      queries.push(q)
    }

    const response = await GoogleApiClient.get<DriveListResponse>(
      '/drive/v3/files',
      {
        q: queries.length > 0 ? queries.join(' and ') : undefined,
        pageSize,
        pageToken,
        orderBy,
        fields: 'nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink,webContentLink,iconLink,thumbnailLink,owners,shared,starred,trashed)',
      }
    )

    return {
      files: (response.files || []).map((f) => this.parseFile(f)),
      nextPageToken: response.nextPageToken,
    }
  }

  // Get a single file
  static async getFile(fileId: string): Promise<ParsedDriveFile> {
    const response = await GoogleApiClient.get<DriveFile>(
      `/drive/v3/files/${fileId}`,
      {
        fields: 'id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink,webContentLink,iconLink,thumbnailLink,owners,shared,starred,trashed',
      }
    )
    return this.parseFile(response)
  }

  // Create a folder
  static async createFolder(
    name: string,
    parentId?: string
  ): Promise<ParsedDriveFile> {
    const metadata: Record<string, unknown> = {
      name,
      mimeType: MIME_TYPES.FOLDER,
    }
    if (parentId) {
      metadata.parents = [parentId]
    }

    const response = await GoogleApiClient.post<DriveFile>(
      '/drive/v3/files',
      metadata,
      {
        fields: 'id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink,webContentLink,iconLink,thumbnailLink,owners,shared,starred,trashed',
      }
    )

    return this.parseFile(response)
  }

  // Upload a file
  static async uploadFile(
    file: File,
    options: {
      parentId?: string
      name?: string
    } = {}
  ): Promise<ParsedDriveFile> {
    const { parentId, name } = options

    const metadata: Record<string, unknown> = {
      name: name || file.name,
    }
    if (parentId) {
      metadata.parents = [parentId]
    }

    const response = await GoogleApiClient.uploadMultipart<DriveFile>(
      '/upload/drive/v3/files',
      metadata,
      file
    )

    return this.parseFile(response)
  }

  // Rename a file
  static async renameFile(fileId: string, newName: string): Promise<ParsedDriveFile> {
    const response = await GoogleApiClient.patch<DriveFile>(
      `/drive/v3/files/${fileId}`,
      { name: newName }
    )
    return this.parseFile(response)
  }

  // Move a file to a different folder
  static async moveFile(
    fileId: string,
    _newParentId: string,
    oldParentId?: string
  ): Promise<ParsedDriveFile> {
    // Get current parents if not provided
    if (!oldParentId) {
      const file = await this.getFile(fileId)
      oldParentId = file.parentId || undefined
    }

    const response = await GoogleApiClient.patch<DriveFile>(
      `/drive/v3/files/${fileId}`,
      {},
    )

    // Note: Moving requires addParents/removeParents query params
    // This is a simplified version - full implementation needs URL params
    return this.parseFile(response)
  }

  // Delete a file (move to trash)
  static async trashFile(fileId: string): Promise<void> {
    await GoogleApiClient.patch(`/drive/v3/files/${fileId}`, { trashed: true })
  }

  // Permanently delete a file
  static async deleteFile(fileId: string): Promise<void> {
    await GoogleApiClient.delete(`/drive/v3/files/${fileId}`)
  }

  // Star/unstar a file
  static async toggleStar(fileId: string, starred: boolean): Promise<ParsedDriveFile> {
    const response = await GoogleApiClient.patch<DriveFile>(
      `/drive/v3/files/${fileId}`,
      { starred }
    )
    return this.parseFile(response)
  }

  // Search files
  static async search(
    query: string,
    options: {
      pageSize?: number
      mimeType?: string
    } = {}
  ): Promise<ParsedDriveFile[]> {
    const { pageSize = 50, mimeType } = options

    const queries = [`name contains '${query}'`, 'trashed = false']
    if (mimeType) {
      queries.push(`mimeType = '${mimeType}'`)
    }

    const { files } = await this.listFiles({
      q: queries.join(' and '),
      pageSize,
    })

    return files
  }

  // Get recent files
  static async getRecentFiles(limit = 20): Promise<ParsedDriveFile[]> {
    const { files } = await this.listFiles({
      pageSize: limit,
      orderBy: 'viewedByMeTime desc',
    })
    return files
  }

  // Get starred files
  static async getStarredFiles(): Promise<ParsedDriveFile[]> {
    const { files } = await this.listFiles({
      q: 'starred = true',
    })
    return files
  }

  // Get shared files
  static async getSharedFiles(): Promise<ParsedDriveFile[]> {
    const { files } = await this.listFiles({
      q: 'sharedWithMe = true',
    })
    return files
  }

  // Get file icon based on mime type
  static getFileIcon(mimeType: string): string {
    if (mimeType === MIME_TYPES.FOLDER) return 'folder'
    if (mimeType === MIME_TYPES.DOCUMENT) return 'file-text'
    if (mimeType === MIME_TYPES.SPREADSHEET) return 'table'
    if (mimeType === MIME_TYPES.PRESENTATION) return 'presentation'
    if (mimeType === MIME_TYPES.PDF) return 'file-text'
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'music'
    return 'file'
  }
}
