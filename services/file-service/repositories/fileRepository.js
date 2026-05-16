const createFileRepository = (pool) => ({
    async createFile({ orderId, uploaderId, fileName, filePath, fileType, fileSize }) {
        const [result] = await pool.execute(
            `INSERT INTO file (order_id, uploader_id, file_name, file_path, file_type, file_size)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [orderId, uploaderId, fileName, filePath, fileType, fileSize]
        );

        return result.insertId;
    },

    async findByOrderId(orderId) {
        const [rows] = await pool.execute(
            `SELECT id, file_name, file_type, file_size, created_at
             FROM file
             WHERE order_id = ?
             ORDER BY created_at DESC`,
            [orderId]
        );

        return rows;
    },

    async findById(fileId) {
        const [rows] = await pool.execute('SELECT * FROM file WHERE id = ?', [fileId]);
        return rows[0] || null;
    }
});

module.exports = { createFileRepository };
