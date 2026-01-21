import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { CategoryWithCount } from '../types';

export default function Categories() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.getCategories();
      if (response.success && response.categories) {
        setCategories(response.categories);
      } else {
        setError(response.error || 'Failed to load categories');
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
      const { name } = formData;

      if (!name.trim()) {
        setFormError('Category name is required');
        setSubmitting(false);
        return;
      }

      let response;
      if (editingId) {
        response = await apiService.updateCategory(editingId, name);
      } else {
        response = await apiService.createCategory(name);
      }

      if (response.success) {
        setShowForm(false);
        setEditingId(null);
        setFormData({ name: '' });
        await loadCategories();
      } else {
        setFormError(response.error || 'Failed to save category');
      }
    } catch (err) {
      setFormError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category: CategoryWithCount) => {
    setEditingId(category.id);
    setFormData({ name: category.name });
    setShowForm(true);
    setFormError('');
  };

  const handleDelete = async (id: string, channelCount: number) => {
    const message = channelCount > 0
      ? `This category has ${channelCount} channel(s). Deleting it will set those favorites to "Uncategorized". Continue?`
      : 'Are you sure you want to delete this category?';

    if (!confirm(message)) {
      return;
    }

    try {
      const response = await apiService.deleteCategory(id);
      if (response.success) {
        await loadCategories();
      } else {
        alert(response.error || 'Failed to delete category');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '' });
    setFormError('');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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

      <div style={styles.content}>
        <div style={styles.pageHeader}>
          <div>
            <button onClick={() => navigate('/favorites')} style={styles.backButton}>
              ← Back to Favorites
            </button>
            <h2 style={styles.pageTitle}>Manage Categories</h2>
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)} style={styles.addButton}>
              + Add Category
            </button>
          )}
        </div>

        {showForm && (
          <div style={styles.formCard}>
            <h3 style={styles.formTitle}>{editingId ? 'Edit Category' : 'Add New Category'}</h3>
            <form onSubmit={handleSubmit}>
              {formError && (
                <div style={styles.errorMessage}>
                  {formError}
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Category Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  placeholder="Enter category name"
                  style={styles.input}
                  maxLength={50}
                />
                <small style={styles.hint}>Must be unique (max 50 characters)</small>
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
          <div style={styles.loadingMessage}>Loading categories...</div>
        ) : error ? (
          <div style={styles.errorCard}>
            {error}
          </div>
        ) : categories.length === 0 ? (
          <div style={styles.emptyCard}>
            <p style={styles.emptyTitle}>No categories yet</p>
            <p style={styles.emptySubtitle}>Click "Add Category" to create your first category</p>
          </div>
        ) : (
          <div style={styles.categoryGrid}>
            {categories.map((category) => (
              <div key={category.id} style={styles.categoryCard}>
                <div style={styles.categoryHeader}>
                  <div>
                    <h3 style={styles.categoryName}>{category.name}</h3>
                    <p style={styles.categoryCount}>
                      {category.channel_count} {category.channel_count === 1 ? 'channel' : 'channels'}
                    </p>
                  </div>
                  <div style={styles.categoryActions}>
                    <button
                      onClick={() => handleEdit(category)}
                      style={styles.editButton}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(category.id, category.channel_count)}
                      style={styles.deleteButton}
                    >
                      Delete
                    </button>
                  </div>
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
    alignItems: 'start',
    marginBottom: '2rem',
  },
  backButton: {
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    border: '1px solid #2a2a3e',
    backgroundColor: 'transparent',
    color: '#b0b0b0',
    cursor: 'pointer',
    fontSize: '0.9rem',
    marginBottom: '1rem',
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
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  categoryCard: {
    backgroundColor: '#1a1a2e',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
  },
  categoryName: {
    color: '#ffffff',
    margin: '0 0 0.5rem 0',
    fontSize: '1.3rem',
  },
  categoryCount: {
    color: '#00d4ff',
    margin: 0,
    fontSize: '1rem',
    fontWeight: 'bold',
  },
  categoryActions: {
    display: 'flex',
    gap: '0.5rem',
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
};
