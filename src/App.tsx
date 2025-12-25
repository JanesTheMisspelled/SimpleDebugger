import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { LiveDebug } from './components/LiveDebug';
import { RunHistoryPage } from './components/RunHistoryPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="container full-width">
        <nav className="nav-bar">
            <Link to="/" className="nav-link">Live Debug</Link>
            <Link to="/history" className="nav-link">Run History</Link>
        </nav>
        
        <div style={{ flex: 1, overflow: 'hidden' }}>
            <Routes>
                <Route path="/" element={<LiveDebug />} />
                <Route path="/history" element={<RunHistoryPage />} />
            </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
