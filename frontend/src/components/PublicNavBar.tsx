/**
 * PublicNavBar Component
 * Navigation bar for public pages (landing page)
 * Shows "Sign In" button when not authenticated
 * Shows user info and logout when authenticated
 */

import { FileText, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface PublicNavBarProps {
  onSignIn?: () => void
  onGetStarted?: () => void
}

export default function PublicNavBar({ onSignIn, onGetStarted }: PublicNavBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  const handleSignIn = () => {
    if (onSignIn) onSignIn();
    else navigate('/login');
  };

  const handleGetStarted = () => {
    if (onGetStarted) onGetStarted();
    else navigate('/register');
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <FileText className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">Clinical Docs Assistant</span>
          </Link>

          {/* Right side - Auth buttons */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* Dashboard button for logged-in users */}
                <button
                  onClick={handleGoToDashboard}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Go to Dashboard
                </button>

                {/* User info */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user.email}</p>
                  </div>

                  {/* Logout button */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            ) : (
              /* Auth buttons for guests */
              <>
                <button
                  onClick={handleSignIn}
                  className="px-5 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={handleGetStarted}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-colors"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
