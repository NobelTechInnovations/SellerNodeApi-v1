import multer from 'multer';
import multerS3 from 'multer-s3';
import s3 from '../utils/s3Service.js';

// Define allowed file types
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// File filter function
const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WEBP images are allowed.'), false);
    }
};

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
            const uploadType = req.uploadType || 'uploads';
            const path = `${uploadType}/${Date.now().toString()}_${file.originalname}`;
            cb(null, path);
        }
    }),
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 6 // Maximum 6 files (1 thumbnail + 5 gallery images)
    }
});

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size is 5MB',
                error: err.message
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Maximum 6 files allowed',
                error: err.message
            });
        }
        console.log(err);
        return res.status(400).json({
            success: false,
            message: 'File upload error',
            error: err.message
        });
    }
    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message || 'File upload error',
            error: err
        });
    }
    next();
};

export { upload, handleUploadError };
