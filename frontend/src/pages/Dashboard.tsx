import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>IPTV Player</h1>
        <div style={styles.userInfo}>
          <span style={styles.username}>Welcome, {user?.username}!</span>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Your Playlists</h2>
          <p style={styles.emptyMessage}>Manage your M3U playlists and start watching your favorite channels!</p>
          <button
            onClick={() => navigate('/playlists')}
            style={styles.addButton}
          >
            Manage Playlists
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f0f23',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    backgroundColor: '#1a1a2e',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  title: {
    color: '#00d4ff',
    fontSize: '1.5rem',
    margin: 0,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  username: {
    color: '#ffffff',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#ff4444',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  content: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  card: {
    backgroundColor: '#1a1a2e',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
  },
  cardTitle: {
    color: '#ffffff',
    marginBottom: '1rem',
  },
  emptyMessage: {
    color: '#b0b0b0',
    marginBottom: '1rem',
  },
  addButton: {
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#00d4ff',
    color: '#0f0f23',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};
