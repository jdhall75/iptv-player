import {
  AuthResponse,
  User,
  PlaylistsResponse,
  PlaylistResponse,
  ChannelsResponse,
  FavoritesResponse,
  FavoriteResponse,
  CategoriesResponse,
  CategoryResponse,
  EPGRefreshResponse,
  EPGProgramsResponse,
  ExportTokenResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load tokens from localStorage
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      // If token expired, try to refresh
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the request with new token
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          return await retryResponse.json();
        }
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async register(email: string, username: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });

    if (response.success && response.accessToken && response.refreshToken) {
      this.setTokens(response.accessToken, response.refreshToken);
    }

    return response;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.accessToken && response.refreshToken) {
      this.setTokens(response.accessToken, response.refreshToken);
    }

    return response;
  }

  async getCurrentUser(): Promise<{ success: boolean; user?: User; error?: string }> {
    return await this.request('/auth/me');
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await this.request<{ success: boolean; accessToken?: string }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (response.success && response.accessToken) {
        this.setAccessToken(response.accessToken);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return false;
    }
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private setAccessToken(accessToken: string): void {
    this.accessToken = accessToken;
    localStorage.setItem('accessToken', accessToken);
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // ==================== Playlist Methods ====================

  async getPlaylists(): Promise<PlaylistsResponse> {
    return await this.request('/playlists');
  }

  async getPlaylist(id: string): Promise<PlaylistResponse> {
    return await this.request(`/playlists/${id}`);
  }

  async createPlaylist(name: string, m3uUrl: string): Promise<PlaylistResponse> {
    return await this.request('/playlists', {
      method: 'POST',
      body: JSON.stringify({ name, m3u_url: m3uUrl }),
    });
  }

  async updatePlaylist(id: string, name: string, m3uUrl: string): Promise<PlaylistResponse> {
    return await this.request(`/playlists/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, m3u_url: m3uUrl }),
    });
  }

  async deletePlaylist(id: string): Promise<PlaylistResponse> {
    return await this.request(`/playlists/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== Channel Methods ====================

  async getChannels(playlistId: string, searchTerm?: string): Promise<ChannelsResponse> {
    const params = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
    return await this.request(`/channels/${playlistId}${params}`);
  }

  // ==================== Favorites Methods ====================

  async getFavorites(): Promise<FavoritesResponse> {
    return await this.request('/favorites');
  }

  async getFavorite(id: string): Promise<FavoriteResponse> {
    return await this.request(`/favorites/${id}`);
  }

  async createFavorite(
    channelName: string,
    channelUrl: string,
    channelLogo?: string,
    channelGroup?: string,
    sourcePlaylistId?: string,
    categoryId?: string
  ): Promise<FavoriteResponse> {
    return await this.request('/favorites', {
      method: 'POST',
      body: JSON.stringify({
        channel_name: channelName,
        channel_url: channelUrl,
        channel_logo: channelLogo,
        channel_group: channelGroup,
        source_playlist_id: sourcePlaylistId,
        category_id: categoryId,
      }),
    });
  }

  async deleteFavorite(id: string): Promise<FavoriteResponse> {
    return await this.request(`/favorites/${id}`, {
      method: 'DELETE',
    });
  }

  async deleteFavoriteByUrl(channelUrl: string): Promise<FavoriteResponse> {
    return await this.request('/favorites/by-url/delete', {
      method: 'POST',
      body: JSON.stringify({ channel_url: channelUrl }),
    });
  }

  async updateFavoriteCategory(favoriteId: string, categoryId: string | null): Promise<FavoriteResponse> {
    return await this.request(`/favorites/${favoriteId}/category`, {
      method: 'PUT',
      body: JSON.stringify({ category_id: categoryId }),
    });
  }

  // ==================== Categories Methods ====================

  async getCategories(): Promise<CategoriesResponse> {
    return await this.request('/categories');
  }

  async getCategory(id: string): Promise<CategoryResponse> {
    return await this.request(`/categories/${id}`);
  }

  async createCategory(name: string): Promise<CategoryResponse> {
    return await this.request('/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async updateCategory(id: string, name: string): Promise<CategoryResponse> {
    return await this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async deleteCategory(id: string): Promise<CategoryResponse> {
    return await this.request(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== EPG Methods ====================

  async refreshEPG(playlistId: string, epgUrl: string): Promise<EPGRefreshResponse> {
    return await this.request(`/epg/${playlistId}/refresh`, {
      method: 'POST',
      body: JSON.stringify({ epg_url: epgUrl }),
    });
  }

  async getChannelPrograms(
    playlistId: string,
    channelId: string,
    start?: number,
    end?: number
  ): Promise<EPGProgramsResponse> {
    const params = new URLSearchParams();
    if (start) params.append('start', start.toString());
    if (end) params.append('end', end.toString());
    const query = params.toString() ? `?${params}` : '';
    return await this.request(`/epg/${playlistId}/programs/${encodeURIComponent(channelId)}${query}`);
  }

  // ==================== Export Methods ====================

  async getExportUrl(): Promise<ExportTokenResponse> {
    return await this.request('/export/token');
  }

  async regenerateExportUrl(): Promise<ExportTokenResponse> {
    return await this.request('/export/token/regenerate', { method: 'POST' });
  }
}

export const apiService = new ApiService();
