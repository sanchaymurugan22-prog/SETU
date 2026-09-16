import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ROLE_LABEL } from '../auth/roles'
import { SetuMark } from '../components/SetuMark'
import type { ConsoleDefinition } from './consoles'

function initials(name: string): string {
  const letters = name
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase())
  return (letters.length > 1 ? letters[0]! + letters[letters.length - 1]! : (letters[0] ?? '?'))
}

export function ConsoleLayout({ definition }: { definition: ConsoleDefinition }) {
  const { state, signOut } = useAuth()
  // RequireRole only renders this for a ready official.
  if (state.status !== 'ready') return null
  const { staff } = state
  const groups = [...new Set(definition.sections.map((section) => section.group))]

  return (
    <div className="console">
      <nav className="console-nav" aria-label={`${definition.title} sections`}>
        <div className="console-brand">
          <SetuMark size={34} tone="onDark" />
          <span className="console-wordmark">SETU</span>
          <span className="console-badge">
            {definition.badge[0]}
            <br />
            {definition.badge[1]}
          </span>
        </div>

        {groups.map((group) => (
          <div className="console-group" key={group}>
            <span className="console-group-label">{group}</span>
            {definition.sections
              .filter((section) => section.group === group)
              .map((section) => (
                <NavLink key={section.path} to={section.path} className="console-link">
                  {section.title}
                </NavLink>
              ))}
          </div>
        ))}

        <div className="console-user">
          <div className="console-user-row">
            <span className="console-avatar" aria-hidden="true">
              {initials(staff.name)}
            </span>
            <div className="console-user-text">
              <span className="console-user-name">{staff.name}</span>
              <span className="console-user-role">
                {ROLE_LABEL[staff.role]}
                {staff.languages.length > 0 && ` · ${staff.languages.join(', ')}`}
              </span>
            </div>
          </div>
          <button type="button" className="console-signout" onClick={() => void signOut()}>
            Sign out
          </button>
          <span className="console-ministry">
            Ministry of Social Justice
            <br />
            and Empowerment
          </span>
        </div>
      </nav>

      <main className="console-main">
        <Outlet />
      </main>
    </div>
  )
}
