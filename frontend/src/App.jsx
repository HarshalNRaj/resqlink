
import { useState } from 'react'
import Auth from './Auth'
import Dashboard from './Dashboard'
import AdminDashboard from './AdminDashboard'

function getSavedUser() {
  try {
    const saved =
      localStorage.getItem('relink_user') ||
      localStorage.getItem('resqlink_user') ||
      localStorage.getItem('user')

    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(getSavedUser)

  function handleLogin(user) {
    localStorage.setItem('relink_user', JSON.stringify(user))
    setCurrentUser(user)
  }

  function handleLogout() {
    localStorage.removeItem('relink_user')
    localStorage.removeItem('resqlink_user')
    localStorage.removeItem('user')
    localStorage.removeItem('relink_token')
    localStorage.removeItem('resqlink_token')
    localStorage.removeItem('token')

    setCurrentUser(null)
  }

  if (!currentUser) {
    return (
      <Auth
        initialMode="signin"
        onLogin={handleLogin}
        onClose={() => {}}
      />
    )
  }

  if (currentUser.role === 'admin') {
    return <AdminDashboard user={currentUser} onLogout={handleLogout} />
  }

  return (
    <Dashboard
      user={currentUser}
      onLogout={handleLogout}
      onUserUpdated={handleLogin}
    />
  )
}
