const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { AppError } = require('../shared/middleware/errorHandler');

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

const FILE_RULES = {
    audio: {
        extensions: ['.mp3', '.mp4', '.m4a', '.wav'],
        mimeTypes: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/x-m4a', 'video/mp4']
    },
    notation: {
        extensions: ['.pdf', '.xml', '.mxl', '.musicxml'],
        mimeTypes: ['application/pdf', 'application/xml', 'text/xml', 'application/octet-stream']
    },
    mix: {
        extensions: ['.mp3', '.wav'],
        mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/x-wav']
    },
    final: {
        extensions: ['.mp3', '.wav', '.pdf', '.zip'],
        mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'application/pdf', 'application/zip', 'application/x-zip-compressed']
    }
};

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const decodeOriginalName = (originalName) => {
    return Buffer.from(originalName, 'latin1').toString('utf8');
};

const sanitizeFileName = (fileName) => {
    const parsed = path.parse(fileName);
    const safeBaseName = parsed.name
        .replace(/[^\w\s.-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 120) || 'upload';
    return `${safeBaseName}${parsed.ext.toLowerCase()}`;
};

const isAllowedFile = (fileType, file) => {
    const rules = FILE_RULES[fileType];
    if (!rules) return false;

    const decodedName = decodeOriginalName(file.originalname);
    const extension = path.extname(decodedName).toLowerCase();
    return rules.extensions.includes(extension) && rules.mimeTypes.includes(file.mimetype);
};

const matchesAnyKnownRule = (file) => {
    return Object.keys(FILE_RULES).some((fileType) => isAllowedFile(fileType, file));
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const decodedName = decodeOriginalName(file.originalname);
        cb(null, `${Date.now()}-${sanitizeFileName(decodedName)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter: (req, file, cb) => {
        const fileType = req.body.file_type;
        const allowed = fileType && FILE_RULES[fileType]
            ? isAllowedFile(fileType, file)
            : matchesAnyKnownRule(file);

        if (!allowed) {
            return cb(new AppError('File format is not supported for this upload type.', 400));
        }

        cb(null, true);
    }
});

const handleSingleFileUpload = (fieldName) => (req, res, next) => {
    upload.single(fieldName)(req, res, (error) => {
        if (!error) return next();

        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return next(new AppError('File is too large. Maximum size is 50MB.', 400));
        }

        next(error);
    });
};

module.exports = {
    FILE_RULES,
    MAX_FILE_SIZE_BYTES,
    UPLOADS_DIR,
    decodeOriginalName,
    isAllowedFile,
    handleSingleFileUpload
};
