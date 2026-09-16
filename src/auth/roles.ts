export const ROLES = ['executive', 'resourcePerson', 'admin'] as const

export type Role = (typeof ROLES)[number]

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

/** A signed-in official, read from users/{uid}. */
export interface StaffUser {
  userId: string
  name: string
  email: string
  role: Role
  isActive: boolean
  languages: string[]
}

export const ROLE_LABEL: Record<Role, string> = {
  executive: 'Call Executive',
  resourcePerson: 'Resource Person',
  admin: 'Administrator',
}
