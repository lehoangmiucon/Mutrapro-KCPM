const express = require('express');

const { asyncHandler } = require('../shared/middleware/errorHandler');
const { handleSingleFileUpload } = require('../config/uploadConfig');
const { authMiddleware } = require('../middleware/authMiddleware');
const { createFileService } = require('../services/fileService');

const createFileController = ({ pool, logger }) => {
    const router = express.Router();
    const fileService = createFileService({ pool, logger });

    router.post(
        '/upload',
        authMiddleware,
        handleSingleFileUpload('file'),
        asyncHandler(async (req, res) => {
            const result = await fileService.uploadFile({
                user: req.user,
                body: req.body,
                uploadedFile: req.file
            });

            res.status(201).json(result);
        })
    );

    router.get(
        '/files/order/:orderId',
        authMiddleware,
        asyncHandler(async (req, res) => {
            const files = await fileService.getFilesByOrder({
                user: req.user,
                orderId: req.params.orderId
            });

            res.json(files);
        })
    );

    router.get(
        '/files/download/:fileId',
        authMiddleware,
        asyncHandler(async (req, res, next) => {
            const downloadInfo = await fileService.getDownloadInfo({
                user: req.user,
                fileId: req.params.fileId
            });

            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(downloadInfo.fileName)}`);
            res.sendFile(downloadInfo.absolutePath, next);
        })
    );

    return router;
};

module.exports = { createFileController };
