# Blog setup

The code is complete, but the blog cannot work until a Supabase project exists
behind it. These steps are dashboard work and have to be done by hand once.

## 1. Create the Supabase project

Sign up at supabase.com, create a project, and note the project URL and the
`anon` public key from Project Settings → API.

## 2. Register a GitHub OAuth app

On GitHub: Settings → Developer settings → OAuth Apps → New OAuth App.

- Homepage URL: your site's URL
- Authorization callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`

Copy the client ID and client secret into Supabase → Authentication →
Providers → GitHub, and enable the provider.

Then set Authentication → URL Configuration → Site URL to your deployed site,
and add `http://localhost:5173` to the additional redirect URLs so local
development can complete a sign-in.

## 3. Apply the migrations

In the Supabase SQL editor, run the three files in `supabase/migrations/` in
numeric order:

1. `0001_blog_schema.sql`
2. `0002_blog_policies.sql`
3. `0003_blog_storage.sql`

## 4. Make yourself the admin

Sign in to the site once through GitHub. The `on_auth_user_created` trigger
creates your `profiles` row with `is_admin = false`. Then, in the SQL editor:

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'your@email.address');
```

Everyone else who ever signs in stays a non-admin row that can do nothing.

## 5. Configure environment variables

Locally, copy `.env.example` to `.env` and fill in both values. On Vercel, add
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under Project Settings →
Environment Variables, then redeploy.

Both values are safe in the client bundle: the anon key carries no authority by
itself, and Row Level Security is what grants access.

## 6. Verify the security claim

```bash
npm run verify:rls
```

Create a draft first, copy its id from the Supabase table editor, and pass it
in to exercise the direct-fetch check as well:

```bash
npm run verify:rls -- <draft-uuid>
```

Every check must pass. Re-run this after any change to
`supabase/migrations/0002_blog_policies.sql`.
