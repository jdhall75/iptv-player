import React, { useEffect, useRef, useState } from 'react';
import ChannelListItem, { ChannelItem } from './ChannelListItem';

interface ChannelListProps {
  channels: ChannelItem[];
  onChannelSelect: (channel: ChannelItem, index: number) => void;
  onFavoriteToggle?: (channel: ChannelItem, index: number) => void;
  getFavoriteStatus?: (channel: ChannelItem) => boolean;
  autoLoadDelay?: number; // milliseconds to wait before auto-loading
}

export default function ChannelList({
  channels,
  onChannelSelect,
  onFavoriteToggle,
  getFavoriteStatus,
  autoLoadDelay = 750,
}: ChannelListProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoLoadTimerRef = useRef<number | null>(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (channels.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHoveredIndex(null); // Clear hover highlight when using keyboard
        setSelectedIndex((prev) => {
          const next = Math.min(prev + 1, channels.length - 1);
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHoveredIndex(null); // Clear hover highlight when using keyboard
        setSelectedIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          return next;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (channels[selectedIndex]) {
          onChannelSelect(channels[selectedIndex], selectedIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [channels, selectedIndex, onChannelSelect]);

  // Auto-scroll to center selected item
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [selectedIndex]);

  // Auto-load channel after delay when navigating with keyboard
  useEffect(() => {
    // Clear existing timer
    if (autoLoadTimerRef.current) {
      clearTimeout(autoLoadTimerRef.current);
    }

    // Set new timer to auto-load after delay
    autoLoadTimerRef.current = setTimeout(() => {
      if (channels[selectedIndex]) {
        onChannelSelect(channels[selectedIndex], selectedIndex);
      }
    }, autoLoadDelay);

    // Cleanup
    return () => {
      if (autoLoadTimerRef.current) {
        clearTimeout(autoLoadTimerRef.current);
      }
    };
  }, [selectedIndex, channels, onChannelSelect, autoLoadDelay]);

  const handleItemClick = (index: number) => {
    setSelectedIndex(index);
    if (channels[index]) {
      onChannelSelect(channels[index], index);
    }
  };

  const handleFavoriteToggle = (index: number) => {
    if (onFavoriteToggle && channels[index]) {
      onFavoriteToggle(channels[index], index);
    }
  };

  if (channels.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p style={styles.emptyText}>No channels available</p>
      </div>
    );
  }

  return (
    <div ref={listRef} style={styles.container}>
      {channels.map((channel, index) => (
        <div
          key={`${channel.url}-${index}`}
          ref={(el) => { itemRefs.current[index] = el; }}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <ChannelListItem
            channel={channel}
            isSelected={selectedIndex === index || hoveredIndex === index}
            onClick={() => handleItemClick(index)}
            onFavoriteToggle={onFavoriteToggle ? () => handleFavoriteToggle(index) : undefined}
            isFavorited={getFavoriteStatus ? getFavoriteStatus(channel) : undefined}
          />
        </div>
      ))}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    height: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  emptyState: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
  },
  emptyText: {
    color: '#b0b0b0',
    fontSize: '1.1rem',
  },
};
