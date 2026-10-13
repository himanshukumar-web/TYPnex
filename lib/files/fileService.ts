import { v4 as uuidv4 } from "uuid";
import { storageService } from "@/lib/storage/storageService";
import { defaultMalwareScanner, calculateChecksum } from "./malwareScanner";

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export const FORBIDDEN_VIDEO_EXTENSIONS = [
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm",
  "3gp",
  "flv",
  "wmv",
  "m4v",
  "mpeg",
  "mpg",
];

export const FORBIDDEN_VIDEO_MIMES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/webm",
  "video/3gpp",
  "video/x-flv",
  "video/x-ms-wmv",
  "video/mpeg",
];

export const FORBIDDEN_EXECUTABLE_EXTENSIONS = [
  "exe",
  "bat",
  "cmd",
  "ps1",
  "sh",
  "dll",
  "scr",
  "apk",
  "com",
  "msi",
  "jar",
  "vbs",
  "pif",
  "hta",
  "cpl",
  "iso",
];

export const FORBIDDEN_EXECUTABLE_MIMES = [
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-sh",
  "application/x-executable",
  "application/vnd.microsoft.portable-executable",
];

export const ALLOWED_EXTENSIONS = [
  // Images
  "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico",
  // Documents
  "pdf", "doc", "docx", "txt", "rtf", "odt",
  // Spreadsheets
  "csv", "xlsx", "xls", "ods",
  // Presentations
  "ppt", "pptx", "odp",
  // Archives
  "zip", "rar", "7z", "tar", "gz",
  // Audio
  "mp3", "wav", "ogg", "m4a", "aac", "flac", "webm",
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a file against video restrictions, dangerous executables, and 20 MB size limits
 */
export function validateFile(filename: string, mimeType: string, sizeBytes: number): ValidationResult {
  // Check 1: File size
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: "Maximum file size is 20 MB.",
    };
  }

  const ext = (filename.split(".").pop() || "").toLowerCase();
  const lowerMime = (mimeType || "").toLowerCase();

  // Check 2: Video rejection (MIME and extension)
  const isVideoMime = lowerMime.startsWith("video/") || FORBIDDEN_VIDEO_MIMES.includes(lowerMime);
  const isVideoExt = FORBIDDEN_VIDEO_EXTENSIONS.includes(ext);

  if (isVideoMime || isVideoExt) {
    return {
      valid: false,
      error: "Video files are not supported.",
    };
  }

  // Check 3: Executable and dangerous format rejection
  const isExecutableExt = FORBIDDEN_EXECUTABLE_EXTENSIONS.includes(ext);
  const isExecutableMime = FORBIDDEN_EXECUTABLE_MIMES.includes(lowerMime);

  if (isExecutableExt || isExecutableMime) {
    return {
      valid: false,
      error: `Executable or script files (.${ext}) are strictly prohibited.`,
    };
  }

  // Check 4: Allowed formats
  if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `File type .${ext} is not supported. Allowed: images, documents, audio, and archives.`,
    };
  }

  return { valid: true };
}

export interface SavedFileResult {
  id: string;
  fileKey: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  url: string;
  isAudio: boolean;
  protectedFromOwner: boolean;
}

/**
 * Validates malware signatures and saves uploaded file to private object storage
 */
export async function saveUploadedFile(
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType: string,
  conversationId: string,
  userId: string,
  protectedFromOwner: boolean = false
): Promise<SavedFileResult> {
  // 1. Run malware & heuristic payload scanner
  const scanResult = await defaultMalwareScanner.scanBuffer(fileBuffer, originalFilename);
  if (!scanResult.safe) {
    throw new Error(`Security validation failed: ${scanResult.details || "Potentially malicious file detected."}`);
  }

  // 2. Compute cryptographic SHA-256 checksum
  const checksum = calculateChecksum(fileBuffer);

  // 3. Generate unique storage identifiers
  const ext = (originalFilename.split(".").pop() || "").toLowerCase();
  const fileId = uuidv4();
  const fileKey = `${fileId}${ext ? `.${ext}` : ""}`;
  const storageKey = `conversations/${conversationId}/${fileKey}`;

  // 4. Save to private object storage (Supabase bucket typnex-files or private directory)
  await storageService.upload({
    storageKey,
    buffer: fileBuffer,
    mimeType,
    originalName: originalFilename,
  });

  const isAudio =
    mimeType.startsWith("audio/") ||
    ["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(ext);

  // Protected download endpoint URL (never exposes raw private storage URL directly)
  const downloadUrl = `/api/files/download/${fileKey}`;

  return {
    id: fileId,
    fileKey,
    storageKey,
    filename: originalFilename,
    mimeType,
    sizeBytes: fileBuffer.length,
    checksum,
    url: downloadUrl,
    isAudio,
    protectedFromOwner,
  };
}
