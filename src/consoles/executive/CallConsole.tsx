import { CallSessionProvider, type CallSessionProviderProps } from './CallSessionProvider'
import { ReportReviewModal } from './ReportReviewModal'
import '../../styles/call-console.css'

/**
 * Wraps the Call Console so the session — and the mandatory report modal — outlive
 * moving between Waiting Calls and Completed Calls.
 */
export function CallConsole({ children, ...session }: CallSessionProviderProps) {
  return (
    <CallSessionProvider {...session}>
      {children}
      <ReportReviewModal />
    </CallSessionProvider>
  )
}
