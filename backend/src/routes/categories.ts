import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import {
  createCategory,
  getUserCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  isCategoryOwner,
  categoryNameExists,
} from '../db/queries';

const categories = new Hono();

// All category routes require authentication
categories.use('/*', authMiddleware);

/**
 * GET /categories
 * Get all categories for the current user with channel counts
 */
categories.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const userCategories = await getUserCategories(c.env.DB, userId);

    return c.json({
      success: true,
      categories: userCategories,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return c.json({ success: false, error: 'Failed to fetch categories' }, 500);
  }
});

/**
 * GET /categories/:id
 * Get a single category by ID
 */
categories.get('/:id', async (c) => {
  try {
    const categoryId = c.req.param('id');
    const userId = c.get('userId');

    // Check ownership
    const isOwner = await isCategoryOwner(c.env.DB, categoryId, userId);
    if (!isOwner) {
      return c.json({ success: false, error: 'Category not found or access denied' }, 404);
    }

    const category = await getCategoryById(c.env.DB, categoryId);
    if (!category) {
      return c.json({ success: false, error: 'Category not found' }, 404);
    }

    return c.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error('Get category error:', error);
    return c.json({ success: false, error: 'Failed to fetch category' }, 500);
  }
});

/**
 * POST /categories
 * Create a new category
 */
categories.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { name } = body;

    // Validate input
    if (!name) {
      return c.json({ success: false, error: 'Category name is required' }, 400);
    }

    // Validate name length
    if (name.trim().length < 1 || name.length > 50) {
      return c.json(
        { success: false, error: 'Category name must be between 1 and 50 characters' },
        400
      );
    }

    // Check if name already exists for this user
    const exists = await categoryNameExists(c.env.DB, userId, name);
    if (exists) {
      return c.json(
        { success: false, error: 'A category with this name already exists' },
        409
      );
    }

    // Create category
    const category = await createCategory(c.env.DB, userId, name);

    return c.json(
      {
        success: true,
        category,
      },
      201
    );
  } catch (error) {
    console.error('Create category error:', error);
    return c.json({ success: false, error: 'Failed to create category' }, 500);
  }
});

/**
 * PUT /categories/:id
 * Update a category name
 */
categories.put('/:id', async (c) => {
  try {
    const categoryId = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json();
    const { name } = body;

    // Validate input
    if (!name) {
      return c.json({ success: false, error: 'Category name is required' }, 400);
    }

    // Validate name length
    if (name.trim().length < 1 || name.length > 50) {
      return c.json(
        { success: false, error: 'Category name must be between 1 and 50 characters' },
        400
      );
    }

    // Check ownership
    const isOwner = await isCategoryOwner(c.env.DB, categoryId, userId);
    if (!isOwner) {
      return c.json({ success: false, error: 'Category not found or access denied' }, 404);
    }

    // Check if name already exists for this user (excluding current category)
    const exists = await categoryNameExists(c.env.DB, userId, name, categoryId);
    if (exists) {
      return c.json(
        { success: false, error: 'A category with this name already exists' },
        409
      );
    }

    // Update category
    await updateCategory(c.env.DB, categoryId, name);

    // Fetch updated category
    const updatedCategory = await getCategoryById(c.env.DB, categoryId);

    return c.json({
      success: true,
      category: updatedCategory,
    });
  } catch (error) {
    console.error('Update category error:', error);
    return c.json({ success: false, error: 'Failed to update category' }, 500);
  }
});

/**
 * DELETE /categories/:id
 * Delete a category (favorites will be set to uncategorized)
 */
categories.delete('/:id', async (c) => {
  try {
    const categoryId = c.req.param('id');
    const userId = c.get('userId');

    // Check ownership
    const isOwner = await isCategoryOwner(c.env.DB, categoryId, userId);
    if (!isOwner) {
      return c.json({ success: false, error: 'Category not found or access denied' }, 404);
    }

    // Delete category (this will also set favorites to uncategorized via the query)
    await deleteCategory(c.env.DB, categoryId);

    return c.json({
      success: true,
      message: 'Category deleted successfully. Associated favorites have been set to uncategorized.',
    });
  } catch (error) {
    console.error('Delete category error:', error);
    return c.json({ success: false, error: 'Failed to delete category' }, 500);
  }
});

export default categories;
