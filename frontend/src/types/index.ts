export interface User {
  id: string;
  username: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Blog {
  id: string;
  title: string;
  content: string;
  preview: string;
  language: string;
  images: string;
  is_published: boolean;
  published_at?: string;
  custom_date?: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  comments?: Comment[];
  likes?: Like[];
  versions?: BlogVersion[];
}

export interface Comment {
  id: string;
  blog_id: string;
  author_name: string;
  email?: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
}

export interface Like {
  id: string;
  blog_id: string;
  created_at: string;
}

export interface BlogVersion {
  id: string;
  blog_id: string;
  title: string;
  content: string;
  language: string;
  images: string;
  is_pending: boolean;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  message: string;
}

export interface CreateBlogRequest {
  title: string;
  content: string;
  language?: string;
  images?: string[];
  custom_date?: string;
}

export interface UpdateBlogRequest {
  title?: string;
  content?: string;
  language?: string;
  images?: string[];
  custom_date?: string;
}

export interface CreateCommentRequest {
  blog_id: string;
  author_name?: string;
  email?: string;
  content: string;
  is_anonymous?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  published_only?: boolean;
  language?: string;
  sort_by?: 'recent' | 'most_commented' | 'most_liked' | 'most_viewed';
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiResponse<T> {
  message?: string;
  error?: string;
  data?: T;
}
