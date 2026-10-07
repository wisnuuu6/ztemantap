const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

export function validateUpload(file) {
  if (!file) {
    throw new Error('File tidak ditemukan.');
  }

  if (!ALLOWED_TYPES.has(file.mimetype)) {
    throw new Error('Tipe file tidak diizinkan. Gunakan JPG, PNG, atau WEBP.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Ukuran file terlalu besar. Maksimal 2 MB.');
  }
}
