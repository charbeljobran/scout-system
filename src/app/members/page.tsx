'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  BRANCHES,
  Branch,
  BRANCH_TO_GENDER,
  Gender,
  GLOBAL_VISIBILITY_ROLES,
  MEMBER_ACCESS_ROLES,
  ROLE_TO_BRANCH,
  branchLabel,
  calculateAge,
  isoToDMY,
  maskDateInput,
  displayableMemberRoles,
  FEEDER_BRANCH,
  NEXT_BRANCH,
  memberRoleLabel,
  memberRolesForBranch,
  parseDMY,
  todayIso,
} from '@/lib/members';

type MemberRow = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: Gender;
  branch: Branch;
  mother_name: string | null;
  father_name: string | null;
  member_phone: string | null;
  parent_phone: string | null;
  email: string | null;
  medical_note: string | null;
  notes: string | null;
  roles: string[];
  added_by: string;
  created_at: string;
};

type AttendanceRow = {
  id: string;
  member_id: string;
  meeting_date: string;
  present: boolean;
};

type MemberFormState = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  branch: Branch | '';
  mother_name: string;
  father_name: string;
  member_phone: string;
  parent_phone: string;
  email: string;
  medical_note: string;
  notes: string;
  roles: string[];
};

const emptyForm: MemberFormState = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  branch: '',
  mother_name: '',
  father_name: '',
  member_phone: '',
  parent_phone: '',
  email: '',
  medical_note: '',
  notes: '',
  roles: [],
};

const skeletonWidth = (i: number, j: number) => `${55 + ((i + j) % 4) * 12}%`;

const formatSessionDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

function AttendanceSummary({ rows, loading, editedDates }: { rows: AttendanceRow[]; loading: boolean; editedDates?: Set<string> }) {
  if (loading) {
    return (
      <div className="attendance-history">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="attendance-row" key={i} aria-hidden="true">
            <span className="skeleton skeleton-text" style={{ width: '40%' }} />
            <span className="skeleton skeleton-pill" />
          </div>
        ))}
      </div>
    );
  }

  const total = rows.length;
  const present = rows.filter(r => r.present).length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  if (total === 0) {
    return <p className="history-empty">No attendance recorded yet.</p>;
  }

  return (
    <>
      <div className="attendance-summary">
        <div className="attendance-summary__stat">
          <span className="attendance-summary__value">{present}/{total}</span>
          <span className="attendance-summary__label">Sessions Attended</span>
        </div>
        <div className="attendance-summary__stat">
          <span className="attendance-summary__value">{pct}%</span>
          <span className="attendance-summary__label">Attendance Rate</span>
        </div>
      </div>
      <div className="attendance-history">
        {rows.map(row => (
          <div className="attendance-row" key={row.id}>
            <span>
              {formatSessionDate(row.meeting_date)}
              {editedDates?.has(row.meeting_date) && <span className="edited-badge">Edited</span>}
            </span>
            <span className={`history-action history-action--${row.present ? 'in' : 'out'}`}>
              {row.present ? 'Present' : 'Absent'}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export default function MembersPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [isCgUser, setIsCgUser] = useState(false);
  const [isSecretaire, setIsSecretaire] = useState(false);
  const [myBranch, setMyBranch] = useState<Branch | null>(null);

  const [tab, setTab] = useState<'members' | 'attendance' | 'history'>('members');

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<Branch | ''>('');

  const [isAdding, setIsAdding] = useState(false);
  const [addMode, setAddMode] = useState<'new' | 'existing'>('new');
  const [existingSearch, setExistingSearch] = useState('');
  const [form, setForm] = useState<MemberFormState>(emptyForm);
  const [dobInput, setDobInput] = useState('');
  const [dobError, setDobError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [viewingMember, setViewingMember] = useState<MemberRow | null>(null);
  const [editForm, setEditForm] = useState<MemberFormState | null>(null);
  const [editDobInput, setEditDobInput] = useState('');
  const [editDobError, setEditDobError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [attendanceDate, setAttendanceDate] = useState(todayIso());
  const [attendanceDateInput, setAttendanceDateInput] = useState(isoToDMY(todayIso()));
  const [dateError, setDateError] = useState('');
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [attendanceMapOriginal, setAttendanceMapOriginal] = useState<Record<string, boolean>>({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState('');
  const [pastSessions, setPastSessions] = useState<string[]>([]);
  const [sessionAlreadySaved, setSessionAlreadySaved] = useState(false);

  const [historyBranch, setHistoryBranch] = useState<Branch | ''>('');
  const [historyStats, setHistoryStats] = useState<Record<string, { total: number; present: number }>>({});
  const [historyStatsLoading, setHistoryStatsLoading] = useState(false);

  const [lookupMember, setLookupMember] = useState<MemberRow | null>(null);
  const [lookupRows, setLookupRows] = useState<AttendanceRow[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupEditedDates, setLookupEditedDates] = useState<Set<string>>(new Set());

  const [promoteConfirmId, setPromoteConfirmId] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [promoteError, setPromoteError] = useState('');
  const [existingSourceBranch, setExistingSourceBranch] = useState<Branch | ''>('');

  // cg and secretaire both have global members and attendance access.
  const canViewAllBranches = isCgUser || isSecretaire;
  const canAddMember = isCgUser || isSecretaire || Boolean(myBranch);
  const canMarkAttendance = isCgUser || isSecretaire || Boolean(myBranch);

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        router.replace('/login');
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', userId)
        .single();

      const role = roleData?.role ?? '';

      if (roleError || !MEMBER_ACCESS_ROLES.includes(role)) {
        router.replace('/');
        return;
      }

      setCurrentUserId(userId);
      setIsCgUser(role === 'cg');
      setIsSecretaire(role === 'secretaire');
      setMyBranch(ROLE_TO_BRANCH[role] ?? null);
      setForm(f => ({ ...f, branch: ROLE_TO_BRANCH[role] ?? '' }));
      if (!GLOBAL_VISIBILITY_ROLES.includes(role)) setHistoryBranch(ROLE_TO_BRANCH[role] ?? '');
      setReady(true);

      await fetchMembers();
      setMembersLoading(false);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('last_name', { ascending: true });

    if (!error) setMembers((data as MemberRow[]) ?? []);
  };

  // Everyone this account should treat as "their" roster — everyone for
  // cg/secretaire, otherwise just their own branch. A branch leader can also
  // see their feeder branch (via RLS), but only for the promotion panel
  // below, never as part of their own roster/attendance/export.
  const ownBranchMembers = useMemo(() => (
    canViewAllBranches ? members : members.filter(m => m.branch === myBranch)
  ), [members, canViewAllBranches, myBranch]);

  // Branch leaders always move members feeder-branch -> their own branch.
  // cg/secretaire aren't tied to a branch, so they choose both ends
  // themselves via the dropdowns in the Existing Member panel.
  const feederBranch = myBranch ? FEEDER_BRANCH[myBranch] : undefined;
  const promoteTargetBranch: Branch | '' = canViewAllBranches
    ? (existingSourceBranch ? (NEXT_BRANCH[existingSourceBranch] ?? '') : '')
    : (myBranch ?? '');
  const promoteSourceBranch: Branch | '' = canViewAllBranches
    ? existingSourceBranch
    : (feederBranch ?? '');

  // The pool of members eligible to move into promoteTargetBranch, narrowed
  // by the name search box.
  const matchingIncoming = useMemo(() => {
    if (!promoteSourceBranch) return [];
    const pool = members.filter(m => m.branch === promoteSourceBranch);
    if (!existingSearch.trim()) return pool;
    const q = existingSearch.toLowerCase();
    return pool.filter(m => `${m.first_name} ${m.last_name}`.toLowerCase().includes(q));
  }, [members, promoteSourceBranch, existingSearch]);

  // Moves a member from the source branch into promoteTargetBranch — they
  // already exist in the database, so no re-entry needed. Branch leaders'
  // target/source are fixed by their role; cg/secretaire choose both via
  // the dropdowns, so we pass the chosen target branch explicitly for them.
  const handlePromote = async (member: MemberRow) => {
    if (canViewAllBranches && !promoteTargetBranch) {
      setPromoteError('Choose a branch to add this member to first.');
      return;
    }

    setPromotingId(member.id);
    setPromoteError('');

    const { error } = await supabase.rpc('promote_member', {
      p_member_id: member.id,
      p_target_branch: canViewAllBranches ? promoteTargetBranch : null,
    });

    setPromotingId(null);
    setPromoteConfirmId(null);

    if (error) {
      setPromoteError(error.message || 'Could not add this member to that branch.');
      return;
    }

    await fetchMembers();
  };

  const filteredMembers = useMemo(() => ownBranchMembers.filter(m => {
    const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
    const matchSearch = search ? fullName.includes(search.toLowerCase()) : true;
    const matchBranch = branchFilter ? m.branch === branchFilter : true;
    return matchSearch && matchBranch;
  }), [ownBranchMembers, search, branchFilter]);

  const handleExportExcel = async () => {
    if (filteredMembers.length === 0) {
      window.alert('No members to export.');
      return;
    }

    const XLSX = await import('xlsx');

    const rows = filteredMembers.map(m => ({
      'First Name': m.first_name,
      'Last Name': m.last_name,
      'Date of Birth': isoToDMY(m.date_of_birth),
      'Age': calculateAge(m.date_of_birth),
      'Gender': m.gender,
      'Branch': branchLabel(m.branch),
      "Mother's Name": m.mother_name ?? '',
      "Father's Name": m.father_name ?? '',
      'Member Phone': m.member_phone ?? '',
      'Parent Phone': m.parent_phone ?? '',
      'Email': m.email ?? '',
      'Medical Note': m.medical_note ?? '',
      'Notes': m.notes ?? '',
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet['!cols'] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 18 }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Members');

    const fileLabel = branchFilter ? branchLabel(branchFilter) : 'All Branches';
    XLSX.writeFile(workbook, `Members - ${fileLabel} - ${todayIso()}.xlsx`);
  };

  // Roster used for the attendance sheet: branch-filtered (for cg) but not
  // name-searched, so the full list to check off is always visible.
  const attendanceRoster = useMemo(() => (
    branchFilter ? ownBranchMembers.filter(m => m.branch === branchFilter) : ownBranchMembers
  ), [ownBranchMembers, branchFilter]);

  // A member can't be marked for a session date before they joined.
  const isEligibleForDate = (member: MemberRow, date: string) => member.created_at.slice(0, 10) <= date;

  useEffect(() => {
    if (tab === 'attendance' && ready) {
      fetchAttendanceForDate(attendanceDate);
      fetchPastSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, attendanceDate, ready, attendanceRoster.length]);

  useEffect(() => {
    setAttendanceDateInput(isoToDMY(attendanceDate));
    setDateError('');
  }, [attendanceDate]);

  const commitAttendanceDate = (rawValue?: string) => {
    const parsed = parseDMY(rawValue ?? attendanceDateInput);

    if (!parsed) {
      setDateError('Enter a valid date as DD/MM/YYYY.');
      return;
    }

    if (parsed > todayIso()) {
      setDateError("You can't select a date in the future.");
      return;
    }

    setDateError('');
    setAttendanceDate(parsed);
  };

  const fetchPastSessions = async () => {
    const { data } = await supabase
      .from('attendance')
      .select('meeting_date')
      .order('meeting_date', { ascending: false });

    const unique = Array.from(new Set(((data as { meeting_date: string }[]) ?? []).map(r => r.meeting_date)));
    setPastSessions(unique);
  };

  const fetchAttendanceForDate = async (date: string) => {
    setAttendanceLoading(true);
    setAttendanceSuccess('');
    const memberIds = attendanceRoster.map(m => m.id);

    if (memberIds.length === 0) {
      setAttendanceMap({});
      setAttendanceMapOriginal({});
      setSessionAlreadySaved(false);
      setAttendanceLoading(false);
      return;
    }

    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('meeting_date', date)
      .in('member_id', memberIds);

    const rows = (data as AttendanceRow[]) ?? [];
    const map: Record<string, boolean> = {};
    rows.forEach(row => { map[row.member_id] = row.present; });
    setAttendanceMap(map);
    setAttendanceMapOriginal(map);
    setSessionAlreadySaved(rows.length > 0);
    setAttendanceLoading(false);
  };

  // Branch leaders can now edit an already-saved sheet too — the only thing
  // that ever blocks marking attendance is not having a branch (or being on
  // a role with no marking rights at all, e.g. secretaire used to be
  // read-only; both cg and secretaire have full write access now).
  const attendanceReadOnlyRole = !canMarkAttendance;
  const attendanceLocked = attendanceReadOnlyRole;
  const isLeaderEdit = sessionAlreadySaved && !isCgUser && !isSecretaire;

  const togglePresent = (memberId: string) => {
    if (attendanceLocked) return;
    setAttendanceMap(prev => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  const handleSaveAttendance = async () => {
    if (attendanceLocked) return;

    setSavingAttendance(true);
    setAttendanceSuccess('');

    const eligibleMembers = attendanceRoster.filter(m => isEligibleForDate(m, attendanceDate));

    const rows = eligibleMembers.map(m => ({
      member_id: m.id,
      meeting_date: attendanceDate,
      present: Boolean(attendanceMap[m.id]),
      marked_by: currentUserId,
    }));

    const { error } = await supabase
      .from('attendance')
      .upsert(rows, { onConflict: 'member_id,meeting_date' });

    if (!error && isLeaderEdit) {
      // Log one event per member whose value actually changed, so cg/secretaire
      // get a notification and a history record of what changed.
      const { data: userData } = await supabase.auth.getUser();
      const editorEmail = userData.user?.email ?? '';

      const changedEvents = eligibleMembers
        .filter(m => Boolean(attendanceMapOriginal[m.id]) !== Boolean(attendanceMap[m.id]))
        .map(m => ({
          member_id: m.id,
          meeting_date: attendanceDate,
          branch: m.branch,
          edited_by: currentUserId,
          edited_by_email: editorEmail,
          previous_present: Boolean(attendanceMapOriginal[m.id]),
          new_present: Boolean(attendanceMap[m.id]),
        }));

      if (changedEvents.length > 0) {
        await supabase.from('attendance_edit_events').insert(changedEvents);
      }
    }

    setSavingAttendance(false);
    if (!error) {
      setAttendanceSuccess('Attendance saved.');
      setSessionAlreadySaved(true);
      setAttendanceMapOriginal(attendanceMap);

    }
  };

  const resetForm = () => {
    setForm({ ...emptyForm, branch: (isCgUser || isSecretaire) ? '' : (myBranch ?? '') });
    setDobInput('');
    setDobError('');
    setError('');
  };

  const commitDob = (rawValue?: string) => {
    const parsed = parseDMY(rawValue ?? dobInput);

    if (!parsed) {
      setDobError('Enter a valid date as DD/MM/YYYY.');
      return;
    }

    if (parsed > todayIso()) {
      setDobError("Date of birth can't be in the future.");
      return;
    }

    setDobError('');
    setForm(f => ({ ...f, date_of_birth: parsed }));
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const branch = (isCgUser || isSecretaire) ? form.branch : myBranch;

    if (!form.first_name.trim() || !form.last_name.trim() || !form.date_of_birth || !branch) {
      setError('First name, last name, date of birth, and branch are required.');
      return;
    }

    setSaving(true);

    const { error: insertError } = await supabase.from('members').insert({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      date_of_birth: form.date_of_birth,
      gender: BRANCH_TO_GENDER[branch as Branch],
      branch,
      mother_name: form.mother_name.trim() || null,
      father_name: form.father_name.trim() || null,
      member_phone: form.member_phone.trim() || null,
      parent_phone: form.parent_phone.trim() || null,
      email: form.email.trim() || null,
      medical_note: form.medical_note.trim() || null,
      notes: form.notes.trim() || null,
      roles: ['member', ...form.roles.filter(r => memberRolesForBranch(branch).some(mr => mr.value === r))],
      added_by: currentUserId,
    });

    setSaving(false);

    if (insertError) {
      setError('Could not add member.');
      return;
    }

    resetForm();
    setIsAdding(false);
    fetchMembers();
  };

  const openMember = (member: MemberRow) => {
    setViewingMember(member);
    setConfirmDelete(false);
    setEditError('');
    setEditDobError('');
    setEditDobInput(isoToDMY(member.date_of_birth));
    setEditForm({
      first_name: member.first_name,
      last_name: member.last_name,
      date_of_birth: member.date_of_birth,
      branch: member.branch,
      mother_name: member.mother_name ?? '',
      father_name: member.father_name ?? '',
      member_phone: member.member_phone ?? '',
      parent_phone: member.parent_phone ?? '',
      email: member.email ?? '',
      medical_note: member.medical_note ?? '',
      notes: member.notes ?? '',
      roles: member.roles ?? [],
    });
  };

  const commitEditDob = (rawValue?: string) => {
    const parsed = parseDMY(rawValue ?? editDobInput);

    if (!parsed) {
      setEditDobError('Enter a valid date as DD/MM/YYYY.');
      return;
    }

    if (parsed > todayIso()) {
      setEditDobError("Date of birth can't be in the future.");
      return;
    }

    setEditDobError('');
    setEditForm(f => f && ({ ...f, date_of_birth: parsed }));
  };

  const closeMember = () => {
    setViewingMember(null);
    setEditForm(null);
    setConfirmDelete(false);
  };

  const canEditViewingMember = viewingMember
    ? (isCgUser || isSecretaire || viewingMember.added_by === currentUserId)
    : false;

  const canDeleteViewingMember = viewingMember
    ? (isCgUser || isSecretaire || viewingMember.added_by === currentUserId)
    : false;

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingMember || !editForm) return;
    setEditError('');

    if (!editForm.first_name.trim() || !editForm.last_name.trim() || !editForm.date_of_birth || !editForm.branch) {
      setEditError('First name, last name, date of birth, and branch are required.');
      return;
    }

    setEditSaving(true);

    const { error: updateError } = await supabase
      .from('members')
      .update({
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        date_of_birth: editForm.date_of_birth,
        gender: BRANCH_TO_GENDER[editForm.branch as Branch],
        branch: editForm.branch,
        mother_name: editForm.mother_name.trim() || null,
        father_name: editForm.father_name.trim() || null,
        member_phone: editForm.member_phone.trim() || null,
        parent_phone: editForm.parent_phone.trim() || null,
        email: editForm.email.trim() || null,
        medical_note: editForm.medical_note.trim() || null,
        notes: editForm.notes.trim() || null,
        roles: ['member', ...editForm.roles.filter(r => memberRolesForBranch(editForm.branch).some(mr => mr.value === r))],
        updated_at: new Date().toISOString(),
      })
      .eq('id', viewingMember.id);

    setEditSaving(false);

    if (updateError) {
      setEditError('Could not save changes.');
      return;
    }

    closeMember();
    fetchMembers();
  };

  const handleDeleteMember = async () => {
    if (!viewingMember) return;
    setEditSaving(true);
    const { error: deleteError } = await supabase.from('members').delete().eq('id', viewingMember.id);
    setEditSaving(false);

    if (deleteError) {
      setEditError('Could not delete member.');
      return;
    }

    closeMember();
    fetchMembers();
  };

  const historyRoster = useMemo(() => (
    historyBranch ? members.filter(m => m.branch === historyBranch) : []
  ), [members, historyBranch]);

  useEffect(() => {
    if (tab !== 'history') return;

    if (historyRoster.length === 0) {
      setHistoryStats({});
      return;
    }

    setHistoryStatsLoading(true);
    const memberIds = historyRoster.map(m => m.id);

    supabase
      .from('attendance')
      .select('member_id, present')
      .in('member_id', memberIds)
      .then(({ data }) => {
        const stats: Record<string, { total: number; present: number }> = {};
        ((data as { member_id: string; present: boolean }[]) ?? []).forEach(row => {
          if (!stats[row.member_id]) stats[row.member_id] = { total: 0, present: 0 };
          stats[row.member_id].total += 1;
          if (row.present) stats[row.member_id].present += 1;
        });
        setHistoryStats(stats);
        setHistoryStatsLoading(false);
      });
  }, [tab, historyRoster]);

  const openLookup = async (member: MemberRow) => {
    setLookupMember(member);
    setLookupLoading(true);
    const [{ data }, { data: editData }] = await Promise.all([
      supabase.from('attendance').select('*').eq('member_id', member.id).order('meeting_date', { ascending: false }),
      supabase.from('attendance_edit_events').select('meeting_date').eq('member_id', member.id),
    ]);
    setLookupRows((data as AttendanceRow[]) ?? []);
    setLookupEditedDates(new Set(((editData as { meeting_date: string }[]) ?? []).map(r => r.meeting_date)));
    setLookupLoading(false);
  };

  const closeLookup = () => {
    setLookupMember(null);
    setLookupRows([]);
    setLookupEditedDates(new Set());
  };

  const isAnyModalOpen = Boolean(viewingMember) || Boolean(lookupMember);

  useEffect(() => {
    if (!isAnyModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isAnyModalOpen]);

  if (!ready) {
    return (
      <main className="page-shell">
        <div className="section-header section-header--wrap">
          <h1>Members</h1>
        </div>
        <section className="panel table-panel accent-red" aria-label="Members loading">
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Name</th><th>Age</th><th>Branch</th><th>Gender</th></tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} aria-hidden="true">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j}><span className="skeleton skeleton-text" style={{ width: skeletonWidth(i, j) }} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="section-header section-header--wrap">
        <h1>Members</h1>
        <div className="toolbar">
          <div className="tab-switch">
            <button
              type="button"
              className={`tab-switch__item ${tab === 'members' ? 'tab-switch__item--active' : ''}`}
              onClick={() => setTab('members')}
            >
              Members
            </button>
            <button
              type="button"
              className={`tab-switch__item ${tab === 'attendance' ? 'tab-switch__item--active' : ''}`}
              onClick={() => setTab('attendance')}
            >
              Attendance
            </button>
            <button
              type="button"
              className={`tab-switch__item ${tab === 'history' ? 'tab-switch__item--active' : ''}`}
              onClick={() => setTab('history')}
            >
              History
            </button>
          </div>
        </div>
      </div>

      {tab === 'members' && (
        <>
          <div className="section-header section-header--wrap">
            <div className="toolbar">
              <input
                className="search-input"
                type="text"
                placeholder="Search members..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {canViewAllBranches && (
                <select className="select" value={branchFilter} onChange={e => setBranchFilter(e.target.value as Branch | '')}>
                  <option value="">All Branches</option>
                  {BRANCHES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              )}
              <button className="button button--secondary" type="button" onClick={handleExportExcel}>
                Export to Excel
              </button>
              {canAddMember && (
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() => {
                    setIsAdding(v => !v);
                    setAddMode('new');
                    setExistingSearch('');
                    setExistingSourceBranch('');
                    setPromoteConfirmId(null);
                    setPromoteError('');
                  }}
                >
                  {isAdding ? 'Close' : 'Add Member'}
                </button>
              )}
            </div>
          </div>

          {isAdding && (
            <section className="panel form-card accent-red" aria-label="Add member">
              <div className="form-card__header">
                <h2>{addMode === 'existing' ? 'Add Existing Member' : 'New Member'}</h2>
              </div>

              {(canViewAllBranches || (myBranch && feederBranch)) && (
                <div className="tab-switch" style={{ marginBottom: 16 }}>
                  <button
                    type="button"
                    className={`tab-switch__item ${addMode === 'new' ? 'tab-switch__item--active' : ''}`}
                    onClick={() => setAddMode('new')}
                  >
                    New Member
                  </button>
                  <button
                    type="button"
                    className={`tab-switch__item ${addMode === 'existing' ? 'tab-switch__item--active' : ''}`}
                    onClick={() => setAddMode('existing')}
                  >
                    Existing Member
                  </button>
                </div>
              )}

              {addMode === 'existing' && (canViewAllBranches || (myBranch && feederBranch)) ? (
                <div>
                  {canViewAllBranches ? (
                    <>
                      <p style={{ fontSize: 13, color: '#76716c', marginBottom: 12 }}>
                        Move a member up to the next branch in their progression. They keep their same record — attendance history and details included.
                      </p>
                      <div className="form-grid" style={{ marginBottom: 12 }}>
                        <label>
                          Move members up from
                          <select
                            className="select"
                            value={existingSourceBranch}
                            onChange={e => setExistingSourceBranch(e.target.value as Branch | '')}
                          >
                            <option value="">Select branch...</option>
                            {BRANCHES.filter(b => NEXT_BRANCH[b.value]).map(b => (
                              <option key={b.value} value={b.value}>{b.label}</option>
                            ))}
                          </select>
                        </label>
                        {existingSourceBranch && (
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#4a4540' }}>Moving into</span>
                            <p style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>
                              {branchLabel(NEXT_BRANCH[existingSourceBranch]!)}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <p style={{ fontSize: 13, color: '#76716c', marginBottom: 12 }}>
                      Search {branchLabel(feederBranch!)} for a member who's ready to move up into {branchLabel(myBranch!)}. They keep their same record — attendance history and details included.
                    </p>
                  )}

                  {promoteSourceBranch && (
                    <input
                      className="search-input"
                      type="text"
                      placeholder={`Search ${branchLabel(promoteSourceBranch)} by name...`}
                      value={existingSearch}
                      onChange={e => setExistingSearch(e.target.value)}
                      autoFocus={!canViewAllBranches}
                    />
                  )}
                  {promoteError && <p className="form-error">{promoteError}</p>}
                  {promoteSourceBranch && (
                    <div className="attendance-history" style={{ marginTop: 12 }}>
                      {matchingIncoming.length === 0 ? (
                        <p className="history-empty">
                          {existingSearch ? 'No matches found.' : `No members currently in ${branchLabel(promoteSourceBranch)}.`}
                        </p>
                      ) : matchingIncoming.map(m => (
                        <div className="attendance-row" key={m.id}>
                          <span>{m.first_name} {m.last_name} · {calculateAge(m.date_of_birth)}y</span>
                          {promoteConfirmId === m.id ? (
                            <span style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                              <button
                                type="button"
                                className="button button--primary button--small"
                                disabled={promotingId === m.id || (canViewAllBranches && !promoteTargetBranch)}
                                onClick={() => handlePromote(m)}
                              >
                                {promotingId === m.id ? 'Adding...' : 'Confirm'}
                              </button>
                              <button
                                type="button"
                                className="button button--secondary button--small"
                                disabled={promotingId === m.id}
                                onClick={() => setPromoteConfirmId(null)}
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="button button--secondary button--small"
                              disabled={canViewAllBranches && !promoteTargetBranch}
                              onClick={() => setPromoteConfirmId(m.id)}
                            >
                              {promoteTargetBranch ? `Add to ${branchLabel(promoteTargetBranch)}` : 'Choose a branch above'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
              <form onSubmit={handleAddMember}>
                {error && <p className="form-error">{error}</p>}
                <div className="form-grid">
                  <label>
                    First name
                    <input
                      type="text"
                      value={form.first_name}
                      onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Last name
                    <input
                      type="text"
                      value={form.last_name}
                      onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                      required
                    />
                  </label>
                </div>
                <label>
                  Branch
                  <select
                    value={(isCgUser || isSecretaire) ? form.branch : (myBranch ?? '')}
                    onChange={e => {
                      const newBranch = e.target.value as Branch;
                      setForm(f => ({
                        ...f,
                        branch: newBranch,
                        roles: f.roles.filter(r => memberRolesForBranch(newBranch).some(mr => mr.value === r)),
                      }));
                    }}
                    disabled={!(isCgUser || isSecretaire)}
                    required
                  >
                    <option value="">Select branch</option>
                    {BRANCHES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </label>
                <div className="form-grid">
                  <label>
                    Date of birth
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="DD/MM/YYYY"
                      value={dobInput}
                      onChange={e => {
                        const masked = maskDateInput(e.target.value);
                        setDobInput(masked);
                        if (masked.length === 10) commitDob(masked);
                      }}
                      onBlur={() => { if (dobInput) commitDob(); }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitDob(); } }}
                      required
                    />
                    {dobError && <span className="field-error">{dobError}</span>}
                  </label>
                  <div className="locked-category">
                    <span>Gender</span>
                    <strong style={{ textTransform: 'capitalize' }}>
                      {(() => {
                        const effectiveBranch = (isCgUser || isSecretaire) ? form.branch : myBranch;
                        return effectiveBranch ? BRANCH_TO_GENDER[effectiveBranch as Branch] : '—';
                      })()}
                    </strong>
                  </div>
                </div>
                <div className="form-grid">
                  <label>
                    Mother's name (optional)
                    <input
                      type="text"
                      value={form.mother_name}
                      onChange={e => setForm(f => ({ ...f, mother_name: e.target.value }))}
                    />
                  </label>
                  <label>
                    Father's name (optional)
                    <input
                      type="text"
                      value={form.father_name}
                      onChange={e => setForm(f => ({ ...f, father_name: e.target.value }))}
                    />
                  </label>
                </div>
                <div className="form-grid">
                  <label>
                    Member phone (optional)
                    <input
                      type="tel"
                      value={form.member_phone}
                      onChange={e => setForm(f => ({ ...f, member_phone: e.target.value }))}
                    />
                  </label>
                  <label>
                    Parent phone (optional)
                    <input
                      type="tel"
                      value={form.parent_phone}
                      onChange={e => setForm(f => ({ ...f, parent_phone: e.target.value }))}
                    />
                  </label>
                </div>
                <label>
                  Email (optional)
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </label>
                <label>
                  Medical note (optional)
                  <textarea
                    rows={3}
                    value={form.medical_note}
                    onChange={e => setForm(f => ({ ...f, medical_note: e.target.value }))}
                  />
                </label>
                <label>
                  Notes (optional)
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </label>
                <div className="role-tag-group">
                  <span className="role-tag-group__label">Additional Roles (optional)</span>
                  <p className="role-tag-group__note">Every member is automatically tagged "Member".</p>
                  <div className="role-tag-options">
                    {memberRolesForBranch((isCgUser || isSecretaire) ? form.branch : (myBranch ?? '')).map(r => (
                      <label key={r.value} className="role-tag-checkbox">
                        <input
                          type="checkbox"
                          checked={form.roles.includes(r.value)}
                          onChange={e => setForm(f => ({
                            ...f,
                            roles: e.target.checked ? [...f.roles, r.value] : f.roles.filter(x => x !== r.value),
                          }))}
                        />
                        {r.label}
                      </label>
                    ))}
                  </div>
                </div>
                <button className="button button--primary" type="submit" disabled={saving}>
                  {saving ? 'Adding...' : 'Add Member'}
                </button>
              </form>
              )}
            </section>
          )}

          <section className="panel table-panel accent-red" aria-label="Members">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Branch</th>
                    <th>Gender</th>
                    <th>Roles</th>
                    <th>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {membersLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} aria-hidden="true">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j}><span className="skeleton skeleton-text" style={{ width: skeletonWidth(i, j) }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : filteredMembers.length === 0 ? (
                    <tr><td colSpan={6} className="history-empty">No members yet.</td></tr>
                  ) : (
                    filteredMembers.map(m => (
                      <tr key={m.id} className="table-row--clickable" onClick={() => openMember(m)}>
                        <td>{m.first_name} {m.last_name}</td>
                        <td>{calculateAge(m.date_of_birth)}</td>
                        <td>{branchLabel(m.branch)}</td>
                        <td style={{ textTransform: 'capitalize' }}>{m.gender}</td>
                        <td>
                          {m.roles.length === 0 ? (
                            <span className="role-tags-empty">—</span>
                          ) : (
                            <div className="role-tags">
                              {displayableMemberRoles(m.roles).map(r => <span className="role-tag" key={r}>{memberRoleLabel(r)}</span>)}
                            </div>
                          )}
                        </td>
                        <td>
                          <button
                            className="button button--secondary button--small"
                            type="button"
                            onClick={e => { e.stopPropagation(); openLookup(m); }}
                          >
                            History
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mobile-cards" aria-label="Members mobile">
            {membersLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <article className="inventory-card panel accent-red" key={i} aria-hidden="true">
                  <div className="inventory-card__header">
                    <span className="skeleton skeleton-text" style={{ width: '45%' }} />
                    <span className="skeleton skeleton-pill" />
                  </div>
                </article>
              ))
            ) : filteredMembers.length === 0 ? (
              <p className="history-empty">No members yet.</p>
            ) : (
              filteredMembers.map(m => (
                <article className="inventory-card panel accent-red" key={m.id} onClick={() => openMember(m)}>
                  <div className="inventory-card__header">
                    <span>{m.first_name} {m.last_name}</span>
                    <span className="history-action history-action--in">{branchLabel(m.branch)}</span>
                  </div>
                  <div className="inventory-card__body">
                    <div className="inventory-card__row">
                      <span>Age</span>
                      <span>{calculateAge(m.date_of_birth)}</span>
                    </div>
                    <div className="inventory-card__row">
                      <span>Gender</span>
                      <span style={{ textTransform: 'capitalize' }}>{m.gender}</span>
                    </div>
                    {m.roles.length > 0 && (
                      <div className="role-tags">
                        {displayableMemberRoles(m.roles).map(r => <span className="role-tag" key={r}>{memberRoleLabel(r)}</span>)}
                      </div>
                    )}
                  </div>
                  <button
                    className="button button--secondary button--small"
                    type="button"
                    onClick={e => { e.stopPropagation(); openLookup(m); }}
                  >
                    View Attendance
                  </button>
                </article>
              ))
            )}
          </section>
        </>
      )}

      {tab === 'attendance' && (
        <>
          <div className="section-header section-header--wrap">
            <div className="toolbar">
              <div className="date-field">
                <input
                  className="search-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="DD/MM/YYYY"
                  value={attendanceDateInput}
                  onChange={e => {
                    const masked = maskDateInput(e.target.value);
                    setAttendanceDateInput(masked);
                    if (masked.length === 10) commitAttendanceDate(masked);
                  }}
                  onBlur={() => commitAttendanceDate()}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitAttendanceDate(); } }}
                />
                <button
                  type="button"
                  className="button button--secondary button--small"
                  onClick={() => setAttendanceDate(todayIso())}
                >
                  Today
                </button>
              </div>
              {canViewAllBranches && (
                <select className="select" value={branchFilter} onChange={e => setBranchFilter(e.target.value as Branch | '')}>
                  <option value="">All Branches</option>
                  {BRANCHES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              )}
            </div>
          </div>

          {dateError && <p className="form-error">{dateError}</p>}
          {attendanceSuccess && <p className="form-success">{attendanceSuccess}</p>}
          {attendanceReadOnlyRole ? (
            <p className="form-warning">You have view-only access to attendance.</p>
          ) : isLeaderEdit && (
            <p className="form-warning">
            </p>
          )}

          {pastSessions.length > 0 && (
            <div className="session-picker">
              {pastSessions.map(date => (
                <button
                  key={date}
                  type="button"
                  className={`session-chip ${date === attendanceDate ? 'session-chip--active' : ''}`}
                  onClick={() => setAttendanceDate(date)}
                >
                  {formatSessionDate(date)}
                </button>
              ))}
            </div>
          )}

          <section className="panel accent-red attendance-list" aria-label="Attendance sheet">
            {attendanceLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div className="attendance-row" key={i} aria-hidden="true">
                  <span className="skeleton skeleton-text" style={{ width: '40%' }} />
                  <span className="skeleton skeleton-pill" />
                </div>
              ))
            ) : attendanceRoster.length === 0 ? (
              <p className="history-empty">No members to mark attendance for.</p>
            ) : (
              attendanceRoster.map(m => {
                const eligible = isEligibleForDate(m, attendanceDate);
                return (
                  <label className={`attendance-row ${!eligible ? 'attendance-row--disabled' : ''}`} key={m.id}>
                    <span>
                      {m.first_name} {m.last_name}
                      <span className="attendance-row__branch"> — {branchLabel(m.branch)}</span>
                    </span>
                    {!eligible ? (
                      <span className="attendance-row__note">Joined {formatSessionDate(m.created_at.slice(0, 10))}</span>
                    ) : (
                      <input
                        type="checkbox"
                        checked={Boolean(attendanceMap[m.id])}
                        onChange={() => togglePresent(m.id)}
                        disabled={attendanceLocked}
                      />
                    )}
                  </label>
                );
              })
            )}
          </section>

          {attendanceRoster.length > 0 && !attendanceReadOnlyRole && (
            <div className="attendance-save-bar">
              <button
                className="button button--primary"
                type="button"
                onClick={handleSaveAttendance}
                disabled={savingAttendance || attendanceLocked}
              >
                {savingAttendance ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <>
          <div className="section-header section-header--wrap">
            <div className="toolbar">
              {canViewAllBranches ? (
                <select className="select" value={historyBranch} onChange={e => setHistoryBranch(e.target.value as Branch | '')}>
                  <option value="">Select branch</option>
                  {BRANCHES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              ) : (
                <span className="locked-category">
                  <span>Branch</span>
                  <strong>{branchLabel(historyBranch)}</strong>
                </span>
              )}
            </div>
          </div>

          <section className="panel accent-red attendance-list" aria-label="Attendance history">
            {!historyBranch ? (
              <p className="history-empty">Select a branch above to see attendance rates.</p>
            ) : historyStatsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div className="attendance-row" key={i} aria-hidden="true">
                  <span className="skeleton skeleton-text" style={{ width: '40%' }} />
                  <span className="skeleton skeleton-pill" />
                </div>
              ))
            ) : historyRoster.length === 0 ? (
              <p className="history-empty">No members in this branch yet.</p>
            ) : (
              historyRoster.map(m => {
                const stat = historyStats[m.id];
                const pct = stat && stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : null;
                return (
                  <div className="attendance-row attendance-row--static" key={m.id} onClick={() => openLookup(m)}>
                    <span>{m.first_name} {m.last_name}</span>
                    <span className="attendance-rate">
                      {pct === null ? 'No data yet' : `${pct}% attendance rate`}
                    </span>
                  </div>
                );
              })
            )}
          </section>
        </>
      )}

      {viewingMember && editForm && (
        <div className="history-overlay" onClick={closeMember}>
          <div className="history-modal" onClick={e => e.stopPropagation()}>
            <div className="history-modal__header">
              <div>
                <p className="eyebrow">Member</p>
                <h2>{viewingMember.first_name} {viewingMember.last_name}</h2>
              </div>
              <button className="history-close" type="button" onClick={closeMember}>✕</button>
            </div>
            <div className="history-modal__body">
              {editError && <p className="form-error">{editError}</p>}
              <form onSubmit={handleUpdateMember}>
                <div className="form-grid">
                  <label>
                    First name
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={e => setEditForm(f => f && ({ ...f, first_name: e.target.value }))}
                      disabled={!canEditViewingMember}
                      required
                    />
                  </label>
                  <label>
                    Last name
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={e => setEditForm(f => f && ({ ...f, last_name: e.target.value }))}
                      disabled={!canEditViewingMember}
                      required
                    />
                  </label>
                </div>
                <label>
                  Branch
                  <select
                    value={editForm.branch}
                    onChange={e => {
                      const newBranch = e.target.value as Branch;
                      setEditForm(f => f && ({
                        ...f,
                        branch: newBranch,
                        roles: f.roles.filter(r => memberRolesForBranch(newBranch).some(mr => mr.value === r)),
                      }));
                    }}
                    disabled={!canEditViewingMember || !(isCgUser || isSecretaire)}
                    required
                  >
                    {BRANCHES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </label>
                <div className="form-grid">
                  <label>
                    Date of birth
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="DD/MM/YYYY"
                      value={editDobInput}
                      onChange={e => {
                        const masked = maskDateInput(e.target.value);
                        setEditDobInput(masked);
                        if (masked.length === 10) commitEditDob(masked);
                      }}
                      onBlur={() => { if (editDobInput) commitEditDob(); }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitEditDob(); } }}
                      disabled={!canEditViewingMember}
                      required
                    />
                    {editDobError && <span className="field-error">{editDobError}</span>}
                  </label>
                  <div className="locked-category">
                    <span>Gender</span>
                    <strong style={{ textTransform: 'capitalize' }}>
                      {editForm.branch ? BRANCH_TO_GENDER[editForm.branch as Branch] : '—'}
                    </strong>
                  </div>
                </div>
                <div className="form-grid">
                  <label>
                    Mother's name
                    <input
                      type="text"
                      value={editForm.mother_name}
                      onChange={e => setEditForm(f => f && ({ ...f, mother_name: e.target.value }))}
                      disabled={!canEditViewingMember}
                    />
                  </label>
                  <label>
                    Father's name
                    <input
                      type="text"
                      value={editForm.father_name}
                      onChange={e => setEditForm(f => f && ({ ...f, father_name: e.target.value }))}
                      disabled={!canEditViewingMember}
                    />
                  </label>
                </div>
                <div className="form-grid">
                  <label>
                    Member phone
                    <input
                      type="tel"
                      value={editForm.member_phone}
                      onChange={e => setEditForm(f => f && ({ ...f, member_phone: e.target.value }))}
                      disabled={!canEditViewingMember}
                    />
                  </label>
                  <label>
                    Parent phone
                    <input
                      type="tel"
                      value={editForm.parent_phone}
                      onChange={e => setEditForm(f => f && ({ ...f, parent_phone: e.target.value }))}
                      disabled={!canEditViewingMember}
                    />
                  </label>
                </div>
                <label>
                  Email
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm(f => f && ({ ...f, email: e.target.value }))}
                    disabled={!canEditViewingMember}
                  />
                </label>
                <label>
                  Medical note
                  <textarea
                    rows={3}
                    value={editForm.medical_note}
                    onChange={e => setEditForm(f => f && ({ ...f, medical_note: e.target.value }))}
                    disabled={!canEditViewingMember}
                  />
                </label>
                <label>
                  Notes
                  <textarea
                    rows={3}
                    value={editForm.notes}
                    onChange={e => setEditForm(f => f && ({ ...f, notes: e.target.value }))}
                    disabled={!canEditViewingMember}
                  />
                </label>
                <div className="role-tag-group">
                  <span className="role-tag-group__label">Additional Roles</span>
                  <p className="role-tag-group__note">Every member is automatically tagged "Member".</p>
                  <div className="role-tag-options">
                    {memberRolesForBranch(editForm.branch).map(r => (
                      <label key={r.value} className="role-tag-checkbox">
                        <input
                          type="checkbox"
                          checked={editForm.roles.includes(r.value)}
                          disabled={!canEditViewingMember}
                          onChange={e => setEditForm(f => f && ({
                            ...f,
                            roles: e.target.checked ? [...f.roles, r.value] : f.roles.filter(x => x !== r.value),
                          }))}
                        />
                        {r.label}
                      </label>
                    ))}
                  </div>
                </div>

                {canEditViewingMember && (
                  <div className="form-actions">
                    <button className="button button--primary" type="submit" disabled={editSaving}>
                      {editSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    {canDeleteViewingMember && (
                      !confirmDelete ? (
                        <button
                          className="button button--danger"
                          type="button"
                          onClick={() => setConfirmDelete(true)}
                        >
                          Delete Member
                        </button>
                      ) : (
                        <>
                          <span className="form-confirm-text">Delete this member permanently?</span>
                          <button
                            className="button button--danger"
                            type="button"
                            onClick={handleDeleteMember}
                            disabled={editSaving}
                          >
                            Confirm Delete
                          </button>
                          <button
                            className="button button--secondary"
                            type="button"
                            onClick={() => setConfirmDelete(false)}
                          >
                            Cancel
                          </button>
                        </>
                      )
                    )}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {lookupMember && (
        <div className="history-overlay" onClick={closeLookup}>
          <div className="history-modal" onClick={e => e.stopPropagation()}>
            <div className="history-modal__header">
              <div>
                <p className="eyebrow">Attendance History</p>
                <h2>{lookupMember.first_name} {lookupMember.last_name}</h2>
              </div>
              <button className="history-close" type="button" onClick={closeLookup}>✕</button>
            </div>
            <div className="history-modal__body">
              <AttendanceSummary rows={lookupRows} loading={lookupLoading} editedDates={lookupEditedDates} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}