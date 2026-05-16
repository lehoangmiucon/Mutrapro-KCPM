const bcrypt = require('bcrypt');

async function hashPassword() {
  const password = 'Admin@123';
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  console.log('Mật khẩu đã mã hóa của bạn là:');
  console.log(hashedPassword);
}

hashPassword();