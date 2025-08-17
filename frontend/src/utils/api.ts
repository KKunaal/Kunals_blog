import axios from 'axios';
import type {
  LoginRequest,
  LoginResponse,
  Blog,
  CreateBlogRequest,
  UpdateBlogRequest,
  Comment,
  CreateCommentRequest,
  PaginationParams,
  SignupRequest,
} from '../types';

const API_BASE_URL = 'http://localhost:8080/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  validateToken: async () => {
    const response = await api.get('/auth/validate');
    return response.data;
  },

  signup: async (payload: SignupRequest) => {
    const response = await api.post('/auth/signup', payload);
    return response.data;
  },
};

// Public Blog API
export const publicBlogAPI = {
  getBlogs: async (params: PaginationParams = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.published_only !== undefined) queryParams.append('published_only', params.published_only.toString());
    if (params.language) queryParams.append('language', params.language);
    if ((params as any).sort_by) queryParams.append('sort_by', (params as any).sort_by as string);

    const response = await api.get(`/public/blogs?${queryParams.toString()}`);
    return response.data;
  },

  getBlog: async (id: string): Promise<{ blog: Blog }> => {
    const response = await api.get(`/public/blogs/${id}`);
    return response.data;
  },

  getComments: async (blogId: string): Promise<{ comments: Comment[] }> => {
    const response = await api.get(`/public/blogs/${blogId}/comments`);
    return response.data;
  },

  createComment: async (comment: CreateCommentRequest) => {
    const response = await api.post(`/public/blogs/${comment.blog_id}/comments`, comment);
    return response.data;
  },

  likeBlog: async (blogId: string) => {
    const response = await api.post(`/public/blogs/${blogId}/like`);
    return response.data;
  },

  unlikeBlog: async (blogId: string) => {
    const response = await api.delete(`/public/blogs/${blogId}/like`);
    return response.data;
  },

  checkLikeStatus: async (blogId: string): Promise<{ liked: boolean }> => {
    const response = await api.get(`/public/blogs/${blogId}/like-status`);
    return response.data;
  },
};

// Admin Blog API
export const adminBlogAPI = {
  getBlogs: async (params: PaginationParams = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    queryParams.append('published_only', 'false'); // Always get all blogs for admin
    if (params.language) queryParams.append('language', params.language);
    if ((params as any).sort_by) queryParams.append('sort_by', (params as any).sort_by as string);

    const response = await api.get(`/admin/blogs?${queryParams.toString()}`);
    return response.data;
  },

  getLikers: async (blogId: string, page = 1, limit = 5) => {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    const response = await api.get(`/admin/blogs/${blogId}/likers?${qs.toString()}`);
    return response.data as { items: { id: string; created_at: string; display: string; user_id?: string; ip_address?: string }[]; pagination: any };
  },

  getViewers: async (blogId: string, page = 1, limit = 5) => {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    const response = await api.get(`/admin/blogs/${blogId}/viewers?${qs.toString()}`);
    return response.data as { items: { id: string; created_at: string; display: string; user_id?: string; ip_address?: string }[]; pagination: any };
  },

  createBlog: async (blog: CreateBlogRequest) => {
    const response = await api.post('/admin/blogs', blog);
    return response.data;
  },

  updateBlog: async (id: string, blog: UpdateBlogRequest) => {
    const response = await api.put(`/admin/blogs/${id}`, blog);
    return response.data;
  },

  applyVersion: async (id: string, versionId: string) => {
    const response = await api.post(`/admin/blogs/${id}/versions/${versionId}/apply`);
    return response.data;
  },

  deleteBlog: async (id: string) => {
    const response = await api.delete(`/admin/blogs/${id}`);
    return response.data;
  },

  publishBlog: async (id: string) => {
    const response = await api.post(`/admin/blogs/${id}/publish`);
    return response.data;
  },

  unpublishBlog: async (id: string) => {
    const response = await api.post(`/admin/blogs/${id}/unpublish`);
    return response.data;
  },

  uploadImage: async (file: File): Promise<{ url: string; filename: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await api.post('/admin/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default api;
