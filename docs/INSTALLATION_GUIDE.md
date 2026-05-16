# MuTraPro Installation Guide

## Yeu cau
- Docker Desktop
- Docker Compose
- Node.js 18+
- Git
- PowerShell

## Cau hinh moi truong
```powershell
copy .env.example .env
```

Sua `.env`:
```env
DB_PASSWORD=your_local_password
JWT_SECRET=your_long_random_secret
```

## Chay backend/web bang Docker
```powershell
docker compose up --build -d
docker compose ps
```

## Kiem tra health
```powershell
curl http://localhost:3007/api/health
curl http://localhost:3007/api/health/all
```

## Reset database
```powershell
docker compose down -v
docker compose up --build -d
```

## Loi thuong gap
| Loi | Nguyen nhan | Cach xu ly |
|---|---|---|
| Cannot connect docker_engine | Docker Desktop chua chay | Mo Docker Desktop |
| Access denied `.docker/config.json` | Quyen user Windows | Chay PowerShell dung user/Administrator |
| MySQL 3306 busy | May da co MySQL local | Project dang map MySQL ra `3307` |
| JWT invalid | `.env` JWT_SECRET khac luc tao token | Login lai |
