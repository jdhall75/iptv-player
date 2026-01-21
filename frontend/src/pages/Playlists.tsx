import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { Playlist } from '../types';

export default function Playlists() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', m3u_url: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [favoritesCardHover, setFavoritesCardHover] = useState(false);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      setError('');

      // Load playlists
      const response = await apiService.getPlaylists();
      if (response.success && response.playlists) {
        setPlaylists(response.playlists);
      } else {
        setError(response.error || 'Failed to load playlists');
      }

      // Load favorites count
      const favoritesResponse = await apiService.getFavorites();
      if (favoritesResponse.success && favoritesResponse.favorites) {
        setFavoritesCount(favoritesResponse.favorites.length);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const { name, m3u_url } = formData;

      if (!name.trim() || !m3u_url.trim()) {
        setFormError('Name and M3U URL are required');
        setSubmitting(false);
        return;
      }

      let response;
      if (editingId) {
        response = await apiService.updatePlaylist(editingId, name, m3u_url);
      } else {
        response = await apiService.createPlaylist(name, m3u_url);
      }

      if (response.success) {
        setShowForm(false);
        setEditingId(null);
        setFormData({ name: '', m3u_url: '' });
        await loadPlaylists();
      } else {
        setFormError(response.error || 'Failed to save playlist');
      }
    } catch (err) {
      setFormError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (playlist: Playlist) => {
    setEditingId(playlist.id);
    setFormData({ name: playlist.name, m3u_url: playlist.m3u_url });
    setShowForm(true);
    setFormError('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) {
      return;
    }

    try {
      const response = await apiService.deletePlaylist(id);
      if (response.success) {
        await loadPlaylists();
      } else {
        alert(response.error || 'Failed to delete playlist');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', m3u_url: '' });
    setFormError('');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <div style={styles.pageHeader}>
          <h2 style={styles.pageTitle}>My Playlists</h2>
          {!showForm && (
            <button onClick={() => setShowForm(true)} style={styles.addButton}>
              + Add Playlist
            </button>
          )}
        </div>

        {showForm && (
          <div style={styles.formCard}>
            <h3 style={styles.formTitle}>{editingId ? 'Edit Playlist' : 'Add New Playlist'}</h3>
            <form onSubmit={handleSubmit}>
              {formError && (
                <div style={styles.errorMessage}>
                  {formError}
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Playlist Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter playlist name"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>M3U URL *</label>
                <input
                  type="text"
                  value={formData.m3u_url}
                  onChange={(e) => setFormData({ ...formData, m3u_url: e.target.value })}
                  placeholder="https://example.com/playlist.m3u"
                  style={styles.input}
                />
                <small style={styles.hint}>Must start with http:// or https://</small>
              </div>

              <div style={styles.formActions}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    ...styles.submitButton,
                    opacity: submitting ? 0.6 : 1,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={submitting}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div style={styles.loadingMessage}>Loading playlists...</div>
        ) : error ? (
          <div style={styles.errorCard}>
            {error}
          </div>
        ) : playlists.length === 0 && favoritesCount === 0 ? (
          <div style={styles.emptyCard}>
            <p style={styles.emptyTitle}>No playlists yet</p>
            <p style={styles.emptySubtitle}>Click "Add Playlist" to create your first playlist</p>
          </div>
        ) : (
          <div style={styles.playlistGrid}>
            {/* Favorites Card */}
            <div
              onClick={() => navigate('/favorites')}
              onMouseEnter={() => setFavoritesCardHover(true)}
              onMouseLeave={() => setFavoritesCardHover(false)}
              style={{
                ...styles.favoritesCard,
                transform: favoritesCardHover ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: favoritesCardHover
                  ? '0 8px 12px rgba(255, 215, 0, 0.2)'
                  : '0 4px 6px rgba(0, 0, 0, 0.3)',
                borderColor: favoritesCardHover ? 'rgba(255, 215, 0, 0.5)' : 'rgba(255, 215, 0, 0.3)',
              }}
            >
              <div style={styles.playlistHeader}>
                <h3 style={styles.favoritesTitle}>★ My Favorites</h3>
              </div>
              <p style={styles.favoritesDescription}>
                Your curated collection of favorite channels from all playlists
              </p>
              <div style={styles.playlistMeta}>
                <div style={styles.favoritesCount}>
                  {favoritesCount} {favoritesCount === 1 ? 'channel' : 'channels'}
                </div>
              </div>
            </div>

            {/* Playlist Cards */}
            {playlists.map((playlist) => (
              <div key={playlist.id} style={styles.playlistCard}>
                <div style={styles.playlistHeader}>
                  <h3 style={styles.playlistName}>{playlist.name}</h3>
                  <div style={styles.playlistActions}>
                    <button
                      onClick={() => navigate(`/channels/${playlist.id}`)}
                      style={styles.viewButton}
                    >
                      View Channels
                    </button>
                    <button
                      onClick={() => handleEdit(playlist)}
                      style={styles.editButton}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(playlist.id)}
                      style={styles.deleteButton}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p style={styles.playlistUrl}>{playlist.m3u_url}</p>
                <div style={styles.playlistMeta}>
                  <div style={styles.metaItem}>Created: {formatDate(playlist.created_at)}</div>
                  {playlist.last_accessed && (
                    <div style={styles.metaItem}>Last accessed: {formatDate(playlist.last_accessed)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
    cursor: 'pointer',
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
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  pageTitle: {
    color: '#ffffff',
    fontSize: '2rem',
    margin: 0,
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
  formCard: {
    backgroundColor: '#1a1a2e',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
    marginBottom: '2rem',
  },
  formTitle: {
    color: '#ffffff',
    marginTop: 0,
    marginBottom: '1.5rem',
  },
  formGroup: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    color: '#ffffff',
    marginBottom: '0.5rem',
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    backgroundColor: '#0f0f23',
    border: '1px solid #2a2a3e',
    borderRadius: '4px',
    color: '#ffffff',
    boxSizing: 'border-box',
  },
  hint: {
    display: 'block',
    marginTop: '0.25rem',
    color: '#b0b0b0',
    fontSize: '0.85rem',
  },
  formActions: {
    display: 'flex',
    gap: '1rem',
  },
  submitButton: {
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#00d4ff',
    color: '#0f0f23',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    border: '1px solid #2a2a3e',
    backgroundColor: 'transparent',
    color: '#b0b0b0',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  errorMessage: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    color: '#ff4444',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1.5rem',
    border: '1px solid rgba(255, 68, 68, 0.3)',
  },
  loadingMessage: {
    textAlign: 'center',
    padding: '3rem',
    color: '#b0b0b0',
    fontSize: '1.1rem',
  },
  errorCard: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    color: '#ff4444',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid rgba(255, 68, 68, 0.3)',
  },
  emptyCard: {
    backgroundColor: '#1a1a2e',
    padding: '3rem',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: '1.5rem',
    marginBottom: '0.5rem',
  },
  emptySubtitle: {
    color: '#b0b0b0',
    fontSize: '1rem',
  },
  playlistGrid: {
    display: 'grid',
    gap: '1.5rem',
  },
  playlistCard: {
    backgroundColor: '#1a1a2e',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
  },
  favoritesCard: {
    backgroundColor: '#1a1a2e',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
    border: '2px solid rgba(255, 215, 0, 0.3)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  favoritesTitle: {
    color: '#ffd700',
    margin: 0,
    fontSize: '1.3rem',
  },
  favoritesDescription: {
    color: '#b0b0b0',
    margin: '1rem 0',
    fontSize: '0.95rem',
  },
  favoritesCount: {
    color: '#ffd700',
    fontSize: '1.1rem',
    fontWeight: 'bold',
  },
  playlistHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: '1rem',
  },
  playlistName: {
    color: '#ffffff',
    margin: 0,
    fontSize: '1.3rem',
  },
  playlistActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  viewButton: {
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#00d4ff',
    color: '#0f0f23',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 'bold',
  },
  editButton: {
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    border: '1px solid #00d4ff',
    backgroundColor: 'transparent',
    color: '#00d4ff',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  deleteButton: {
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#ff4444',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  playlistUrl: {
    color: '#b0b0b0',
    margin: '0 0 1rem 0',
    wordBreak: 'break-all',
    fontSize: '0.95rem',
  },
  playlistMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  metaItem: {
    color: '#808080',
    fontSize: '0.85rem',
  },
};
