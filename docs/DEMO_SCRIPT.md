# MuTraPro Demo Script 5-10 Phut

## 1. Khoi dong
```powershell
docker compose up --build -d
```

Mo web: `http://localhost:3000`

## 2. Login Customer
- Login customer demo hoac dang ky user moi.
- Tao request transcription/arrangement/recording.
- Upload file audio hop le.
- Mo lich su order va xem status pending.

## 3. Login Coordinator
- Login `dpv@mutrapro.com`.
- Xem tat ca request.
- Phan cong specialist phu hop.
- Cap nhat status neu can.

## 4. Login Specialist
- Login `cvka@mutrapro.com` hoac `cvpk@mutrapro.com`.
- Xem task duoc giao.
- Bat dau task.
- Upload file ket qua.
- Hoan thanh task.

## 5. Customer feedback/payment
- Customer mo chi tiet order.
- Xem file ket qua.
- Yeu cau revision hoac thanh toan mock.
- Gui feedback sau khi paid.

## 6. Studio booking
- Login artist.
- Dat lich phong thu o thoi gian tuong lai.
- Thu dat trung gio de demo loi 409.
- Login studio admin de xem lich.

## 7. Admin report
- Login admin.
- Xem users, transactions, stats/dashboard.

## 8. Diem nhan backend
- Show `docs/API_DOCUMENTATION.md`.
- Show health endpoints.
- Show Docker containers running.
