import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpenIcon, UserIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from './ui/Badge';
import Button from './ui/Button';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 bg-spotlight">
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-40"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <motion.div 
              className="flex items-center"
              whileHover={{ scale: 1.05 }}
            >
              <Link
                to="/"
                className="flex items-center space-x-3 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="relative"
                >
                  <BookOpenIcon className="h-8 w-8 text-blue-600" />
                  <div className="absolute inset-0 bg-blue-600 opacity-20 rounded-full blur-md"></div>
                </motion.div>
                <span>MindKanvas</span>
              </Link>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {user && isAdmin && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/admin"
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isAdminRoute
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    <Cog6ToothIcon className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </motion.div>
              )}

              {user ? (
                <div className="flex items-center space-x-4">
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center space-x-3 bg-white/50 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20"
                  >
                    <UserIcon className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">{user.username}</span>
                    {isAdmin && (
                      <Badge variant="primary" size="sm">
                        Admin
                      </Badge>
                    )}
                  </motion.div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="text-gray-600 hover:text-red-600"
                    title="Logout"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link to="/signup">
                    <Button variant="outline" size="sm">
                      Start Writing
                    </Button>
                  </Link>
                  <Link to="/admin/login">
                    <Button variant="primary" size="sm">
                      Login
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-white/50 transition-all"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-5 w-5" />
                ) : (
                  <Bars3Icon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white/95 backdrop-blur-md border-t border-white/20"
            >
              <div className="px-4 py-4 space-y-3">
                {user && isAdmin && (
                  <Link
                    to="/admin"
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium ${
                      isAdminRoute
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Cog6ToothIcon className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                )}

                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-xl">
                      <UserIcon className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">{user.username}</span>
                      {isAdmin && (
                        <Badge variant="primary" size="sm">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium w-full"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      to="/signup"
                      className="block px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl text-sm font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Start writing
                    </Link>
                    <Link
                      to="/admin/login"
                      className="block px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl text-sm font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Login
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Main Content */}
      <main className="flex-1 relative">
        {/* Decorative background accents */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full blur-3xl opacity-30 bg-blue-300/40" />
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-30 bg-fuchsia-300/40" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="glass mt-auto"
      >
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="inline-block"
            >
              <p className="text-gray-600 text-sm">
                &copy; 2025 MindKanvas. Made with{' '}
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-red-500"
                >
                  ❤️
                </motion.span>{' '}
                By Kunal G.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

export default Layout;
