import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { HomeRedirect, RequireRole } from './auth/RequireRole'
import { ConsoleLayout } from './consoles/ConsoleLayout'
import { CONSOLES } from './consoles/consoles'
import { SectionPlaceholder } from './consoles/SectionPlaceholder'
import { LoginPage } from './pages/LoginPage'
import { SplashGate } from './pages/SplashScreen'

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
                {definition.sections.map((section) => (
                  <Route key={section.path} path={section.path} element={<SectionPlaceholder section={section} />} />
                ))}
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
