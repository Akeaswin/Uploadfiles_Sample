const fs = require('fs/promises');
const path = require('path');
const { ALLOWED } = require('./upload');

const SIGNATURES = {
	'image/jpeg': (buffer) =>
		buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
	'image/png': (buffer) =>
		buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
	'image/webp': (buffer) =>
		buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP',
	'application/pdf': (buffer) =>
		buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-',
};

async function matchesFileType(file) {
	const allowedExtensions = ALLOWED[file.mimetype];
	const extension = path.extname(file.originalname).toLowerCase();
	const matchesSignature = SIGNATURES[file.mimetype];

	if (!allowedExtensions?.includes(extension) || !matchesSignature) return false;

	const handle = await fs.open(file.path, 'r');
	try {
		const header = Buffer.alloc(12);
		const { bytesRead } = await handle.read(header, 0, header.length, 0);
		return matchesSignature(header.subarray(0, bytesRead));
	} finally {
		await handle.close();
	}
}

module.exports = async (req, res, next) => {
	const files = req.file
		? [req.file]
		: Array.isArray(req.files)
			? req.files
			: Object.values(req.files || {}).flat();

	try {
		for (const file of files) {
			if (await matchesFileType(file)) continue;

			await Promise.all(
				files.map((uploadedFile) =>
					fs.unlink(uploadedFile.path).catch((error) => {
						if (error.code !== 'ENOENT') throw error;
					})
				)
			);
			return res.status(415).json({
				error: `ไฟล์ ${file.originalname} ไม่ตรงกับชนิดไฟล์ที่อนุญาต`,
			});
		}

		next();
	} catch (error) {
		next(error);
	}
};
