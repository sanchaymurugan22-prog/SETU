import { CompletedCallsSection } from '../executive/CompletedCallsSection'
import { WaitingCallsSection } from '../executive/WaitingCallsSection'

/** The Call Console flow, re-used for the cases transferred to this resource person. */
export function ExpertWaitingSection() {
  return (
    <WaitingCallsSection
      titleKey="sections.resourcePerson.waiting.title"
      subtitleKey="resourcePerson.calls.waitingSubtitle"
    />
  )
}

export function ExpertCompletedSection() {
  return (
    <CompletedCallsSection
      titleKey="sections.resourcePerson.completed.title"
      scopeValueKey="resourcePerson.calls.scopeValue"
    />
  )
}
