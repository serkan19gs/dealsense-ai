#!/usr/bin/env bash
#
# Validates supabase/migrations/0001_init.sql against a throwaway PostgreSQL
# cluster. Needs no network, no Supabase project, and no credentials — so it
# runs in CI and catches schema regressions before they reach a real database.
#
# It asserts the things that are easy to get wrong and expensive to get wrong:
#   - the migration applies cleanly from scratch
#   - the signup trigger provisions a profile + free subscription
#   - check/unique constraints reject bad data
#   - deleting an auth user cascades
#   - RLS actually isolates one user's rows from another's
#
# Usage: ./scripts/test-schema.sh
# Requires: PostgreSQL 14+ server binaries (initdb, pg_ctl, psql).

set -euo pipefail

MIGRATION="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/supabase/migrations/0001_init.sql"
WORKDIR="$(mktemp -d)"
PGPORT="${PGPORT:-54329}"

# Locate server binaries: Debian/Ubuntu hide them outside PATH.
PGBIN=""
if command -v initdb >/dev/null 2>&1; then
  PGBIN="$(dirname "$(command -v initdb)")"
else
  for d in /usr/lib/postgresql/*/bin /opt/homebrew/opt/postgresql*/bin /usr/local/opt/postgresql*/bin; do
    [ -x "$d/initdb" ] && PGBIN="$d" && break
  done
fi
if [ -z "$PGBIN" ]; then
  echo "error: PostgreSQL server binaries not found (need initdb/pg_ctl/psql)." >&2
  exit 1
fi

# Postgres refuses to run as root, so drop to an unprivileged user if needed.
RUN=""
if [ "$(id -u)" -eq 0 ]; then
  id pgtest >/dev/null 2>&1 || useradd -m pgtest
  chown -R pgtest "$WORKDIR"
  RUN="su pgtest -c"
fi
run() { if [ -n "$RUN" ]; then su pgtest -c "$1"; else bash -c "$1"; fi; }

cleanup() {
  run "$PGBIN/pg_ctl -D $WORKDIR/data stop -m immediate" >/dev/null 2>&1 || true
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

echo "==> starting throwaway PostgreSQL on port $PGPORT"
run "$PGBIN/initdb -D $WORKDIR/data -A trust -U postgres" >"$WORKDIR/initdb.log" 2>&1
run "$PGBIN/pg_ctl -D $WORKDIR/data -l $WORKDIR/pg.log -o '-p $PGPORT -k $WORKDIR' start" >/dev/null 2>&1
sleep 3
run "$PGBIN/pg_isready -h $WORKDIR -p $PGPORT" >/dev/null

PSQL="$PGBIN/psql -h $WORKDIR -p $PGPORT -U postgres -v ON_ERROR_STOP=1"

echo "==> stubbing Supabase auth schema"
cat > "$WORKDIR/auth.sql" <<'SQL'
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create or replace function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
SQL
cp "$MIGRATION" "$WORKDIR/migration.sql"
[ -n "$RUN" ] && chown pgtest "$WORKDIR/auth.sql" "$WORKDIR/migration.sql"
run "$PSQL -q -f $WORKDIR/auth.sql"

echo "==> applying migration"
run "$PSQL -q -f $WORKDIR/migration.sql"

echo "==> running assertions"
cat > "$WORKDIR/assert.sql" <<'SQL'
\set ON_ERROR_STOP on

-- 1. Signup trigger provisions profile + free subscription.
insert into auth.users (id, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111','agent@example.com','{"full_name":"Dana Reyes"}');

do $$
begin
  if (select count(*) from public.profiles where id='11111111-1111-1111-1111-111111111111') <> 1 then
    raise exception 'FAIL: signup did not create a profile';
  end if;
  if (select tier from public.subscriptions where user_id='11111111-1111-1111-1111-111111111111') <> 'free' then
    raise exception 'FAIL: signup did not provision a free subscription';
  end if;
  if (select full_name from public.profiles where id='11111111-1111-1111-1111-111111111111') <> 'Dana Reyes' then
    raise exception 'FAIL: full_name not copied from user metadata';
  end if;
  raise notice 'PASS: signup trigger provisions profile + free subscription';
end $$;

-- 2. Check constraints reject invalid enums.
do $$
begin
  begin
    insert into public.subscriptions (user_id, tier) values ('11111111-1111-1111-1111-111111111111','platinum');
    raise exception 'FAIL: invalid tier accepted';
  exception when check_violation then raise notice 'PASS: invalid tier rejected';
  end;
  begin
    insert into public.deals (user_id, address, stage) values ('11111111-1111-1111-1111-111111111111','1 Main St','teleported');
    raise exception 'FAIL: invalid stage accepted';
  exception when check_violation then raise notice 'PASS: invalid deal stage rejected';
  end;
  begin
    insert into public.subscriptions (user_id, tier) values ('11111111-1111-1111-1111-111111111111','pro');
    raise exception 'FAIL: duplicate subscription accepted';
  exception when unique_violation then raise notice 'PASS: one subscription per user enforced';
  end;
end $$;

-- 3. Deleting the auth user cascades.
delete from auth.users where id='11111111-1111-1111-1111-111111111111';
do $$
begin
  if (select count(*) from public.profiles) <> 0 or (select count(*) from public.subscriptions) <> 0 then
    raise exception 'FAIL: rows survived auth user deletion';
  end if;
  raise notice 'PASS: auth user deletion cascades';
end $$;

-- 4. Every public table has RLS on.
do $$
declare unprotected text;
begin
  select string_agg(c.relname, ', ') into unprotected
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and c.relrowsecurity = false;
  if unprotected is not null then
    raise exception 'FAIL: tables without RLS: %', unprotected;
  end if;
  raise notice 'PASS: RLS enabled on every public table';
end $$;

-- 5. RLS isolates users from each other.
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001','alice@example.com','{"full_name":"Alice"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002','bob@example.com','{"full_name":"Bob"}');
insert into public.deals (user_id, address, price) values
  ('aaaaaaaa-0000-0000-0000-000000000001','1 Alice Ave',100000),
  ('bbbbbbbb-0000-0000-0000-000000000002','2 Bob Blvd',200000);

do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated') then
    create role authenticated nologin;
  end if;
end $$;
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;

set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';

do $$
begin
  if (select count(*) from public.deals) <> 1 then
    raise exception 'FAIL: RLS leaked rows across users';
  end if;
  if (select address from public.deals) <> '1 Alice Ave' then
    raise exception 'FAIL: RLS returned the wrong user''s row';
  end if;
  raise notice 'PASS: users see only their own rows';

  begin
    insert into public.deals (user_id, address) values ('bbbbbbbb-0000-0000-0000-000000000002','Stolen St');
    raise exception 'FAIL: cross-user insert allowed';
  exception when insufficient_privilege then raise notice 'PASS: cross-user insert blocked';
  end;
end $$;

update public.deals set price = 1 where address = '2 Bob Blvd';
delete from public.deals where address = '2 Bob Blvd';
reset role;

do $$
begin
  if (select price from public.deals where address='2 Bob Blvd') <> 200000 then
    raise exception 'FAIL: another user modified or deleted these rows';
  end if;
  raise notice 'PASS: cross-user update/delete blocked';
end $$;
SQL
[ -n "$RUN" ] && chown pgtest "$WORKDIR/assert.sql"
run "$PSQL -q -f $WORKDIR/assert.sql"

echo ""
echo "==> schema OK"
