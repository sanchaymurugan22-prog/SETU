import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { useSignOut } from '../auth/useSignOut'
import { SetuMark } from '../components/SetuMark'

/** Shown to a signed-in account that cannot enter any console. */
export function AccessProblemPage() {
  const { t } = useTranslation()
  const { state } = useAuth()
  const signOut = useSignOut()

  useEffect(() => {
    document.title = `SETU`
  }, [])

  let title: string
  let body: ReactNode
  switch (state.status) {
    case 'no-profile':
      title = t('access.noConsoleTitle')
      body = (
        <>
          <p>{t('access.noConsoleBody', { email: state.user.email ?? '' })}</p>
          <dl className="notice-details">
            <dt>{t('access.uidLabel')}</dt>
            <dd>
              <code>{state.user.uid}</code>
            </dd>
          </dl>
        </>
      )
      break
    case 'inactive':
      title = t('access.inactiveTitle')
      body = <p>{t('access.inactiveBody', { email: state.staff.email })}</p>
      break
    case 'error':
      title = t('access.errorTitle')
      body = (
        <>
          <p>{state.message}</p>
          <p className="muted">{t('access.errorHint')}</p>
        </>
      )
      break
    default:
      return null
  }

  return (
    <div className="notice-page">
      <div className="notice-card">
        <div className="notice-bar">
          <SetuMark size={30} tone="onDark" />
          <span className="notice-wordmark">SETU</span>
        </div>
        <div className="notice-content">
          <h1>{title}</h1>
          {body}
          <button type="button" className="btn btn-primary" onClick={() => void signOut()}>
            {t('common.signOut')}
          </button>
        </div>
      </div>
    </div>
  )
}
