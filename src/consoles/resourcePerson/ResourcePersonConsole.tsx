import type { ReactNode } from 'react'
import { loadResourcePersonCompleted, loadResourcePersonQueue } from '../../data/jharkhandCalls'
import { CallConsole } from '../executive/CallConsole'
import { TrainerProvider } from './TrainerProvider'

/**
 * The Resource Person console: trainer state plus the same call session the Call Console
 * uses, pointed at the cases transferred to this person. Transfer is off — a case that
 * reached the expert is finished here.
 */
export function ResourcePersonConsole({ children }: { children: ReactNode }) {
  return (
    <TrainerProvider>
      <CallConsole
        queueSource={loadResourcePersonQueue}
        completedSource={loadResourcePersonCompleted}
        refPrefix="RP"
        allowTransfer={false}
      >
        {children}
      </CallConsole>
    </TrainerProvider>
  )
}
