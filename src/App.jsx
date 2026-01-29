import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Upload from './pages/Upload'
import History from './pages/History'
import Settings from './pages/Settings'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/upload"
            element={
              <Layout>
                <Upload />
              </Layout>
            }
          />
          <Route
            path="/history"
            element={
              <Layout>
                <History />
              </Layout>
            }
          />
          <Route
            path="/settings"
            element={
              <Layout>
                <Settings />
              </Layout>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
