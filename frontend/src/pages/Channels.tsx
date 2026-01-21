import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { Channel, Playlist, Favorite } from '../types';
import HLSPlayer from '../components/HLSPlayer';
import ChannelList from '../components/ChannelList';
import { ChannelItem } from '../components/ChannelListItem';

export default function Channels() {
  const navigate = useNavigate();
  const { playlistId } = useParams<{ playlistId: string }>();
  const { user, logout } = useAuth();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [currentChannelUrl, setCurrentChannelUrl] = useState<string | null>(null);
  const [currentChannelName, setCurrentChannelName] = useState<string>('');
  const [showChannelList, setShowChannelList] = useState(true);
  const [epgAvailable, setEpgAvailable] = useState(false);
  const hideTimerRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (playlistId) {
      loadData();
    }
  }, [playlistId]);

  // Periodic refresh for EPG data (every 5 minutes)
  useEffect(() => {
    if (!playlistId || !epgAvailable) return;

    const interval = setInterval(() => {
      // Silent refresh - don't show loading state
      apiService.getChannels(playlistId).then((response) => {
        if (response.success && response.channels) {
          setChannels(response.channels);
        }
      });
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [playlistId, epgAvailable]);

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

      // Load playlist details
      const playlistResponse = await apiService.getPlaylist(playlistId!);
      if (playlistResponse.success && playlistResponse.playlist) {
        setPlaylist(playlistResponse.playlist);
      }

      // Load channels (includes EPG data if available)
      const channelsResponse = await apiService.getChannels(playlistId!);
      if (channelsResponse.success && channelsResponse.channels) {
        setChannels(channelsResponse.channels);
        setEpgAvailable(channelsResponse.epg_available || false);
        if (channelsResponse.warnings && channelsResponse.warnings.length > 0) {
          setWarnings(channelsResponse.warnings);
        }
      } else {
        setError(channelsResponse.error || 'Failed to load channels');
      }

      // Load favorites to check which channels are favorited
      const favoritesResponse = await apiService.getFavorites();
      if (favoritesResponse.success && favoritesResponse.favorites) {
        setFavorites(favoritesResponse.favorites);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFavorited = (channelUrl: string): boolean => {
    return favorites.some(fav => fav.channel_url === channelUrl);
  };

  const handleToggleFavorite = async (channel: Channel) => {
    try {
      if (isFavorited(channel.url)) {
        // Remove from favorites
        const response = await apiService.deleteFavoriteByUrl(channel.url);
        if (response.success) {
          setFavorites(favorites.filter(fav => fav.channel_url !== channel.url));
        } else {
          alert(response.error || 'Failed to remove favorite');
        }
      } else {
        // Add to favorites
        const response = await apiService.createFavorite(
          channel.name,
          channel.url,
          channel.logo,
          channel.group,
          playlistId
        );
        if (response.success && response.favorite) {
          setFavorites([...favorites, response.favorite]);
        } else if (response.error && response.error.includes('already in favorites')) {
          // Already favorited, just refresh the list
          await loadData();
        } else {
          alert(response.error || 'Failed to add favorite');
        }
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleChannelSelect = (channelItem: ChannelItem) => {
    setCurrentChannelUrl(channelItem.url);
    setCurrentChannelName(channelItem.name);
  };

  const handleFavoriteToggleFromList = (channelItem: ChannelItem) => {
    const channel = channels.find(ch => ch.url === channelItem.url);
    if (channel) {
      handleToggleFavorite(channel);
    }
  };

  // Convert channels to ChannelItem format (includes EPG data)
  const channelItems: ChannelItem[] = channels.map(channel => ({
    name: channel.name,
    url: channel.url,
    logo: channel.logo,
    group: channel.group,
    playlistName: playlist?.name || 'Unknown Playlist',
    tvg_id: channel.tvg_id,
    epg: channel.epg,
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
              {playlist?.name || 'Channels'}
            </h2>
          </div>
          <div style={styles.controlsRight}>
            <button onClick={() => navigate('/favorites')} style={styles.favoritesButton}>
              ★ Favorites
            </button>
          </div>
        </div>

        {warnings.length > 0 && (
          <div style={styles.warningCard}>
            <strong>Warnings:</strong>
            <ul style={styles.warningList}>
              {warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {loading ? (
          <div style={styles.loadingMessage}>Loading channels...</div>
        ) : error ? (
          <div style={styles.errorCard}>{error}</div>
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
                  <span style={styles.channelCount}>
                    {channels.length} Channels
                    {epgAvailable && <span style={styles.epgBadge}>EPG</span>}
                  </span>
                  <span style={styles.instructions}>
                    Use ↑↓ arrow keys to navigate • Pause for 0.75s to load
                  </span>
                </div>
                <div style={styles.channelListContainer}>
                  <ChannelList
                    channels={channelItems}
                    onChannelSelect={handleChannelSelect}
                    onFavoriteToggle={handleFavoriteToggleFromList}
                    getFavoriteStatus={(ch) => isFavorited(ch.url)}
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
    gap: '0.5rem',
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
  favoritesButton: {
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#ffd700',
    color: '#0f0f23',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  warningCard: {
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    color: '#ffaa00',
    padding: '1rem 2rem',
    border: '1px solid rgba(255, 165, 0, 0.3)',
    borderBottom: '1px solid #2a2a3e',
    flexShrink: 0,
  },
  warningList: {
    margin: '0.5rem 0 0 1.5rem',
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
    borderLeft: '2px solid #00d4ff',
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
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  epgBadge: {
    backgroundColor: '#00d4ff',
    color: '#0f0f23',
    padding: '0.15rem 0.4rem',
    borderRadius: '3px',
    fontSize: '0.7rem',
    fontWeight: 600,
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
};
