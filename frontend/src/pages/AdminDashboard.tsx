import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, EyeOff, Calendar, Globe, BarChart3 } from 'lucide-react';
import type { Blog } from '../types';
import { adminBlogAPI } from '../utils/api';
import { formatDateTime, stripHtml, truncateText } from '../utils/helpers';
import toast from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [language, setLanguage] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'most_commented' | 'most_liked' | 'most_viewed'>('recent');
  const [isRefetching, setIsRefetching] = useState(false);

  useEffect(() => {
    fetchBlogs();
  }, [page, language, sortBy]);

  const fetchBlogs = async () => {
    try {
      if (loading) setLoading(true); else setIsRefetching(true);
      const response = await adminBlogAPI.getBlogs({
        page,
        limit: 10,
        language: language || undefined,
        sort_by: sortBy,
      });
      setBlogs(response.blogs);
      setTotalPages(response.pagination.total_pages);
      setTotalCount(response.pagination.total || 0);
    } catch (error) {
      console.error('Failed to fetch blogs:', error);
      toast.error('Failed to fetch blogs');
    } finally {
      setLoading(false);
      setIsRefetching(false);
    }
  };

  const handlePublishToggle = async (blog: Blog) => {
    try {
      if (blog.is_published) {
        await adminBlogAPI.unpublishBlog(blog.id);
        toast.success('Blog unpublished');
      } else {
        await adminBlogAPI.publishBlog(blog.id);
        toast.success('Blog published');
      }
      fetchBlogs(); // Refresh the list
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update blog status';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (blog: Blog) => {
    if (!confirm(`Are you sure you want to delete "${blog.title}"?`)) {
      return;
    }

    try {
      await adminBlogAPI.deleteBlog(blog.id);
      toast.success('Blog deleted successfully');
      fetchBlogs(); // Refresh the list
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete blog';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your blog posts</p>
          </div>
          <Link
            to="/admin/blog/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Blog Post
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Lifetime Views
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {blogs.reduce((acc, b) => acc + (b.views_count || 0), 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  <EyeOff className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Draft Blogs
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {blogs.filter(blog => !blog.is_published).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-green-100 rounded-md flex items-center justify-center">
                  <Globe className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Blogs
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {blogs.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
          <select value={language} onChange={(e) => { setLanguage(e.target.value); setPage(1); }} className="w-full rounded-md border border-gray-300 px-3 py-2">
            <option value="">All</option>
            <option value="english">English</option>
            <option value="devanagari">देवनागरी</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
          <select value={sortBy} onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }} className="w-full rounded-md border border-gray-300 px-3 py-2">
            <option value="recent">Most Recent</option>
            <option value="most_liked">Most Liked</option>
            <option value="most_commented">Most Commented</option>
            <option value="most_viewed">Most Viewed</option>
          </select>
        </div>
        <div className="hidden sm:block" />
      </div>

      {/* Top Pagination + Summary */}
      <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
        <div>
          {totalCount > 0 && (
            <span>
              Showing {Math.min((page - 1) * 10 + 1, totalCount)}–{Math.min(page * 10, totalCount)} of {totalCount}
            </span>
          )}
        </div>
        {totalPages > 1 && (
          <nav className="flex space-x-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  page === pageNum ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Blog List */}
      {blogs.length > 0 ? (
        <div className={`bg-white shadow overflow-hidden sm:rounded-md transition-opacity ${isRefetching ? 'opacity-60' : 'opacity-100'}`}>
          <ul className="divide-y divide-gray-200">
            {blogs.map((blog) => (
              <li key={blog.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <Link to={`/admin/blog/edit/${blog.id}`} className="flex-1 min-w-0 block group">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {stripHtml(blog.title)}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        blog.is_published 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {blog.is_published ? 'Published' : 'Draft'}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Globe className="h-3 w-3 mr-1" />
                        {blog.language === 'devanagari' ? 'देवनागरी' : 'English'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {truncateText(stripHtml(blog.preview), 160)}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {blog.published_at ? formatDateTime(blog.published_at) : formatDateTime(blog.created_at)}
                      </span>
                      <span>
                        {blog.likes_count} likes
                      </span>
                      <span>
                        {blog.comments_count} comments
                      </span>
                      <span>
                        {blog.views_count ?? 0} views
                      </span>
                    </div>
                  </Link>
                  
                  <div className="flex items-center space-x-2">
                    {blog.is_published && (
                      <Link
                        to={`/blog/${blog.id}`}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="View blog"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    )}
                    
                    <Link
                      to={`/admin/blog/edit/${blog.id}`}
                      className="text-gray-600 hover:text-gray-800 transition-colors"
                      title="Edit blog"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    
                    <button
                      onClick={() => handlePublishToggle(blog)}
                      className={`transition-colors ${
                        blog.is_published 
                          ? 'text-yellow-600 hover:text-yellow-800' 
                          : 'text-green-600 hover:text-green-800'
                      }`}
                      title={blog.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {blog.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    
                    <button
                      onClick={() => handleDelete(blog)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Delete blog"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">No blogs found.</p>
          <Link
            to="/admin/blog/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create your first blog post
          </Link>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <nav className="flex space-x-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  page === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
