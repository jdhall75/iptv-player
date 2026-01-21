import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface HLSPlayerProps {
  url: string | null;
  channelName?: string;
  onError?: (error: string) => void;
}

export default function HLSPlayer({ url, channelName, onError }: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (!url || !videoRef.current) {
      return;
    }

    const video = videoRef.current;

    // Cleanup previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Check if HLS is supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hlsRef.current = hls;

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((err) => {
          console.error('Autoplay failed:', err);
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal error, destroying HLS instance');
              hls.destroy();
              if (onError) {
                onError('Failed to load stream');
              }
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch((err) => {
          console.error('Autoplay failed:', err);
        });
      });
    } else {
      console.error('HLS is not supported in this browser');
      if (onError) {
        onError('HLS is not supported in this browser');
      }
    }

    // Cleanup function
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (video) {
        video.pause();
        video.src = '';
      }
    };
  }, [url, onError]);

  // Show overlay when channel name changes
  useEffect(() => {
    if (channelName && url) {
      setShowOverlay(true);
      const timer = setTimeout(() => {
        setShowOverlay(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [channelName, url]);

  return (
    <div style={styles.container}>
      <video
        ref={videoRef}
        style={styles.video}
        controls
        autoPlay
      />
      {!url && (
        <div style={styles.placeholder}>
          <p style={styles.placeholderText}>Select a channel to start watching</p>
        </div>
      )}
      {channelName && url && (
        <div
          style={{
            ...styles.overlay,
            opacity: showOverlay ? 1 : 0,
          }}
        >
          <div style={styles.overlayContent}>
            <p style={styles.channelName}>{channelName}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  placeholderText: {
    color: '#b0b0b0',
    fontSize: '1.5rem',
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    padding: '2rem',
    background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0) 100%)',
    pointerEvents: 'none',
    transition: 'opacity 0.5s ease-out',
  },
  overlayContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  channelName: {
    color: '#ffffff',
    fontSize: '2rem',
    fontWeight: 'bold',
    margin: 0,
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
  },
};
