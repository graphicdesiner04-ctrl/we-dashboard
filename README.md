# WE Technical Support Dashboard

نظام إدارة الموارد البشرية لفريق الدعم الفني لشركة WE مصر.

---

## متطلبات التشغيل

- Node.js ≥ 18
- npm ≥ 9

---

## تشغيل المشروع (بيئة تطوير)

```bash
# 1. تثبيت الاعتماديات
npm install

# 2. تشغيل السيرفر
npm run dev
```

يفتح التطبيق على: **http://localhost:5174**

### بيانات الدخول (development)

| الاسم            | Username              | Password    | الدور     |
|------------------|-----------------------|-------------|-----------|
| Ahmed Galal      | Ahmed.G.Hafez         | WeData2060  | Senior    |
| Mohamed Hisham   | Mohamed.Hisham        | WeData2060  | Senior    |
| Ahmed Hassan     | Ahmed.H.Bahaa         | WeData2060  | Senior    |
| Ali Mahrous      | Ali.Mahrous           | WeData2060  | Senior    |
| Ahmed Alaa       | Ahmed.Eldin           | WeData2060  | Senior    |
| Mohamed Sholkamy | Mohamed.M.Sholkamy    | WeData2060  | Supervisor|

---

## بناء نسخة الإنتاج

```bash
npm run build
```

الملفات تُولَّد في مجلد `dist/`.

---

## هيكل المشروع

```
src/
├── types/
│   ├── hr.ts          — كل أنواع البيانات (Employee, Branch, Records…)
│   └── auth.ts        — أنواع المصادقة (UserAccount, AuthSession)
├── data/
│   ├── seedData.ts    — بيانات البذر (مصدر الحقيقة للتطوير)
│   ├── seedAuth.ts    — حسابات المديرين
│   └── mockData.ts    — re-export compat shim فقط
├── context/
│   ├── ThemeContext.tsx
│   └── AuthContext.tsx
├── hooks/
│   ├── usePermissions.ts
│   ├── useAnnualLeave.ts
│   └── useAssignments.ts
├── pages/
│   ├── LoginPage.tsx
│   ├── OverviewPage.tsx
│   ├── PermissionsPage.tsx
│   ├── AnnualLeavePage.tsx
│   └── BranchTechnicalPage.tsx
├── components/
│   ├── layout/        — AppLayout, Sidebar, TopBar
│   └── hr/            — Form, Table, KPI, Summary components
└── lib/
    └── storage.ts     — typed localStorage wrapper

prisma/
└── schema.prisma      — Prisma schema جاهز لـ PostgreSQL
```

---

## قاعدة البيانات (مستقبلاً)

```bash
# نسخ ملف البيئة
cp .env.example .env
# تعبئة DATABASE_URL بقاعدة البيانات الفعلية

# تثبيت Prisma
npm install -D prisma
npm install @prisma/client

# تطبيق المخطط
npx prisma migrate dev --name init

# توليد client
npx prisma generate
```

---

## مزامنة بيانات Google Sheet

1. افتح الشيت → File → Share → Anyone with the link → Viewer
2. أرسل الرابط للمطوّر
3. يُحدَّث `src/data/seedData.ts` بالبيانات الفعلية
4. بعد ذلك يمكن الانتقال لـ Prisma seed مباشرةً

---

## الوحدات المتاحة

| الوحدة                   | المسار             | الحالة  |
|--------------------------|--------------------|---------|
| نظرة عامة               | /overview          | ✅ جاهز |
| ساعات الإذن             | /permissions       | ✅ جاهز |
| الإجازة السنوية         | /annual-leave      | ✅ جاهز |
| البنية التقنية للفروع   | /branch-technical  | ✅ جاهز |
| الإجازة المرضية         | /sick-leave        | 🔜 قريباً |
| العمل في الإجازة        | /day-off           | 🔜 قريباً |
| بدلاً من                | /instead-of        | 🔜 قريباً |
| مركز الرفع              | /upload            | 🔜 قريباً |
