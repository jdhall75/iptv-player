import React from 'react';
import { ChannelEPG } from '../types';

export interface ChannelItem {
  name: string;
  url: string;
  logo?: string;
  group?: string;
  playlistName: string;
  tvg_id?: string;
  epg?: ChannelEPG;
}

function formatTimeRemaining(endTime: number): string {
  const remaining = Math.max(0, endTime - Date.now());
  const minutes = Math.floor(remaining / 60000);
  if (minutes < 60) {
    return `${minutes}m left`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m left`;
}

interface ChannelListItemProps {
  channel: ChannelItem;
  isSelected: boolean;
  onClick: () => void;
  onFavoriteToggle?: () => void;
  isFavorited?: boolean;
}

export default function ChannelListItem({
  channel,
  isSelected,
  onClick,
  onFavoriteToggle,
  isFavorited,
}: ChannelListItemProps) {
  return (
    <div
      style={{
        ...styles.container,
        backgroundColor: isSelected ? '#2a2a3e' : '#1a1a2e',
        borderLeft: isSelected ? '4px solid #00d4ff' : '4px solid transparent',
      }}
      onClick={onClick}
    >
      {channel.logo && (
        <img
          src={channel.logo}
          alt={channel.name}
          style={styles.logo}
        />
      )}
      <div style={styles.info}>
        <div style={styles.channelName}>{channel.name}</div>
        <div style={styles.metadata}>
          {channel.group && <span style={styles.group}>{channel.group}</span>}
          {channel.group && channel.playlistName && <span style={styles.separator}>•</span>}
          <span style={styles.playlist}>{channel.playlistName}</span>
        </div>
        {channel.epg?.now && (
          <div style={styles.epgNow}>
            <span style={styles.epgLabel}>NOW</span>
            <span style={styles.epgTitle}>{channel.epg.now.title}</span>
            <span style={styles.epgTime}>{formatTimeRemaining(channel.epg.now.end_time)}</span>
          </div>
        )}
        {channel.epg?.next && (
          <div style={styles.epgNext}>
            <span style={styles.epgLabel}>NEXT</span>
            <span style={styles.epgTitle}>{channel.epg.next.title}</span>
          </div>
        )}
      </div>
      {onFavoriteToggle && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle();
          }}
          style={{
            ...styles.favoriteButton,
            color: isFavorited ? '#ffd700' : '#666666',
          }}
          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          ★
        </button>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    gap: '1rem',
    borderBottom: '1px solid #0f0f23',
  },
  logo: {
    width: '40px',
    height: '40px',
    borderRadius: '4px',
    objectFit: 'cover',
    backgroundColor: '#0f0f23',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  channelName: {
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  metadata: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.85rem',
  },
  group: {
    color: '#808080',
  },
  separator: {
    color: '#666666',
  },
  playlist: {
    color: '#00d4ff',
  },
  favoriteButton: {
    padding: '0.25rem 0.5rem',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '1.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  epgNow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8rem',
    marginTop: '0.25rem',
  },
  epgNext: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    opacity: 0.7,
  },
  epgLabel: {
    color: '#00d4ff',
    fontWeight: 600,
    fontSize: '0.65rem',
    padding: '0.1rem 0.3rem',
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    borderRadius: '2px',
  },
  epgTitle: {
    color: '#cccccc',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  epgTime: {
    color: '#808080',
    flexShrink: 0,
  },
};
