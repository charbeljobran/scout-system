export type Gender = 'male' | 'female';

export type Branch =
  | 'louveteaux'
  | 'louvettes'
  | 'eclaireurs'
  | 'eclaireuses'
  | 'pionnieres'
  | 'routiers';

// Scouting branches are gender-specific — gender is derived from branch,
// never chosen independently.
export const BRANCH_TO_GENDER: Record<Branch, Gender> = {
  louveteaux: 'male',
  louvettes: 'female',
  eclaireurs: 'male',
  eclaireuses: 'female',
  pionnieres: 'female',
  routiers: 'male',
};

export const BRANCHES: { value: Branch; label: string }[] = [
  { value: 'louveteaux', label: 'Louveteaux' },
  { value: 'louvettes', label: 'Louvettes' },
  { value: 'eclaireurs', label: 'Eclaireurs' },
  { value: 'eclaireuses', label: 'Eclaireuses' },
  { value: 'pionnieres', label: 'Pionnières' },
  { value: 'routiers', label: 'Routiers' },
];

// Maps a branch-leader role to the single branch they're allowed to manage.
// Note: the role is singular ("routier") while the branch is plural ("routiers").
export const ROLE_TO_BRANCH: Record<string, Branch> = {
  louveteaux: 'louveteaux',
  louvettes: 'louvettes',
  eclaireurs: 'eclaireurs',
  eclaireuses: 'eclaireuses',
  pionnieres: 'pionnieres',
  routier: 'routiers',
};

export const GLOBAL_VISIBILITY_ROLES = ['cg', 'secretaire'];

// Everyone allowed to see the Members/Attendance feature at all.
export const MEMBER_ACCESS_ROLES = [...GLOBAL_VISIBILITY_ROLES, ...Object.keys(ROLE_TO_BRANCH)];

export function branchLabel(branch: string): string {
  return BRANCHES.find(b => b.value === branch)?.label ?? branch;
}

// In-troop function/position tags a member can hold (separate from login
// access roles). 'member' is the mandatory baseline every member always
// has, regardless of branch. Everything else is optional and additive.
export type MemberRole = 'member' | 'animateur' | 'gerant' | 'intendant' | 'secretaire' | 'cp' | 'sp' | 'ce' | 'si' | 'se' | 'photographe';

const NON_CUB_BRANCHES: Branch[] = ['eclaireurs', 'eclaireuses', 'routiers', 'pionnieres'];

export const ALL_MEMBER_ROLES: { value: MemberRole; label: string; branches?: Branch[] }[] = [
  { value: 'member', label: 'Member' },
  { value: 'animateur', label: 'Animateur', branches: NON_CUB_BRANCHES },
  { value: 'gerant', label: 'Gérant', branches: NON_CUB_BRANCHES },
  { value: 'intendant', label: 'Intendant', branches: NON_CUB_BRANCHES },
  { value: 'secretaire', label: 'Secrétaire', branches: NON_CUB_BRANCHES },
  { value: 'photographe', label: 'Photographe', branches: NON_CUB_BRANCHES },
  { value: 'cp', label: 'CP', branches: ['eclaireurs', 'eclaireuses'] },
  { value: 'sp', label: 'SP', branches: ['eclaireurs', 'eclaireuses'] },
  { value: 'ce', label: 'CE', branches: ['routiers', 'pionnieres'] },
  { value: 'si', label: 'SI', branches: ['louveteaux', 'louvettes'] },
  { value: 'se', label: 'SE', branches: ['louveteaux', 'louvettes'] },
];

// Optional, selectable role tags for a given branch — excludes 'member',
// since that one is mandatory and always applied automatically, not chosen.
export function memberRolesForBranch(branch: Branch | ''): typeof ALL_MEMBER_ROLES {
  return ALL_MEMBER_ROLES.filter(r => r.value !== 'member' && (!r.branches || (branch && r.branches.includes(branch as Branch))));
}

export function memberRoleLabel(role: string): string {
  return ALL_MEMBER_ROLES.find(r => r.value === role)?.label ?? role;
}

// 'member' is the mandatory baseline, always stored — but only worth
// showing in the UI when it's the ONLY tag a member has. Once they have
// an actual function/position, that's what should be displayed.
export function displayableMemberRoles(roles: string[]): string[] {
  return roles.length > 1 ? roles.filter(r => r !== 'member') : roles;
}

export function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Formats raw keystrokes into a "DD/MM/YYYY" mask as the user types digits,
// stripping anything that isn't a digit and auto-inserting the slashes.
export function maskDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  let out = day;
  if (month) out += `/${month}`;
  if (year) out += `/${year}`;
  return out;
}

// Parses a "DD/MM/YYYY" string into an ISO "YYYY-MM-DD" string, or null if invalid.
export function parseDMY(input: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(input.trim());
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  const date = new Date(year, month - 1, day);
  const isRealDate = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  if (!isRealDate) return null;

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

// Formats an ISO "YYYY-MM-DD" string as "DD/MM/YYYY" for display/entry.
export function isoToDMY(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}