import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Eye, Calendar, Globe, ArrowLeft } from 'lucide-react';
import RichTextEditor from '../components/RichTextEditor';
import { adminBlogAPI, publicBlogAPI } from '../utils/api';
import type { Blog, CreateBlogRequest, UpdateBlogRequest, BlogVersion } from '../types';
import { formatDateTime } from '../utils/helpers';
import toast from 'react-hot-toast';

const BlogEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [blog, setBlog] = useState<Blog | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState<'english' | 'devanagari'>('english');
  const [customDate, setCustomDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [versions, setVersions] = useState<BlogVersion[]>([]);
  const [versionsPage, setVersionsPage] = useState(1);
  const versionsPerPage = 5;
  const [activeVersionPreview, setActiveVersionPreview] = useState<BlogVersion | null>(null);

  // Load existing blog if editing
  useEffect(() => {
    if (isEditing && id) {
      loadBlog(id);
    }
  }, [isEditing, id]);

  const loadBlog = async (blogId: string) => {
    try {
      setLoading(true);
      const response = await publicBlogAPI.getBlog(blogId);
      const blogData = response.blog;
      const vers = (response as any).versions || [];
      
      setBlog(blogData);
      setTitle(blogData.title);
      setContent(blogData.content);
      setLanguage(blogData.language as 'english' | 'devanagari');
      setVersions(vers);
      
      if (blogData.custom_date) {
        // Convert to local datetime format for input
        const date = new Date(blogData.custom_date);
        const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setCustomDate(localDateTime);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to load blog';
      toast.error(errorMessage);
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (publish: boolean = false) => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    try {
      setSaving(true);

      if (isEditing && id) {
        const updateData: UpdateBlogRequest = {
          title: title.trim(),
          content: content.trim(),
          language,
          custom_date: customDate || undefined,
        };
        if (publish) {
          await adminBlogAPI.updateBlog(id, updateData);
          await adminBlogAPI.publishBlog(id);
          toast.success('Published latest draft');
        } else {
          await adminBlogAPI.updateBlog(id, updateData);
          // flip button label to Publish in UI by marking blog unpublished locally
          setBlog((prev) => prev ? { ...prev, is_published: false } as Blog : prev);
          toast.success('Draft version created');
          // refresh versions list
          await loadBlog(id);
        }
      } else {
        // Create new blog
        const createData: CreateBlogRequest = {
          title: title.trim(),
          content: content.trim(),
          language,
          custom_date: customDate || undefined,
        };
        
        const response = await adminBlogAPI.createBlog(createData);
        const newBlogId = response.blog.id;
        
        if (publish) {
          await adminBlogAPI.publishBlog(newBlogId);
        }
        
        toast.success(`Blog ${publish ? 'published' : 'saved as draft'} successfully`);
      }

      if (!isEditing) {
        navigate('/admin');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to save blog';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!isEditing || !id || !blog) return;

    try {
      setSaving(true);
      
      if (blog.is_published) {
        await adminBlogAPI.unpublishBlog(id);
        toast.success('Blog unpublished');
      } else {
        // If previewing a version, apply that version first
        if (activeVersionPreview) {
          await adminBlogAPI.applyVersion(id, activeVersionPreview.id);
        } else {
          // Otherwise create a draft version from current editor state and apply it
          const updateData: UpdateBlogRequest = {
            title: title.trim(),
            content: content.trim(),
            language,
            custom_date: customDate || undefined,
          };
          const resp: any = await adminBlogAPI.updateBlog(id, updateData);
          const versionId = resp?.version?.id;
          if (versionId) {
            await adminBlogAPI.applyVersion(id, versionId);
          }
        }
        await adminBlogAPI.publishBlog(id);
        toast.success('Blog published');
        // Exit preview if any
        setActiveVersionPreview(null);
        setShowPreview(false);
      }
      
      // Reload blog data
      await loadBlog(id);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update blog status';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Statistics at top */}
      {blog && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-sm">
          <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
            <span className="text-gray-600">Status</span>
            <span className={blog.is_published ? 'text-green-600' : 'text-yellow-600'}>
              {blog.is_published ? 'Published' : 'Draft'}
            </span>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
            <span className="text-gray-600">Likes</span>
            <span className="text-gray-900">{blog.likes_count}</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
            <span className="text-gray-600">Comments</span>
            <span className="text-gray-900">{blog.comments_count}</span>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditing ? 'Edit Blog Post' : 'Create New Blog Post'}
              </h1>
              {isEditing && blog && (
                <p className="text-gray-600 mt-1">
                  {blog.is_published ? 'Published' : 'Draft'} • 
                  Last updated: {formatDateTime(blog.updated_at)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`${showPreview ? 'bg-blue-600 text-white hover:bg-blue-700 border-transparent' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'} inline-flex items-center px-3 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors`}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Exit Preview' : 'Preview'}
            </button>

            {/* Save Draft at top (hidden during preview of a version) */}
            {isEditing && !activeVersionPreview && (
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
            )}

            {isEditing && blog && !activeVersionPreview && (
              <button
                onClick={handlePublishToggle}
                disabled={saving}
                className={`inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors ${
                  blog.is_published
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-green-600 hover:bg-green-700'
                } disabled:opacity-50`}
              >
                {blog.is_published ? 'Unpublish' : 'Publish'}
              </button>
            )}
          </div>
          {activeVersionPreview && (
            <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm flex items-center justify-center gap-3">
              <button
                type="button"
                className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                onClick={() => {
                  setTitle(activeVersionPreview.title);
                  setContent(activeVersionPreview.content);
                  setLanguage(activeVersionPreview.language as 'english' | 'devanagari');
                  setBlog((prev)=> prev ? { ...prev, is_published: false } as Blog : prev);
                  toast.success('Loaded into editor. Publish to update live, or Save as Draft to store as a new version.');
                  setActiveVersionPreview(null);
                  setShowPreview(false);
                }}
              >
                Revert to this version
              </button>
              <button
                type="button"
                className="inline-flex items-center px-3 py-2 rounded-md border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
                onClick={() => setActiveVersionPreview(null)}
              >
                Exit preview
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Editor */}
        <div className="lg:col-span-3">
          {showPreview ? (
            <div className="bg-white border border-gray-300 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{(activeVersionPreview?.title ?? title) || 'Untitled'}</h2>
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: activeVersionPreview?.content ?? content }}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Blog Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter your blog title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-lg"
                />
              </div>

              {/* Content Editor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Start writing your blog post..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Language Selection */}
          <div className="bg-white border border-gray-300 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Globe className="h-4 w-4 mr-2" />
              Language
            </h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="english"
                  checked={language === 'english'}
                  onChange={(e) => setLanguage(e.target.value as 'english')}
                  className="mr-2"
                />
                English
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="devanagari"
                  checked={language === 'devanagari'}
                  onChange={(e) => setLanguage(e.target.value as 'devanagari')}
                  className="mr-2"
                />
                देवनागरी (Devanagari)
              </label>
            </div>
          </div>

          {/* Custom Publish Date (moved before versions) */}
          <div className="bg-white border border-gray-300 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Custom Publish Date
            </h3>
            <input
              type="datetime-local"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to use current date when publishing
            </p>
          </div>

          {/* Blog Stats (if editing) moved up above versions) */}
          {isEditing && blog && (
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Statistics</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={blog.is_published ? 'text-green-600' : 'text-yellow-600'}>
                    {blog.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Likes:</span>
                  <span>{blog.likes_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Comments:</span>
                  <span>{blog.comments_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Previous Versions below */}
          {isEditing && versions.length > 0 && (
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Previous Versions</h3>
              <div className="space-y-2 max-h-64 overflow-auto text-sm">
                <ul className="space-y-2">
                {versions.slice((versionsPage-1)*versionsPerPage, (versionsPage)*versionsPerPage).map((v) => {
                  const isPublished = blog && blog.content === v.content && blog.title === v.title && blog.language === v.language;
                  return (
                  <li key={v.id} className={`flex items-center justify-between gap-2 ${activeVersionPreview?.id === v.id ? 'bg-blue-50 border border-blue-200 rounded-md px-2 py-1' : ''}`}>
                    <button className="flex-1 min-w-0 text-left hover:underline"
                      onClick={() => { setActiveVersionPreview(v); setShowPreview(true); }}>
                      <div className="truncate font-medium text-gray-900 flex items-center gap-2">
                        {new Date(v.created_at).toLocaleString()}
                        {activeVersionPreview?.id === v.id && (<span className="text-xs text-blue-700">(Viewing)</span>)}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{v.title || 'Untitled'}</div>
                      {isPublished && <div className="text-xs text-green-600">(Published)</div>}
                    </button>
                    {/* Revert button removed per request; use the banner action while previewing */}
                  </li>
                )})}
                </ul>
                {versions.length > versionsPerPage && (
                  <div className="flex items-center justify-between pt-2">
                    <button className="text-xs px-2 py-1 border rounded" disabled={versionsPage===1} onClick={()=>setVersionsPage(p=>Math.max(1,p-1))}>Prev</button>
                    <span className="text-xs text-gray-500">Page {versionsPage} of {Math.ceil(versions.length/versionsPerPage)}</span>
                    <button className="text-xs px-2 py-1 border rounded" disabled={versionsPage>=Math.ceil(versions.length/versionsPerPage)} onClick={()=>setVersionsPage(p=>Math.min(Math.ceil(versions.length/versionsPerPage),p+1))}>Next</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogEditor;
