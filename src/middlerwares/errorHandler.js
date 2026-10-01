const multer = require('multer');
const MESSAGES = {
LIMIT_FILE_SIZE: 'ไฟล์มีขมีนาดเกิน 5 MB',
LIMIT_FILE_COUNT: 'อัปโหลดได้สูงดสุด 5 ไฟล์', 
LIMIT_UNEXPECTED_FILE: 'ชื่อฟิลด์ไม่ถูกต้อง หรืออัปโหลดไฟล์เกินกำหนด',
};
module.exports = (err, req, res, next) => {
if (err instanceof multer.MulterError) {
const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
return res.status(status).json({ error: MESSAGES[err.code] ||
err.message, code: err.code });
}
const status = err.status || 500;
if (status === 500) console.error(err);
res.status(status).json({ error: status === 500 ? 'Internal server error' :
err.message });
};