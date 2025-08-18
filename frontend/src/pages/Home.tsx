import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarIcon, HeartIcon, ChatBubbleLeftIcon, GlobeAltIcon, EyeIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/outline';
import { useInView } from 'react-intersection-observer';
import type { Blog } from '../types';
import { publicBlogAPI } from '../utils/api';
import { formatDate, timeAgo, stripHtml } from '../utils/helpers';
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
  const [sortBy, setSortBy] = useState<'publish_date' | 'most_commented' | 'most_liked' | 'most_viewed'>('publish_date');

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

  // initial load handled by the effect above

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

  const ASSET_BASE = import.meta.env.VITE_ASSET_BASE || 'http://localhost:8080';
  const pagesToShow = Array.from({ length: 4 }, (_, i) => page + i).filter((p) => p <= totalPages);
  return (
    <div className="min-h-screen flex flex-col" style={{ scrollbarGutter: 'stable both-edges' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col pb-32">
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
              <option value="publish_date">Most Recent (Publish Date)</option>
              <option value="most_liked">Most Liked</option>
              <option value="most_commented">Most Commented</option>
              <option value="most_viewed">Most Viewed</option>
            </select>
          </div>
          <div className="hidden sm:block" />
        </motion.div>

        {/* Blog Grid */}
        <motion.div 
          ref={ref}
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: isRefetching ? 0.6 : 1 } : { opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="relative flex-1"
        >
          {blogs.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 items-start content-start auto-rows-max">
              {blogs.map((blog, index) => (
                <motion.div
                  key={blog.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  layout
                >
                  <Link to={`/blog/${blog.id}`} className="block h-full group focus:outline-none">
                    <Card hover className="h-full overflow-hidden">
                      {/* Blog Image (if available) */}
                      {blog.images && (
                        <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                          <img
                            src={`${ASSET_BASE}${blog.images.split(',')[0]}`}
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
                        <h2 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {stripHtml(blog.title)}
                        </h2>

                        {/* Preview (preserve formatting, alignment, spaces/tabs) */}
                        <div
                          className="text-gray-600 mb-6 leading-relaxed not-prose whitespace-pre-wrap break-words tab-size-[4] [&_p]:whitespace-pre-wrap [&_li]:whitespace-pre-wrap [&_p:empty]:h-4 overflow-hidden"
                          style={{ maxHeight: '8rem' }}
                          dangerouslySetInnerHTML={{ __html: blog.content }}
                        />

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
                              className="flex items-center hover:text-gray-700 transition-colors"
                            >
                              <EyeIcon className="h-4 w-4 mr-1" />
                              {blog.views_count ?? 0}
                            </motion.span>
                            <motion.span 
                              whileHover={{ scale: 1.1 }}
                              className="flex items-center hover:text-blue-500 transition-colors"
                            >
                              <ChatBubbleLeftIcon className="h-4 w-4 mr-1" />
                              {blog.comments_count}
                            </motion.span>
                          </div>
                          <span className="flex items-center text-sm text-gray-400 whitespace-nowrap max-w-[10rem] sm:max-w-none overflow-hidden text-ellipsis">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {formatDate(blog.published_at || blog.created_at)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
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

        {/* Smooth refetch overlay */}
        {isRefetching && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
          </div>
        )}

        {/* Pagination (fixed at bottom of page) */}
        <div className="mt-auto" />
      </div>

      {totalPages > 1 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-16 sm:bottom-14 md:bottom-16 lg:bottom-20 z-40">
          <div className="flex justify-center">
            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-full px-3 py-2 border border-gray-200 shadow-lg">
              <Button
                aria-label="First page"
                onClick={() => setPage(1)}
                variant="ghost"
                size="sm"
                disabled={page === 1}
                className="min-w-[2.5rem]"
              >
                <ChevronDoubleLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                aria-label="Previous page"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                variant="ghost"
                size="sm"
                disabled={page === 1}
                className="min-w-[2.5rem]"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>

              <div className="px-1 text-xs text-gray-700 whitespace-nowrap flex items-center gap-1">
                {pagesToShow.map((p) => (
                  p === page ? (
                    <span
                      key={p}
                      aria-current="page"
                      className="inline-flex items-center justify-center h-7 min-w-[1.75rem] px-2 rounded-full bg-blue-600 text-white font-semibold"
                    >
                      {p}
                    </span>
                  ) : (
                    <Button
                      key={p}
                      aria-label={`Page ${p}`}
                      onClick={() => setPage(p)}
                      variant="ghost"
                      size="sm"
                      className="h-7 min-w-[1.75rem] px-2 rounded-full font-medium"
                    >
                      {p}
                    </Button>
                  )
                ))}
              </div>

              <Button
                aria-label="Next page"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                variant="ghost"
                size="sm"
                disabled={page === totalPages}
                className="min-w-[2.5rem]"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
              <Button
                aria-label="Last page"
                onClick={() => setPage(totalPages)}
                variant="ghost"
                size="sm"
                disabled={page === totalPages}
                className="min-w-[2.5rem]"
              >
                <ChevronDoubleRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
