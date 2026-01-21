export interface User {
  id: string;
  email: string;
  username: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  m3u_url: string;
  created_at: number;
  updated_at: number;
  last_accessed: number | null;
}

export interface PlaylistsResponse {
  success: boolean;
  playlists?: Playlist[];
  error?: string;
}

export interface PlaylistResponse {
  success: boolean;
  playlist?: Playlist;
  error?: string;
  message?: string;
}

export interface EPGProgram {
  channel_id: string;
  title: string;
  description?: string;
  start_time: number;
  end_time: number;
  category?: string;
  icon_url?: string;
}

export interface ChannelEPG {
  now?: EPGProgram;
  next?: EPGProgram;
}

export interface Channel {
  name: string;
  url: string;
  logo?: string;
  group?: string;
  tvg_id?: string;
  epg?: ChannelEPG;
}

export interface ChannelsResponse {
  success: boolean;
  channels?: Channel[];
  total?: number;
  epg_available?: boolean;
  epg_url?: string;
  warnings?: string[];
  error?: string;
  details?: string[];
}

export interface EPGRefreshResponse {
  success: boolean;
  message?: string;
  program_count?: number;
  warnings?: string[];
  error?: string;
  details?: string[];
}

export interface EPGProgramsResponse {
  success: boolean;
  programs?: EPGProgram[];
  channel_id?: string;
  error?: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  channel_name: string;
  channel_url: string;
  channel_logo: string | null;
  channel_group: string | null;
  source_playlist_id: string | null;
  category_id: string | null;
  created_at: number;
}

export interface FavoritesResponse {
  success: boolean;
  favorites?: Favorite[];
  error?: string;
}

export interface FavoriteResponse {
  success: boolean;
  favorite?: Favorite;
  error?: string;
  message?: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

export interface CategoryWithCount extends Category {
  channel_count: number;
}

export interface CategoriesResponse {
  success: boolean;
  categories?: CategoryWithCount[];
  error?: string;
}

export interface CategoryResponse {
  success: boolean;
  category?: Category;
  error?: string;
  message?: string;
}

export interface ExportTokenResponse {
  success: boolean;
  export_url?: string;
  token?: string;
  message?: string;
  error?: string;
}
