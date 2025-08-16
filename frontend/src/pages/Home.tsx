import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarIcon, HeartIcon, ChatBubbleLeftIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { useInView } from 'react-intersection-observer';
import type { Blog } from '../types';
import { publicBlogAPI } from '../utils/api';
import { formatDate, timeAgo, truncateText, stripHtml } from '../utils/helpers';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Loading } from '../components/ui/Loading';

const Home: React.FC = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'most_commented' | 'most_liked'>('recent');

  useEffect(() => {
    fetchBlogs();
  }, [page, selectedLanguage, sortBy]);

  const fetchBlogs = async () => {
    try {
      if (initialLoading) {
        setInitialLoading(true);
      } else {
        setIsRefetching(true);
      }
      const response = await publicBlogAPI.getBlogs({
        page,
        limit: 6,
        published_only: true,
        language: selectedLanguage || undefined,
        sort_by: sortBy,
      });
      setBlogs(response.blogs);
      setTotalPages(response.pagination.total_pages);
    } catch (error) {
      console.error('Failed to fetch blogs:', error);
    } finally {
      setInitialLoading(false);
      setIsRefetching(false);
    }
  };

  // initial load
  useEffect(() => {
    fetchBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    setPage(1);
  };

  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  if (initialLoading) {
    return <Loading size="xl" text="Loading amazing content..." fullScreen />;
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Languages</option>
              <option value="english">English</option>
              <option value="devanagari">देवनागरी</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="recent">Most Recent</option>
              <option value="most_liked">Most Liked</option>
              <option value="most_commented">Most Commented</option>
            </select>
          </div>
          <div className="hidden sm:block" />
        </motion.div>

        {/* Blog Grid */}
        <motion.div 
          ref={ref}
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: isRefetching ? 0.6 : 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {blogs.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {blogs.map((blog, index) => (
                <motion.div
                  key={blog.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  layout
                >
                  <Card hover className="h-full overflow-hidden group">
                    {/* Blog Image (if available) */}
                    {blog.images && (
                      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                        <img
                          src={`http://localhost:8080${blog.images.split(',')[0]}`}
                          alt={blog.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    )}

                    <div className="p-6">
                      {/* Language Badge & Time */}
                      <div className="flex items-center justify-between mb-4">
                        <Badge 
                          variant="primary" 
                          icon={<GlobeAltIcon className="h-3 w-3" />}
                        >
                          {blog.language === 'devanagari' ? 'देवनागरी' : 'English'}
                        </Badge>
                        <time className="text-sm text-gray-500" title={formatDate(blog.published_at || blog.created_at)}>
                          {timeAgo(blog.published_at || blog.created_at)}
                        </time>
                      </div>

                      {/* Title */}
                      <Link to={`/blog/${blog.id}`}>
                        <h2 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {stripHtml(blog.title)}
                        </h2>
                      </Link>

                      {/* Preview */}
                      <p className="text-gray-600 mb-6 leading-relaxed line-clamp-3">
                        {truncateText(stripHtml(blog.preview), 120)}
                      </p>

                      {/* Meta Info */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <motion.span 
                            whileHover={{ scale: 1.1 }}
                            className="flex items-center hover:text-red-500 transition-colors"
                          >
                            <HeartIcon className="h-4 w-4 mr-1" />
                            {blog.likes_count}
                          </motion.span>
                          <motion.span 
                            whileHover={{ scale: 1.1 }}
                            className="flex items-center hover:text-blue-500 transition-colors"
                          >
                            <ChatBubbleLeftIcon className="h-4 w-4 mr-1" />
                            {blog.comments_count}
                          </motion.span>
                        </div>
                        <span className="flex items-center text-sm text-gray-400">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {formatDate(blog.published_at || blog.created_at)}
                        </span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <GlobeAltIcon className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No blogs found</h3>
                <p className="text-gray-600">Check back later for amazing content!</p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-16 flex justify-center"
          >
            <div className="flex space-x-2 bg-white/50 backdrop-blur-sm rounded-2xl p-2 border border-white/20 shadow-lg">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <Button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  variant={page === pageNum ? 'primary' : 'ghost'}
                  size="sm"
                  className="min-w-[2.5rem]"
                >
                  {pageNum}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Home;
