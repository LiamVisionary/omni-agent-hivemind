const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|svg|webp|avif|gif)$/i;
const FILE_EXTENSIONS = /\.(png|jpg|jpeg|svg|webp|avif|gif|pdf|pptx)$/i;

/** Extract a file path from OpenClaw agent result text */
export function extractFilePath(text: string): string | null {
  // 1. Full absolute path in backticks (e.g. `/path/to/infographic.png`)
  const fullPathMatch = text.match(/`(\/[^`]+\.(png|jpg|jpeg|svg|webp|avif|gif|pdf|pptx))`/i);
  if (fullPathMatch) return fullPathMatch[1];

  // 2. Bare full absolute path
  const bareMatch = text.match(/(\/[\w./ -]+\.(png|jpg|jpeg|svg|webp|avif|gif|pdf|pptx))/i);
  if (bareMatch) return bareMatch[1];

  // 3. Directory path + separate image filename (common agent output pattern)
  //    e.g. "`/path/to/dir/`" ... "`infographic.png`"
  const dirMatch = text.match(/`(\/[^`]+\/)`/);
  if (dirMatch) {
    const dir = dirMatch[1];
    const filenameMatch = text.match(/`([\w.-]+\.(png|jpg|jpeg|svg|webp|avif|gif|pdf|pptx))`/i);
    if (filenameMatch) return dir + filenameMatch[1];
  }

  return null;
}

/** Build a URL to serve a workspace file via the local API proxy */
export function workspaceFileUrl(filePath: string): string {
  return `/api/openclaw/workspace-file?path=${encodeURIComponent(filePath)}`;
}

/** Check if a path is a previewable image format */
export function isImagePath(filePath: string): boolean {
  return IMAGE_EXTENSIONS.test(filePath);
}

/** Check if a path lives inside the OpenClaw workspace */
export function isOpenClawWorkspacePath(filePath: string): boolean {
  return filePath.includes('/.openclaw/');
}

/** Check if a path looks like a supported file output */
export function isFileOutput(filePath: string): boolean {
  return FILE_EXTENSIONS.test(filePath);
}

/** Get the parent directory of a file path */
export function parentDirectory(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/');
  return lastSlash > 0 ? filePath.slice(0, lastSlash) : filePath;
}
