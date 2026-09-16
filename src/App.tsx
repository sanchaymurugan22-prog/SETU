import type { ComponentType } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { HomeRedirect, RequireRole } from './auth/RequireRole'
import { GapMapSection } from './consoles/admin/GapMapSection'
import { ConsoleLayout } from './consoles/ConsoleLayout'
import { CONSOLES } from './consoles/consoles'
import { SectionPlaceholder } from './consoles/SectionPlaceholder'
import { LoginPage } from './pages/LoginPage'
import { SplashGate } from './pages/SplashScreen'

/** Sections that are built. Anything absent still renders its placeholder. */
const SECTION_VIEWS: Record<string, ComponentType> = {
  'admin/gap-map': GapMapSection,
}

export default function App() {
  return (
    <AuthProvider>
      <SplashGate>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<HomeRedirect />} />

            {Object.values(CONSOLES).map((definition) => (
              <Route
                key={definition.role}
                path={definition.basePath}
                element={
                  <RequireRole role={definition.role}>
                    <ConsoleLayout definition={definition} />
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
                      element={View ? <View /> : <SectionPlaceholder section={section} />}
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
    </AuthProvider>
  )
}
