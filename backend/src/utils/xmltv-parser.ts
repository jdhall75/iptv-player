/**
 * XMLTV Parser Utility
 * Parses XMLTV/EPG files and extracts program data
 */

import { XMLParser } from 'fast-xml-parser';

export interface EPGProgram {
  channel_id: string;
  title: string;
  description?: string;
  start_time: number;
  end_time: number;
  category?: string;
  icon_url?: string;
}

export interface ParseXMLTVResult {
  programs: EPGProgram[];
  errors: string[];
}

/**
 * Fetches and parses an XMLTV file from a URL
 */
export async function fetchAndParseXMLTV(url: string): Promise<ParseXMLTVResult> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {
        programs: [],
        errors: [`Failed to fetch XMLTV: ${response.status} ${response.statusText}`],
      };
    }

    const content = await response.text();
    return parseXMLTV(content);
  } catch (error) {
    return {
      programs: [],
      errors: [`Error fetching XMLTV: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

/**
 * Parses XMLTV content string into program data
 */
export function parseXMLTV(xmlContent: string): ParseXMLTVResult {
  const errors: string[] = [];
  const programs: EPGProgram[] = [];

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      isArray: (tagName) => tagName === 'programme' || tagName === 'category',
    });

    const parsed = parser.parse(xmlContent);

    if (!parsed?.tv) {
      return {
        programs: [],
        errors: ['Invalid XMLTV: missing <tv> root element'],
      };
    }

    const programmes = parsed.tv.programme || [];

    // Get current time and filter window (next 48 hours)
    const now = Date.now();
    const maxTime = now + 48 * 60 * 60 * 1000;

    for (const prog of programmes) {
      try {
        const channelId = prog['@_channel'];
        const startStr = prog['@_start'];
        const stopStr = prog['@_stop'];

        if (!channelId || !startStr || !stopStr) {
          continue;
        }

        const startTime = parseXMLTVDateTime(startStr);
        const endTime = parseXMLTVDateTime(stopStr);

        // Skip programs that have already ended or are too far in the future
        if (endTime < now || startTime > maxTime) {
          continue;
        }

        // Extract title (can be string or object with #text)
        let title = '';
        if (prog.title) {
          if (typeof prog.title === 'string') {
            title = prog.title;
          } else if (prog.title['#text']) {
            title = prog.title['#text'];
          } else if (Array.isArray(prog.title) && prog.title[0]) {
            const firstTitle = prog.title[0];
            title = typeof firstTitle === 'string' ? firstTitle : firstTitle['#text'] || '';
          }
        }

        if (!title) {
          continue;
        }

        // Extract description
        let description: string | undefined;
        if (prog.desc) {
          if (typeof prog.desc === 'string') {
            description = prog.desc;
          } else if (prog.desc['#text']) {
            description = prog.desc['#text'];
          } else if (Array.isArray(prog.desc) && prog.desc[0]) {
            const firstDesc = prog.desc[0];
            description = typeof firstDesc === 'string' ? firstDesc : firstDesc['#text'];
          }
        }

        // Extract category
        let category: string | undefined;
        if (prog.category) {
          const categories = Array.isArray(prog.category) ? prog.category : [prog.category];
          if (categories[0]) {
            const cat = categories[0];
            category = typeof cat === 'string' ? cat : cat['#text'];
          }
        }

        // Extract icon URL
        let iconUrl: string | undefined;
        if (prog.icon && prog.icon['@_src']) {
          iconUrl = prog.icon['@_src'];
        }

        programs.push({
          channel_id: channelId,
          title,
          description,
          start_time: startTime,
          end_time: endTime,
          category,
          icon_url: iconUrl,
        });
      } catch (err) {
        // Skip individual program parsing errors
        errors.push(`Failed to parse programme: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { programs, errors };
  } catch (error) {
    return {
      programs: [],
      errors: [`Error parsing XMLTV: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

/**
 * Parses XMLTV datetime format into Unix timestamp (milliseconds)
 * Format: "20180920143000 +0300" or "20180920143000"
 */
function parseXMLTVDateTime(dateStr: string): number {
  // Remove any whitespace and extract components
  const cleanStr = dateStr.trim();

  // Extract date/time part (first 14 characters: YYYYMMDDHHmmss)
  const dateTimePart = cleanStr.substring(0, 14);

  const year = parseInt(dateTimePart.substring(0, 4), 10);
  const month = parseInt(dateTimePart.substring(4, 6), 10) - 1; // JS months are 0-indexed
  const day = parseInt(dateTimePart.substring(6, 8), 10);
  const hour = parseInt(dateTimePart.substring(8, 10), 10);
  const minute = parseInt(dateTimePart.substring(10, 12), 10);
  const second = parseInt(dateTimePart.substring(12, 14), 10);

  // Check for timezone offset (e.g., "+0300" or "-0500")
  const tzMatch = cleanStr.match(/([+-])(\d{2})(\d{2})$/);

  if (tzMatch) {
    // Create date in UTC then adjust for timezone
    const tzSign = tzMatch[1] === '+' ? 1 : -1;
    const tzHours = parseInt(tzMatch[2], 10);
    const tzMinutes = parseInt(tzMatch[3], 10);
    const tzOffsetMs = tzSign * (tzHours * 60 + tzMinutes) * 60 * 1000;

    // Create date as if it's UTC, then subtract the timezone offset
    const utcDate = Date.UTC(year, month, day, hour, minute, second);
    return utcDate - tzOffsetMs;
  }

  // No timezone - treat as UTC
  return Date.UTC(year, month, day, hour, minute, second);
}

/**
 * Gets the current and next program for a specific channel
 */
export function getNowNext(
  programs: EPGProgram[],
  channelId: string,
  now: number = Date.now()
): { now?: EPGProgram; next?: EPGProgram } {
  const channelPrograms = programs
    .filter((p) => p.channel_id === channelId)
    .sort((a, b) => a.start_time - b.start_time);

  let nowProgram: EPGProgram | undefined;
  let nextProgram: EPGProgram | undefined;

  for (const program of channelPrograms) {
    if (program.start_time <= now && program.end_time > now) {
      nowProgram = program;
    } else if (program.start_time > now && !nextProgram) {
      nextProgram = program;
      break;
    }
  }

  return { now: nowProgram, next: nextProgram };
}
