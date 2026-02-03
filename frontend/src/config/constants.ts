export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp']
export const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

export const STAGES = [
  { id: 'upload', label: 'Upload', order: 1 },
  { id: 'forgery_detection', label: 'Forgery Detection', order: 2 },
] as const

export const STATUS_COLORS = {
  VALID: 'bg-emerald-500',
  SUSPICIOUS: 'bg-amber-500',
  INVALID: 'bg-red-500',
  MANUAL_REVIEW: 'bg-blue-500',
} as const
