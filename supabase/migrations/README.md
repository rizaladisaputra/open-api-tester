# Supabase Migrations — Modern API Studio

## Cara Apply ke Supabase Baru

Kini proses pembuatan tabel sudah diotomatisasi lewat script Node.js.

1. Buka file `apps/client/.env`
2. Tambahkan variabel `DATABASE_URL` dengan Connection String Postgres dari Supabase Anda:
   ```env
   DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
   ```
3. Buka terminal di root project, lalu jalankan:
   ```bash
   npm run migrate
   ```

Script akan otomatis mengeksekusi file `001_full_schema.sql` ini ke database Anda.

*(Alternatif manual: Copy seluruh isi `001_full_schema.sql` dan run di SQL Editor Supabase)*

---

## Isi Migration (`001_full_schema.sql`)

### Tabel

| Tabel | Deskripsi |
|-------|-----------|
| `public.projects` | Project API milik user, menyimpan `spec_data` (JSONB) |
| `public.project_members` | Kolaborator project dengan role `owner / editor / viewer` |
| `public.project_invites` | Invite link yang bisa dibagikan, dengan expiry & max_uses opsional |

### Fungsi SECURITY DEFINER

| Fungsi | Kegunaan |
|--------|----------|
| `get_my_project_ids()` | Project IDs di mana user adalah member (any role) |
| `get_my_editor_project_ids()` | Project IDs di mana user adalah owner/editor |
| `get_my_accessible_projects()` | Semua project yang bisa diakses user + rolenya → dipakai di Dashboard |
| `get_project_members_with_emails(uuid)` | Member list lengkap dengan email asli dari `auth.users` |
| `handle_updated_at()` | Trigger function untuk auto-update `updated_at` |

> **Mengapa SECURITY DEFINER?**  
> Policy RLS pada `project_members` yang meng-query `project_members` sendiri menyebabkan infinite recursion di PostgreSQL. Fungsi SECURITY DEFINER bypass RLS dan memutus siklus ini.

### RLS Policies

**projects**
- `SELECT` — owner + members (via `get_my_project_ids`)
- `INSERT` — hanya bisa insert project sendiri (`user_id = auth.uid()`)
- `UPDATE` — owner + editors (via `get_my_editor_project_ids`)
- `DELETE` — hanya owner

**project_members**
- `SELECT` — row sendiri, atau project yang dimiliki/diikuti
- `INSERT` (owner path) — owner bisa tambah member siapapun
- `INSERT` (self-join path) — user bisa tambah diri sendiri (`user_id = auth.uid()`) → untuk accept invite
- `UPDATE` — hanya owner (untuk ganti role)
- `DELETE` — owner bisa hapus siapapun; member bisa hapus diri sendiri (leave)

**project_invites**
- `SELECT` — `using(true)` → siapapun bisa baca invite by token (untuk join flow)
- `INSERT` — owner + editors bisa buat invite
- `UPDATE` — authenticated user bisa increment `use_count` (saat accept)
- `DELETE` — hanya owner (revoke)

### Realtime

`projects` dan `project_members` didaftarkan ke `supabase_realtime` publication  
sehingga perubahan broadcast ke semua collaborator via Supabase Realtime channel.

---

## Token Invite

Token **tidak** di-generate oleh database (tidak perlu extension `pgcrypto`).  
Token di-generate client-side menggunakan `crypto.getRandomValues()` — 24 random bytes → 48 karakter hex.

```typescript
// useCollabStore.ts
const tokenBytes = new Uint8Array(24);
crypto.getRandomValues(tokenBytes);
const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
```

---

## Verifikasi Setelah Apply

```sql
-- Pastikan semua fungsi terdaftar
select routine_name from information_schema.routines
where routine_schema = 'public' and routine_type = 'FUNCTION';

-- Cek semua RLS policies
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, cmd;

-- Test fungsi utama (harus login dulu)
select * from public.get_my_accessible_projects();
```
