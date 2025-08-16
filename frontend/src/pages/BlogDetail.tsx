import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  HeartIcon,
  ChatBubbleLeftIcon,
  CalendarIcon,
  GlobeAltIcon,
  ArrowLeftIcon,
  UserIcon,
  EyeSlashIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { publicBlogAPI } from '../utils/api';
import type { Blog, Comment, CreateCommentRequest } from '../types';
import { formatDate, timeAgo } from '../utils/helpers';
import { Loading } from '../components/ui/Loading';
import Button from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

const BlogDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  
  // Comment form state
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBlogData();
    }
  }, [id]);

  const fetchBlogData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const [blogResponse, commentsResponse, likeStatusResponse] = await Promise.all([
        publicBlogAPI.getBlog(id),
        publicBlogAPI.getComments(id),
        publicBlogAPI.checkLikeStatus(id).catch(() => ({ liked: false })) // Don't fail if not authenticated
      ]);

      setBlog(blogResponse.blog);
      setComments(commentsResponse.comments);
      setLiked(likeStatusResponse.liked);
      setLikesCount(blogResponse.blog.likes_count);
      setCommentsCount(blogResponse.blog.comments_count);
    } catch (error) {
      console.error('Error fetching blog:', error);
      toast.error('Failed to load blog post');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!id) return;

    try {
      if (liked) {
        await publicBlogAPI.unlikeBlog(id);
        setLiked(false);
        setLikesCount(prev => prev - 1);
        toast.success('❤️ Removed like');
      } else {
        await publicBlogAPI.likeBlog(id);
        setLiked(true);
        setLikesCount(prev => prev + 1);
        toast.success('💖 Liked!');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like status');
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !commentText.trim()) return;

    if (!isAnonymous && (!authorName.trim() || !authorEmail.trim())) {
      toast.error('Please provide your name and email');
      return;
    }

    try {
      setSubmittingComment(true);
      const commentData: CreateCommentRequest = {
        blog_id: id,
        content: commentText.trim(),
        is_anonymous: isAnonymous,
        ...(isAnonymous ? {} : { 
          author_name: authorName.trim(), 
          email: authorEmail.trim() 
        })
      };

      await publicBlogAPI.createComment(commentData);
      
      // Refresh comments
      const commentsResponse = await publicBlogAPI.getComments(id);
      setComments(commentsResponse.comments);
      setCommentsCount(prev => prev + 1);

      // Reset form
      setCommentText('');
      setAuthorName('');
      setAuthorEmail('');
      setShowCommentForm(false);
      
      toast.success('💬 Comment added successfully!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return <Loading size="xl" text="Loading blog post..." fullScreen />;
  }

  if (!blog) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Blog post not found</h1>
        <Button onClick={() => navigate('/')} className="mt-4">
          Go back home
        </Button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            size="sm"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Blog List
          </Button>
        </motion.div>

        {/* Blog Header */}
        <motion.header
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Badge 
              variant="primary" 
              icon={<GlobeAltIcon className="h-3 w-3" />}
            >
              {blog.language === 'devanagari' ? 'देवनागरी' : 'English'}
            </Badge>
            <time className="text-sm text-gray-500 flex items-center">
              <CalendarIcon className="h-4 w-4 mr-1" />
              {formatDate(blog.published_at || blog.created_at)}
            </time>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 leading-tight">
            {blog.title}
          </h1>

          {/* Blog Image */}
          {blog.images && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-8 rounded-2xl overflow-hidden shadow-2xl"
            >
              <img
                src={`http://localhost:8080${blog.images.split(',')[0]}`}
                alt={blog.title}
                className="w-full h-64 sm:h-96 object-cover"
              />
            </motion.div>
          )}
        </motion.header>

        {/* Blog Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-8 mb-8">
            <div 
              className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />
          </Card>
        </motion.div>

        {/* Engagement Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-12"
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLike}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${
                    liked 
                      ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-red-600'
                  }`}
                >
                  {liked ? (
                    <HeartSolidIcon className="h-5 w-5" />
                  ) : (
                    <HeartIcon className="h-5 w-5" />
                  )}
                  <span className="font-medium">{likesCount}</span>
                </motion.button>

                <button
                  onClick={() => setShowCommentForm(!showCommentForm)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                >
                  <ChatBubbleLeftIcon className="h-5 w-5" />
                  <span className="font-medium">{commentsCount}</span>
                </button>
              </div>

              <Button
                onClick={() => setShowCommentForm(!showCommentForm)}
                variant="primary"
                size="sm"
              >
                <ChatBubbleLeftIcon className="h-4 w-4 mr-2" />
                Add Comment
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Comment Form */}
        {showCommentForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8"
          >
            <Card className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Add a Comment</h3>
              
              <form onSubmit={handleSubmitComment} className="space-y-4">
                {/* Anonymous Toggle */}
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                      isAnonymous ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'
                    }`}
                  >
                    <EyeSlashIcon className="h-4 w-4" />
                    <span className="text-sm">Comment anonymously</span>
                  </button>
                </div>

                {/* Name and Email Fields */}
                {!isAnonymous && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your name"
                        required={!isAnonymous}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Email *
                      </label>
                      <input
                        type="email"
                        value={authorEmail}
                        onChange={(e) => setAuthorEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your email"
                        required={!isAnonymous}
                      />
                    </div>
                  </div>
                )}

                {/* Comment Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Comment *
                  </label>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Share your thoughts..."
                    required
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <Button
                    type="submit"
                    loading={submittingComment}
                    disabled={!commentText.trim()}
                  >
                    <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                    Post Comment
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowCommentForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}

        {/* Comments Section */}
        {comments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Comments ({comments.length})
            </h3>
            
            <div className="space-y-4">
              {comments.map((comment, index) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                >
                  <Card className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                          {comment.is_anonymous ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-600" />
                          ) : (
                            <UserIcon className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900">
                            {comment.is_anonymous ? 'Anonymous' : comment.author_name}
                          </h4>
                          <span className="text-sm text-gray-500">
                            {timeAgo(comment.created_at)}
                          </span>
                        </div>
                        
                        <p className="text-gray-700 leading-relaxed">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {comments.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ChatBubbleLeftIcon className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No comments yet</h3>
            <p className="text-gray-600 mb-4">Be the first to share your thoughts!</p>
            <Button onClick={() => setShowCommentForm(true)}>
              Add the first comment
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default BlogDetail;
