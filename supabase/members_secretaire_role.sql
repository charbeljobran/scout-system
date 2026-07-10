-- Run after the members/attendance schema has been created.
-- Adds the secretaire role with CG-like members and attendance access.

alter table if exists public.members enable row level security;
alter table if exists public.attendance enable row level security;
alter table if exists public.user_roles enable row level security;

drop policy if exists "Members: select own, cg-added-to-my-branch, or all if cg" on public.members;
drop policy if exists "Members visible by role" on public.members;
create policy "Members visible by role"
on public.members
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.id = auth.uid()
      and (
        ur.role in ('cg', 'secretaire')
        or ur.role = members.branch
        or (ur.role = 'routier' and members.branch = 'routiers')
      )
  )
);

drop policy if exists "Members: update own or cg" on public.members;
drop policy if exists "Members editable by role" on public.members;
create policy "Members editable by role"
on public.members
for update
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.id = auth.uid()
      and (
        ur.role in ('cg', 'secretaire')
        or members.added_by = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.id = auth.uid()
      and (
        ur.role in ('cg', 'secretaire')
        or members.added_by = auth.uid()
      )
  )
);

drop policy if exists "Members: insert own" on public.members;
drop policy if exists "Members insertable by role" on public.members;
create policy "Members insertable by role"
on public.members
for insert
to authenticated
with check (
  added_by = auth.uid()
  and exists (
    select 1
    from public.user_roles ur
    where ur.id = auth.uid()
      and (
        ur.role in ('cg', 'secretaire')
        or ur.role = members.branch
        or (ur.role = 'routier' and members.branch = 'routiers')
      )
  )
);

drop policy if exists "Members: delete own or cg" on public.members;
drop policy if exists "Members deletable by role" on public.members;
create policy "Members deletable by role"
on public.members
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.id = auth.uid()
      and (
        ur.role in ('cg', 'secretaire')
        or members.added_by = auth.uid()
      )
  )
);

drop policy if exists "Attendance: select via member visibility" on public.attendance;
drop policy if exists "Attendance visible by role" on public.attendance;
create policy "Attendance visible by role"
on public.attendance
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    join public.members m on m.id = attendance.member_id
    where ur.id = auth.uid()
      and (
        ur.role in ('cg', 'secretaire')
        or ur.role = m.branch
        or (ur.role = 'routier' and m.branch = 'routiers')
      )
  )
);

drop policy if exists "Attendance: insert via member visibility" on public.attendance;
drop policy if exists "Attendance insertable by role" on public.attendance;
create policy "Attendance insertable by role"
on public.attendance
for insert
to authenticated
with check (
  marked_by = auth.uid()
  and exists (
    select 1
    from public.user_roles ur
    join public.members m on m.id = attendance.member_id
    where ur.id = auth.uid()
      and (
        ur.role in ('cg', 'secretaire')
        or ur.role = m.branch
        or (ur.role = 'routier' and m.branch = 'routiers')
      )
  )
);

drop policy if exists "Attendance: update via member visibility" on public.attendance;
drop policy if exists "Attendance editable by role" on public.attendance;
create policy "Attendance editable by role"
on public.attendance
for update
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    join public.members m on m.id = attendance.member_id
    where ur.id = auth.uid()
      and (
        ur.role in ('cg', 'secretaire')
        or ur.role = m.branch
        or (ur.role = 'routier' and m.branch = 'routiers')
      )
  )
)
with check (
  marked_by = auth.uid()
  and exists (
    select 1
    from public.user_roles ur
    join public.members m on m.id = attendance.member_id
    where ur.id = auth.uid()
      and (
        ur.role in ('cg', 'secretaire')
        or ur.role = m.branch
        or (ur.role = 'routier' and m.branch = 'routiers')
      )
  )
);
