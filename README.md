# App Cham Cong (React + TypeScript)

Ung dung web mobile de theo doi va tinh tong gio lam.
Cong nghe su dung: React, TypeScript, Vite.

## Yeu cau

- Node.js 18+ (khuyen nghi Node.js 20+)
- npm 9+

## Cai dat

```bash
npm install
```

## Chay moi truong phat trien (dev)

```bash
npm run dev
```

Sau do mo trinh duyet tai:

- http://localhost:5173

## Build production

```bash
npm run build
```

Sau khi build thanh cong, file deploy nam trong thu muc `dist`.

## Xem ban production tren may local

```bash
npm run preview
```

Mo trinh duyet tai:

- http://localhost:4173

## Deploy

Ban co the deploy noi dung trong thu muc `dist` len cac nen tang static hosting nhu:

- Netlify
- Vercel (Static)
- GitHub Pages

## Deploy mien phi (khuyen nghi)

### Cach 1: Vercel (Free) - khuyen nghi

1. Day code len GitHub (tao repo moi cho project).
2. Vao https://vercel.com va dang nhap bang GitHub.
3. Chon New Project, import repo vua tao.
4. Kiem tra cau hinh:
	- Build Command: `npm run build`
	- Output Directory: `dist`
5. Nhan Deploy.
6. Sau khi xong, ban nhan duoc URL cong khai dang:
	- https://ten-app.vercel.app

### Cach 2: Netlify Drop (Free) - nhanh nhat, khong can Git

1. Chay lenh build:

```bash
npm run build
```

2. Vao https://app.netlify.com/drop
3. Keo-tha thu muc `dist` vao trang do.
4. Nhan URL cong khai ngay lap tuc.

## Luu y khi dung online cho 1 nguoi

- App hien luu du lieu bang localStorage tren trinh duyet.
- Neu doi thiet bi hoac doi trinh duyet, du lieu se khong tu dong dong bo.
- Neu can dong bo da thiet bi, can them backend (vi du: Supabase/Firebase).

## Ghi chu

- Du lieu cham cong duoc luu tren trinh duyet bang localStorage voi key: `app-cham-cong-rows-v1`.
