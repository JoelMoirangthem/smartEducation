const multer = require('multer');

// Use memory storage to process file buffer before uploading to Cloudinary
const storage = multer.memoryStorage();

const ALLOWED_MIMES = new Set([
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]);

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit — notes are docs, not archives
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIMES.has(file.mimetype)) return cb(null, true);
        // Fallback: allow generic octet-stream only if extension looks like pdf/doc
        const ext = (file.originalname || '').toLowerCase().split('.').pop();
        if (['pdf','doc','docx','ppt','pptx','txt','jpg','jpeg','png','webp'].includes(ext)) {
            return cb(null, true);
        }
        return cb(new Error(`File type not allowed: ${file.mimetype}`), false);
    }
});

module.exports = upload;
