/**
 * M3U Parser Utility
 * Parses M3U playlist files and extracts channel metadata
 */

export interface Channel {
  name: string;
  url: string;
  logo?: string;
  group?: string;
  tvg_id?: string;
}

export interface ParseResult {
  channels: Channel[];
  errors: string[];
  epg_url?: string;
}

/**
 * Fetches and parses an M3U playlist from a URL
 */
export async function parseM3U(url: string): Promise<ParseResult> {
  const errors: string[] = [];
  const channels: Channel[] = [];

  try {
    // Fetch the M3U file
    const response = await fetch(url);
    if (!response.ok) {
      return {
        channels: [],
        errors: [`Failed to fetch M3U: ${response.status} ${response.statusText}`],
      };
    }

    const content = await response.text();

    // Parse the M3U content
    const lines = content.split('\n').map(line => line.trim());

    // Check for M3U header
    if (lines.length === 0 || !lines[0].startsWith('#EXTM3U')) {
      return {
        channels: [],
        errors: ['Invalid M3U file: missing #EXTM3U header'],
      };
    }

    // Extract EPG URL from header (url-tvg or x-tvg-url attribute)
    const epg_url = extractEpgUrl(lines[0]);

    let currentChannel: Partial<Channel> | null = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Skip empty lines and comments (except EXTINF)
      if (!line || (line.startsWith('#') && !line.startsWith('#EXTINF'))) {
        continue;
      }

      // Parse EXTINF line for metadata
      if (line.startsWith('#EXTINF')) {
        currentChannel = parseExtinf(line);
      }
      // Parse URL line
      else if (currentChannel && isValidUrl(line)) {
        currentChannel.url = line;

        // Add channel if it has required fields
        if (currentChannel.name && currentChannel.url) {
          channels.push(currentChannel as Channel);
        } else {
          errors.push(`Skipped channel with missing data at line ${i + 1}`);
        }

        currentChannel = null;
      }
    }

    return { channels, errors, epg_url };
  } catch (error) {
    return {
      channels: [],
      errors: [`Error parsing M3U: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

/**
 * Extracts EPG URL from the #EXTM3U header line
 * Looks for url-tvg="..." or x-tvg-url="..." attributes
 */
function extractEpgUrl(headerLine: string): string | undefined {
  // Try url-tvg first (most common)
  const urlTvgMatch = headerLine.match(/url-tvg="([^"]*)"/i);
  if (urlTvgMatch && urlTvgMatch[1]) {
    return urlTvgMatch[1];
  }

  // Try x-tvg-url as fallback
  const xTvgUrlMatch = headerLine.match(/x-tvg-url="([^"]*)"/i);
  if (xTvgUrlMatch && xTvgUrlMatch[1]) {
    return xTvgUrlMatch[1];
  }

  return undefined;
}

/**
 * Parses an EXTINF line to extract channel metadata
 * Format: #EXTINF:-1 tvg-id="..." tvg-logo="..." group-title="...",Channel Name
 */
function parseExtinf(line: string): Partial<Channel> {
  const channel: Partial<Channel> = {};

  // Extract channel name (after the last comma)
  const commaIndex = line.lastIndexOf(',');
  if (commaIndex !== -1) {
    channel.name = line.substring(commaIndex + 1).trim();
  }

  // Extract tvg-id attribute (for EPG matching)
  const tvgIdMatch = line.match(/tvg-id="([^"]*)"/i);
  if (tvgIdMatch && tvgIdMatch[1]) {
    channel.tvg_id = tvgIdMatch[1];
  }

  // Extract tvg-logo attribute
  const logoMatch = line.match(/tvg-logo="([^"]*)"/);
  if (logoMatch) {
    channel.logo = logoMatch[1];
  }

  // Extract group-title attribute
  const groupMatch = line.match(/group-title="([^"]*)"/);
  if (groupMatch) {
    channel.group = groupMatch[1];
  }

  return channel;
}

/**
 * Validates if a string is a valid URL
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Filters channels by search term (searches name and group)
 */
export function filterChannels(channels: Channel[], searchTerm: string): Channel[] {
  if (!searchTerm) return channels;

  const term = searchTerm.toLowerCase();
  return channels.filter(channel =>
    channel.name.toLowerCase().includes(term) ||
    (channel.group && channel.group.toLowerCase().includes(term))
  );
}

/**
 * Groups channels by their group property
 */
export function groupChannels(channels: Channel[]): Record<string, Channel[]> {
  return channels.reduce((groups, channel) => {
    const group = channel.group || 'Uncategorized';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(channel);
    return groups;
  }, {} as Record<string, Channel[]>);
}
