import type { ComponentType } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { HomeRedirect, RequireRole } from './auth/RequireRole'
import { BeneficiariesSection } from './consoles/admin/BeneficiariesSection'
import { CallConsole } from './consoles/executive/CallConsole'
import { CompletedCallsSection } from './consoles/executive/CompletedCallsSection'
import { WaitingCallsSection } from './consoles/executive/WaitingCallsSection'
import { GapMapSection } from './consoles/admin/GapMapSection'
import { ConsoleLayout } from './consoles/ConsoleLayout'
import { CONSOLES } from './consoles/consoles'
import { SectionPlaceholder } from './consoles/SectionPlaceholder'
import { LanguageProvider } from './language/LanguageProvider'
import { LanguageScreen } from './pages/LanguageScreen'
import { LoginPage } from './pages/LoginPage'
import { SplashGate } from './pages/SplashScreen'

/** Sections that are built. Anything absent still renders its placeholder. */
const SECTION_VIEWS: Record<string, ComponentType> = {
  'admin/beneficiaries': BeneficiariesSection,
  'admin/gap-map': GapMapSection,
  'executive/waiting': WaitingCallsSection,
  'executive/completed': CompletedCallsSection,
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <SplashGate>
          <BrowserRouter>
            <Routes>
              <Route path="/language" element={<LanguageScreen />} />
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
