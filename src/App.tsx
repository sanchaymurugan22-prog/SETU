import type { ComponentType } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { HomeRedirect, RequireRole } from './auth/RequireRole'
import { AdminFlagsSection } from './consoles/admin/AdminFlagsSection'
import { BeneficiariesSection } from './consoles/admin/BeneficiariesSection'
import { CallExecutivesSection } from './consoles/admin/CallExecutivesSection'
import { CallsSection } from './consoles/admin/CallsSection'
import { CoursesCentresSection } from './consoles/admin/CoursesCentresSection'
import { FollowUpsSection } from './consoles/admin/FollowUpsSection'
import { ResourcePersonsSection } from './consoles/admin/ResourcePersonsSection'
import { CallConsole } from './consoles/executive/CallConsole'
import { CompletedCallsSection } from './consoles/executive/CompletedCallsSection'
import { WaitingCallsSection } from './consoles/executive/WaitingCallsSection'
import { GapMapSection } from './consoles/admin/GapMapSection'
import { CourseMaterialsSection } from './consoles/resourcePerson/CourseMaterialsSection'
import { ExpertCompletedSection, ExpertWaitingSection } from './consoles/resourcePerson/ExpertCallSections'
import { MilestonesSection } from './consoles/resourcePerson/MilestonesSection'
import { ResourcePersonConsole } from './consoles/resourcePerson/ResourcePersonConsole'
import { SessionsSection } from './consoles/resourcePerson/SessionsSection'
import { TraineesSection } from './consoles/resourcePerson/TraineesSection'
import { ConsoleLayout } from './consoles/ConsoleLayout'
import { CONSOLES } from './consoles/consoles'
import { SectionPlaceholder } from './consoles/SectionPlaceholder'
import { LanguageProvider } from './language/LanguageProvider'
import { LanguageScreen } from './pages/LanguageScreen'
import { LoginPage } from './pages/LoginPage'
import { SplashGate } from './pages/SplashScreen'
import { VoiceCallPage } from './pages/VoiceCallPage'

/** Sections that are built. Anything absent still renders its placeholder. */
const SECTION_VIEWS: Record<string, ComponentType> = {
  'admin/beneficiaries': BeneficiariesSection,
  'admin/call-executives': CallExecutivesSection,
  'admin/resource-persons': ResourcePersonsSection,
  'admin/calls': CallsSection,
  'admin/follow-ups': FollowUpsSection,
  'admin/courses-centres': CoursesCentresSection,
  'admin/flags': AdminFlagsSection,
  'admin/gap-map': GapMapSection,
  'executive/waiting': WaitingCallsSection,
  'executive/completed': CompletedCallsSection,
  'resourcePerson/beneficiaries': TraineesSection,
  'resourcePerson/materials': CourseMaterialsSection,
  'resourcePerson/sessions': SessionsSection,
  'resourcePerson/waiting': ExpertWaitingSection,
  'resourcePerson/completed': ExpertCompletedSection,
  'resourcePerson/milestones': MilestonesSection,
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <SplashGate>
          <BrowserRouter>
            <Routes>
              <Route path="/language" element={<LanguageScreen />} />
              {/* The beneficiary side: nobody signs in to call SETU. */}
              <Route path="/call" element={<VoiceCallPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<HomeRedirect />} />

              {Object.values(CONSOLES).map((definition) => (
                <Route
                  key={definition.role}
                  path={definition.basePath}
                  element={
                    <RequireRole role={definition.role}>
                      {definition.role === 'executive' ? (
                        // The Call Console needs a session that outlives section changes.
                        <CallConsole>
                          <ConsoleLayout definition={definition} />
                        </CallConsole>
                      ) : definition.role === 'resourcePerson' ? (
                        <ResourcePersonConsole>
                          <ConsoleLayout definition={definition} />
                        </ResourcePersonConsole>
                      ) : (
                        <ConsoleLayout definition={definition} />
                      )}
                    </RequireRole>
                  }
                >
                  <Route index element={<Navigate to={definition.sections[0]!.path} replace />} />
                  {definition.sections.map((section) => {
                    const View = SECTION_VIEWS[`${definition.role}/${section.path}`]
                    return (
                      <Route
                        key={section.path}
                        path={section.path}
                        element={View ? <View /> : <SectionPlaceholder role={definition.role} section={section} />}
                      />
                    )
                  })}
                  <Route path="*" element={<Navigate to={definition.basePath} replace />} />
                </Route>
              ))}

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SplashGate>
      </LanguageProvider>
    </AuthProvider>
  )
}
