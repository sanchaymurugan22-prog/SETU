/** Rendered before Firebase loads when required env vars are missing. */
export function ConfigErrorPage({ missing }: { missing: string[] }) {
  return (
    <div className="notice-page">
      <div className="notice-card">
        <div className="notice-content">
          <h1>Firebase is not configured</h1>
          <p>
            Copy <code>.env.example</code> to <code>.env</code>, fill in the Firebase web config, and restart the dev
            server. Missing:
          </p>
          <ul>
            {missing.map((key) => (
              <li key={key}>
                <code>{key}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
