import type { Role } from '../auth/roles'

export interface ConsoleSection {
  /** URL segment under the console's base path. */
  path: string
  title: string
  /** Sidebar group heading. */
  group: string
  /** What the section will do (SETU-SPEC.md) — shown on its placeholder until built. */
  summary: string
}

export interface ConsoleDefinition {
  role: Role
  basePath: string
  title: string
  /** Two-line label beside the logo in the sidebar. */
  badge: [string, string]
  sections: ConsoleSection[]
}

export const CONSOLES: Record<Role, ConsoleDefinition> = {
  executive: {
    role: 'executive',
    basePath: '/executive',
    title: 'Call Console',
    badge: ['Call', 'console'],
    sections: [
      {
        path: 'waiting',
        title: 'Waiting Calls',
        group: 'Sections',
        summary:
          'Queue of escalated calls (reason, wait time, position — no identity) → accept → active call with the editable beneficiary record → mandatory report review and send.',
      },
      {
        path: 'completed',
        title: 'Completed Calls',
        group: 'Sections',
        summary: 'AI reports from calls you handled. Beneficiary identity stays hidden.',
      },
      {
        path: 'ai-demo',
        title: 'AI Demo Call',
        group: 'Demo',
        summary: "The beneficiary's own call with SETU, for demonstration. In service they reach it by phone.",
      },
    ],
  },
  resourcePerson: {
    role: 'resourcePerson',
    basePath: '/resource-person',
    title: 'Resource Person Console',
    badge: ['Resource', 'person'],
    sections: [
      {
        path: 'beneficiaries',
        title: 'Beneficiaries',
        group: 'Trainer',
        summary:
          'Your enrolled trainees: per-session attendance, status updates with a required description, completion recommendations, and Flag to Admin.',
      },
      {
        path: 'materials',
        title: 'Course Materials',
        group: 'Trainer',
        summary: 'Schedule and timings (these open attendance sheets), location or online link, and course materials.',
      },
      {
        path: 'sessions',
        title: 'Sessions',
        group: 'Trainer',
        summary: 'Every session taken, by date, with the register and the attendance behind it.',
      },
      {
        path: 'waiting',
        title: 'Waiting Calls',
        group: 'Expert',
        summary: 'Callback cases transferred from the Call Console, split into course-related and common-related.',
      },
      {
        path: 'completed',
        title: 'Completed Calls',
        group: 'Expert',
        summary: 'AI reports from your own expert calls, course-related and common-related. Identity hidden.',
      },
      {
        path: 'milestones',
        title: 'Milestones',
        group: 'Expert',
        summary: 'Trainees you trained to successful completion, with their completion reports.',
      },
    ],
  },
  admin: {
    role: 'admin',
    basePath: '/admin',
    title: 'Admin Console',
    badge: ['Admin', 'console'],
    sections: [
      {
        path: 'beneficiaries',
        title: 'Beneficiaries',
        group: 'Sections',
        summary: 'Every beneficiary with full details, the AI-flagged / stalled filter, and each full journey.',
      },
      {
        path: 'call-executives',
        title: 'Call Executives',
        group: 'Sections',
        summary: 'All call executives: add new accounts, view activity, deactivate.',
      },
      {
        path: 'resource-persons',
        title: 'Resource Persons',
        group: 'Sections',
        summary: 'All resource persons: add new accounts and assign them to courses and centres.',
      },
      {
        path: 'calls',
        title: 'Calls',
        group: 'Sections',
        summary: 'Executive, resource person and AI calls, with the automation funnel.',
      },
      {
        path: 'follow-ups',
        title: 'Follow-up Reports',
        group: 'Sections',
        summary: 'Every automated follow-up call per beneficiary: count, purpose, outcome.',
      },
      {
        path: 'courses-centres',
        title: 'Courses & Centres',
        group: 'Sections',
        summary: 'Courses and centres with enrolled / allotted / waiting counts, add course, add centre, auto-allotment.',
      },
      {
        path: 'flags',
        title: 'Admin Flags',
        group: 'Sections',
        summary: 'Cases flagged by resource persons: take action and assign officers.',
      },
      {
        path: 'gap-map',
        title: 'Opportunity Gap Map',
        group: 'Sections',
        summary: 'Block-level demand versus availability on a live map, plus enrollment, completion and placement analytics.',
      },
    ],
  },
}

export function homePathFor(role: Role): string {
  return CONSOLES[role].basePath
}
