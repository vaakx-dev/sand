import { extension } from '../paths'

const kinds: Record<string, string[]> = {
  'file-image': ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'ico', 'svg', 'tga', 'psd'],
  'file-music': ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'],
  'file-video': ['mp4', 'mov', 'webm', 'mkv', 'avi'],
  'file-archive': ['zip', 'tar', 'gz', 'tgz', '7z', 'rar', 'xz'],
  'file-text': ['md', 'mdx', 'txt', 'rst', 'log'],
  'file-braces': ['json', 'jsonc', 'json5'],
  'file-lock': ['lock', 'lockb'],
  'file-cog': ['toml', 'yaml', 'yml', 'ini', 'cfg', 'conf', 'env', 'xml', 'gitignore', 'gitattributes', 'editorconfig'],
  'file-code': [
    'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'rs', 'py', 'go', 'java', 'kt', 'c', 'h', 'cpp', 'hpp', 'cs', 'rb', 'php',
    'swift', 'lua', 'sh', 'bash', 'ps1', 'bat', 'html', 'css', 'scss', 'vue', 'svelte', 'sql', 'wgsl', 'glsl', 'hlsl',
  ],
}

const iconByExtension = new Map(Object.entries(kinds).flatMap(([icon, extensions]) => extensions.map(ext => [ext, icon])))

export const fileIcon = (path: string) => iconByExtension.get(extension(path)) ?? 'file'
