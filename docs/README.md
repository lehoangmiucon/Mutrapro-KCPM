# MuTraPro Backend README

## Tong quan
MuTraPro la he thong web dich vu am nhac gom ky am, phoi khi, thu am, dat lich phong thu, thanh toan mock va quan tri bao cao. Backend hien duoc to chuc theo kien truc microservices Node.js/Express, chay qua Docker Compose.

## Cong nghe
- Node.js + Express
- MySQL 8
- Docker Compose
- JWT authentication
- bcrypt password hashing
- Multer upload
- Redis cache
- RabbitMQ event demo
- Socket.io/notification service

## Cau truc backend
- `services/auth-service`: dang ky, dang nhap, JWT, user/admin CRUD.
- `services/order-service`: service request/order, payment mock, feedback, revision.
- `services/task-service`: phan cong task va cap nhat tien do.
- `services/file-service`: upload/download file co validation va authorization.
- `services/studio-service`: studio room va booking.
- `services/notification-service`: notification/device token.
- `services/analytics-service`: report/dashboard.
- `services/api-gateway`: gateway REST cho frontend.
- `shared`: middleware, logger, validation, business rules dung chung.
- `tests`: automated backend rule tests.

## Chay he thong
```powershell
copy .env.example .env
docker compose up --build -d
docker compose ps
```

Web frontend: `http://localhost:3000`
API gateway: `http://localhost:3007`

## Tai khoan demo
Mat khau chung: `Admin@123`

| Role | Email |
|---|---|
| Admin | admin@mutrapro.com |
| Coordinator | dpv@mutrapro.com |
| Transcriber | cvka@mutrapro.com |
| Arranger | cvpk@mutrapro.com |
| Artist | artist@mutrapro.com |
| Studio Admin | studio@mutrapro.com |
