const path = require('path');
const fs = require('fs');
const axios = require('axios');

const { AppError } = require('../shared/middleware/errorHandler');
const { createFileRepository } = require('../repositories/fileRepository');
const { decodeOriginalName, isAllowedFile, UPLOADS_DIR } = require('../config/uploadConfig');
const { assertCanReadOrderFiles, assertCanUpload, parsePositiveInt } = require('./fileAccessService');

const notify = async (logger, userId, eventName, data) => {
    if (!userId) return;

    try {
        await axios.post('http://notification-service:3006/notify', { userId, eventName, data });
    } catch (error) {
        logger.error(`Failed to send notification '${eventName}'`, { error: error.message });
    }
};

const createFileService = ({ pool, logger }) => {
    const fileRepository = createFileRepository(pool);

    return {
        async uploadFile({ user, token, body, uploadedFile }) {
            if (!uploadedFile) {
                throw new AppError('No file was uploaded.', 400);
            }

            try {
                const orderId = parsePositiveInt(body.order_id, 'order_id');
                const coordinatorId = body.coordinatorId ? parsePositiveInt(body.coordinatorId, 'coordinatorId') : null;
                const fileType = body.file_type;

                if (!isAllowedFile(fileType, uploadedFile)) {
                    throw new AppError('File format is not supported for this upload type.', 400);
                }

                await assertCanUpload({ user, token, orderId, fileType });

                const originalName = decodeOriginalName(uploadedFile.originalname);
                const storedRelativePath = path.posix.join('uploads', path.basename(uploadedFile.path));
                const fileId = await fileRepository.createFile({
                    orderId,
                    uploaderId: user.id,
                    fileName: originalName,
                    filePath: storedRelativePath,
                    fileType,
                    fileSize: uploadedFile.size
                });

                if (fileType !== 'audio' && coordinatorId) {
                    notify(logger, coordinatorId, 'product_file_uploaded', {
                        orderId,
                        fileName: originalName,
                        uploaderId: user.id,
                        message: `Specialist uploaded a product file for order #${orderId}.`
                    });
                }

                logger.info(`File ${originalName} uploaded for order #${orderId}`);
                return { id: fileId, message: 'File uploaded successfully.' };
            } catch (error) {
                fs.unlink(uploadedFile.path, () => {});
                throw error;
            }
        },

        async getFilesByOrder({ user, token, orderId }) {
            const parsedOrderId = parsePositiveInt(orderId, 'orderId');
            await assertCanReadOrderFiles({ user, token, orderId: parsedOrderId });
            return fileRepository.findByOrderId(parsedOrderId);
        },

        async getDownloadInfo({ user, token, fileId }) {
            const parsedFileId = parsePositiveInt(fileId, 'fileId');
            const fileInfo = await fileRepository.findById(parsedFileId);
            if (!fileInfo) {
                throw new AppError('File metadata was not found.', 404);
            }

            await assertCanReadOrderFiles({ user, token, orderId: fileInfo.order_id });

            const absolutePath = path.resolve(__dirname, '..', fileInfo.file_path);
            if (!absolutePath.startsWith(UPLOADS_DIR) || !fs.existsSync(absolutePath)) {
                throw new AppError('File was not found on server.', 404);
            }

            return {
                absolutePath,
                fileName: fileInfo.file_name
            };
        }
    };
};

module.exports = { createFileService };
