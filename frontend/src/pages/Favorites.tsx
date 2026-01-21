import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { Favorite, CategoryWithCount, Playlist } from '../types';
import HLSPlayer from '../components/HLSPlayer';
import ChannelList from '../components/ChannelList';
import { ChannelItem } from '../components/ChannelListItem';

export default function Favorites() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentChannelUrl, setCurrentChannelUrl] = useState<string | null>(null);
  const [currentChannelName, setCurrentChannelName] = useState<string>('');
  const [showChannelList, setShowChannelList] = useState(true);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const hideTimerRef = React.useRef<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Handle channel list auto-hide on inactivity
  useEffect(() => {
    const resetHideTimer = () => {
      // Show the channel list
      setShowChannelList(true);

      // Clear existing timer
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }

      // Set new timer to hide after 5 seconds
      hideTimerRef.current = setTimeout(() => {
        setShowChannelList(false);
      }, 5000) as unknown as number;
    };

    // Initial timer
    resetHideTimer();

    // Event listeners
    const handleActivity = () => {
      resetHideTimer();
    };

    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('click', handleActivity);

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load favorites
      const response = await apiService.getFavorites();
      if (response.success && response.favorites) {
        setFavorites(response.favorites);
      } else {
        setError(response.error || 'Failed to load favorites');
      }

      // Load categories
      const categoriesResponse = await apiService.getCategories();
      if (categoriesResponse.success && categoriesResponse.categories) {
        setCategories(categoriesResponse.categories);
      }

      // Load playlists to get playlist names
      const playlistsResponse = await apiService.getPlaylists();
      if (playlistsResponse.success && playlistsResponse.playlists) {
        setPlaylists(playlistsResponse.playlists);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this channel from favorites?')) {
      return;
    }

    try {
      const response = await apiService.deleteFavorite(id);
      if (response.success) {
        setFavorites(favorites.filter(fav => fav.id !== id));
      } else {
        alert(response.error || 'Failed to delete favorite');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      const response = await apiService.getExportUrl();
      if (response.success && response.export_url) {
        setExportUrl(response.export_url);
        setShowExportModal(true);
      } else {
        alert(response.error || 'Failed to get export URL');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleCopyUrl = () => {
    if (exportUrl) {
      navigator.clipboard.writeText(exportUrl);
      alert('URL copied to clipboard!');
    }
  };

  const handleRegenerateUrl = async () => {
    if (!confirm('This will invalidate your current export URL. Continue?')) {
      return;
    }
    try {
      setExportLoading(true);
      const response = await apiService.regenerateExportUrl();
      if (response.success && response.export_url) {
        setExportUrl(response.export_url);
      } else {
        alert(response.error || 'Failed to regenerate URL');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleChannelSelect = (channelItem: ChannelItem) => {
    setCurrentChannelUrl(channelItem.url);
    setCurrentChannelName(channelItem.name);
  };

  const handleFavoriteToggleFromList = (channelItem: ChannelItem) => {
    const favorite = favorites.find(fav => fav.channel_url === channelItem.url);
    if (favorite) {
      handleDelete(favorite.id);
    }
  };

  const getPlaylistName = (playlistId: string | null): string => {
    if (!playlistId) return 'Unknown';
    const playlist = playlists.find(p => p.id === playlistId);
    return playlist?.name || 'Unknown';
  };

  // Filter favorites based on category
  const filteredFavorites = favorites.filter(fav => {
    // Filter by category
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'uncategorized') return fav.category_id === null;
    return fav.category_id === selectedCategory;
  });

  // Convert favorites to ChannelItem format
  const channelItems: ChannelItem[] = filteredFavorites.map(fav => ({
    name: fav.channel_name,
    url: fav.channel_url,
    logo: fav.channel_logo || undefined,
    group: fav.channel_group || undefined,
    playlistName: getPlaylistName(fav.source_playlist_id),
  }));

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title} onClick={() => navigate('/playlists')}>IPTV Player</h1>
        <div style={styles.userInfo}>
          <span style={styles.username}>Welcome, {user?.username}!</span>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* Top Section: Controls */}
        <div style={styles.controlsSection}>
          <div style={styles.controlsLeft}>
            <button onClick={() => navigate('/playlists')} style={styles.backButton}>
              ← Back to Playlists
            </button>
            <h2 style={styles.pageTitle}>
              My Favorites
            </h2>
          </div>
          <div style={styles.controlsRight}>
            {favorites.length > 0 && (
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Category:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="all">All</option>
                  <option value="uncategorized">Uncategorized</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.channel_count})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button onClick={() => navigate('/categories')} style={styles.categoriesButton}>
              Manage Categories
            </button>
            {favorites.length > 0 && (
              <button onClick={handleExport} style={styles.exportButton} disabled={exportLoading}>
                {exportLoading ? 'Loading...' : 'Export M3U'}
              </button>
            )}
          </div>
        </div>

        {/* Export Modal */}
        {showExportModal && (
          <div style={styles.modalOverlay} onClick={() => setShowExportModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3 style={styles.modalTitle}>M3U Export URL</h3>
              <p style={styles.modalDescription}>
                Use this URL in your MAG box or any IPTV player to load your favorites as a playlist.
              </p>
              <div style={styles.urlContainer}>
                <input
                  type="text"
                  value={exportUrl || ''}
                  readOnly
                  style={styles.urlInput}
                />
                <button onClick={handleCopyUrl} style={styles.copyButton}>
                  Copy
                </button>
              </div>
              <p style={styles.modalNote}>
                This URL updates automatically when you add or remove favorites.
              </p>
              <div style={styles.modalActions}>
                <button onClick={handleRegenerateUrl} style={styles.regenerateButton} disabled={exportLoading}>
                  Regenerate URL
                </button>
                <button onClick={() => setShowExportModal(false)} style={styles.closeButton}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={styles.loadingMessage}>Loading favorites...</div>
        ) : error ? (
          <div style={styles.errorCard}>{error}</div>
        ) : favorites.length === 0 ? (
          <div style={styles.emptyCard}>
            <p style={styles.emptyTitle}>No favorites yet</p>
            <p style={styles.emptySubtitle}>
              Browse channels from your playlists and click the star icon to add them to favorites
            </p>
            <button onClick={() => navigate('/playlists')} style={styles.browseButton}>
              Browse Playlists
            </button>
          </div>
        ) : filteredFavorites.length === 0 ? (
          <div style={styles.emptyCard}>
            <p style={styles.emptyTitle}>No favorites match your filters</p>
            <p style={styles.emptySubtitle}>Try adjusting your search or category filter</p>
          </div>
        ) : (
          <div style={styles.playerContainer}>
            {/* Video Player Section - Full Screen */}
            <div style={styles.playerSection}>
              <HLSPlayer url={currentChannelUrl} channelName={currentChannelName} />
            </div>

            {/* Channel List Overlay */}
            <div
              style={{
                ...styles.channelListOverlay,
                opacity: showChannelList ? 1 : 0,
                pointerEvents: showChannelList ? 'auto' : 'none',
              }}
            >
              <div style={styles.channelListSection}>
                <div style={styles.channelListHeader}>
                  <span style={styles.channelCount}>{filteredFavorites.length} Favorites</span>
                  <span style={styles.instructions}>
                    Use ↑↓ arrow keys to navigate • Pause for 0.75s to load
                  </span>
                </div>
                <div style={styles.channelListContainer}>
                  <ChannelList
                    channels={channelItems}
                    onChannelSelect={handleChannelSelect}
                    onFavoriteToggle={handleFavoriteToggleFromList}
                    getFavoriteStatus={() => true} // All items in this list are favorites
                    autoLoadDelay={750}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
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
    flexShrink: 0,
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
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  controlsSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#1a1a2e',
    borderBottom: '1px solid #2a2a3e',
    flexShrink: 0,
  },
  controlsLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  controlsRight: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
  },
  backButton: {
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    border: '1px solid #2a2a3e',
    backgroundColor: 'transparent',
    color: '#b0b0b0',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  pageTitle: {
    color: '#ffffff',
    fontSize: '1.5rem',
    margin: 0,
  },
  categoriesButton: {
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#00d4ff',
    color: '#0f0f23',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  filterLabel: {
    color: '#ffffff',
    fontSize: '0.9rem',
    fontWeight: 'bold',
  },
  filterSelect: {
    padding: '0.5rem',
    fontSize: '0.9rem',
    backgroundColor: '#0f0f23',
    border: '1px solid #2a2a3e',
    borderRadius: '4px',
    color: '#ffffff',
    cursor: 'pointer',
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
    padding: '1.5rem 2rem',
    border: '1px solid rgba(255, 68, 68, 0.3)',
  },
  emptyCard: {
    backgroundColor: '#1a1a2e',
    padding: '3rem',
    margin: '2rem',
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
    marginBottom: '2rem',
  },
  browseButton: {
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#00d4ff',
    color: '#0f0f23',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  playerContainer: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  playerSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  channelListOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '400px',
    height: '100%',
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    transition: 'opacity 0.5s ease-out',
    zIndex: 10,
    borderLeft: '2px solid #ffd700',
  },
  channelListSection: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  channelListHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '1rem 1.5rem',
    backgroundColor: 'rgba(15, 15, 35, 0.8)',
    borderBottom: '1px solid #2a2a3e',
    flexShrink: 0,
  },
  channelCount: {
    color: '#ffffff',
    fontSize: '1.1rem',
    fontWeight: 'bold',
  },
  instructions: {
    color: '#808080',
    fontSize: '0.8rem',
    lineHeight: 1.4,
  },
  channelListContainer: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  exportButton: {
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#4CAF50',
    color: '#ffffff',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    backgroundColor: '#1a1a2e',
    padding: '2rem',
    borderRadius: '8px',
    maxWidth: '600px',
    width: '90%',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: '1.5rem',
    marginTop: 0,
    marginBottom: '1rem',
  },
  modalDescription: {
    color: '#b0b0b0',
    marginBottom: '1.5rem',
  },
  urlContainer: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  urlInput: {
    flex: 1,
    padding: '0.75rem',
    fontSize: '0.9rem',
    backgroundColor: '#0f0f23',
    border: '1px solid #2a2a3e',
    borderRadius: '4px',
    color: '#00d4ff',
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#00d4ff',
    color: '#0f0f23',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  modalNote: {
    color: '#808080',
    fontSize: '0.85rem',
    marginBottom: '1.5rem',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
  },
  regenerateButton: {
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    border: '1px solid #ff4444',
    backgroundColor: 'transparent',
    color: '#ff4444',
    cursor: 'pointer',
  },
  closeButton: {
    padding: '0.5rem 1.5rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#2a2a3e',
    color: '#ffffff',
    cursor: 'pointer',
  },
};
