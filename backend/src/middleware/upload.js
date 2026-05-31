import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsBase = path.join(__dirname, '../../uploads');

function diskStorage(subdir) {
  return multer.diskStorage({
    destination: path.join(uploadsBase, subdir),
    filename: (req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase();
      const name = crypto.randomBytes(16).toString('hex');
      cb(null, `${Date.now()}-${name}${ext}`);
    },
  });
}

function imageFilter(req, file, cb) {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpg, jpeg, png, webp, gif)'));
  }
}

const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760');

export const uploadPhoto = multer({
  storage:  multer.memoryStorage(),
  fileFilter: imageFilter,
  limits:   { fileSize: maxSize },
}).single('image');

export const uploadCover = multer({
  storage:  diskStorage('covers'),
  fileFilter: imageFilter,
  limits:   { fileSize: maxSize },
}).single('cover');

export function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError || err?.message?.includes('image')) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
}
