# Oh Duck It — Guild Website

A static GitHub Pages website with a Supabase-backed recruitment system and Discord-authenticated officer portal.

## Included pages

- `index.html` — public homepage
- `structure.html` — the supplied ODit guild hierarchy, integrated into the site navigation
- `progression.html` — raid goal, schedule and WCL/Raider.IO links
- `recruitment.html` — public recruitment application form
- `resources.html` — guild and player links
- `officers.html` — private recruitment dashboard
- `supabase/schema.sql` — database, RLS policies and officer access function

## 1. Put the site on GitHub Pages

Create a public GitHub repository, upload the contents of this folder to the repository root, then enable GitHub Pages from the `main` branch / root folder.

The public static pages will work immediately. Recruitment submission and the Officer Portal remain disabled until Supabase is connected.

## 2. Create the Supabase backend

1. Create a Supabase project.
2. Open the project's SQL Editor.
3. Run the complete `supabase/schema.sql` file.
4. In Project Settings / API, copy the Project URL and browser publishable key (or legacy anon key).
5. Edit `assets/supabase-config.js` and replace both placeholder values.

**Never place a `service_role` key in the website.** The browser should use only the publishable/anon key. The included RLS and grants enforce what the browser can do.

## 3. Enable Discord officer login

1. Create an application in the Discord Developer Portal.
2. In Supabase Authentication > Sign In / Providers > Discord, copy the Supabase callback URL.
3. Add that callback URL to the Discord application's OAuth2 redirects.
4. Put the Discord Client ID and Client Secret into the Discord provider settings in Supabase.
5. In Supabase Authentication URL configuration, set the Site URL to the final website address and add the exact `officers.html` URL to the redirect allow list.

The portal calls Discord through Supabase Auth. A successful Discord login does **not** grant officer access on its own.

## 4. Authorise the first officer

1. Open `officers.html` on the published site.
2. Sign in with Discord.
3. The unauthorised screen shows the signed-in Supabase user UUID.
4. Copy that UUID.
5. In the Supabase SQL Editor run:

```sql
insert into public.officers (user_id, display_name)
values ('PASTE-USER-UUID-HERE', 'Officer name');
```

Refresh the Officer Portal. The account can now read and manage applications.

Repeat for each ODit officer. To remove access without deleting the row:

```sql
update public.officers
set active = false
where user_id = 'PASTE-USER-UUID-HERE';
```

## 5. Add ODit external links

Edit `assets/guild-config.js` and replace the `#` values for:

- Discord invite
- Raider.IO guild page
- Warcraft Logs guild page
- WoW Armory / guild page
- Community link if wanted

## Recruitment security model

- Signed-out visitors: `INSERT` applications only.
- Signed-out visitors: no `SELECT`, `UPDATE` or `DELETE` access.
- Any Discord login: authenticated, but no application access unless the user's UUID is active in `public.officers`.
- Active officers: read/update applications and read/add private notes.
- Browser clients: cannot delete applications and cannot edit the officer allow-list.

This is enforced in Postgres/Supabase Row Level Security, not by hiding buttons in JavaScript.

## Officer workflow implemented

- Discord login
- New / Reviewing / Interview / Trial / Accepted / Declined / Archived statuses
- Application assignment to the currently signed-in officer
- Private officer notes
- Role/profile/availability/experience detail view
- Filters and summary counts

## Recommended next hardening step

Before advertising the recruitment form widely, add a bot/spam control such as Cloudflare Turnstile via a serverless/Edge Function. The form already contains a simple honeypot, but a public insert endpoint can still receive automated spam.

## Guild Structure editing

The public `structure.html` page is read-only. Assignment and mentor editing is intentionally available only inside `officers.html` after Discord sign-in and the `is_officer()` database check succeeds. The values are stored in the `guild_structure` Supabase table, which is public-read / officer-update under Row Level Security.

If you previously ran an older copy of `supabase/schema.sql`, run the current file again in the Supabase SQL Editor. It is written to be re-runnable and will add the `guild_structure` table, trigger, grants and policies without deleting existing recruitment applications.
