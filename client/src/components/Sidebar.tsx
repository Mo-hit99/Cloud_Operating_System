import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "🏠",
      path: "/",
      description: "Overview and stats",
    },
    {
      id: "instances",
      label: "OS Manager",
      icon: "🐧",
      path: "/instances",
      description: "Linux systems",
    },
    {
      id: "launch",
      label: "Launch Instance",
      icon: "🚀",
      path: "/launch",
      description: "Create containers",
    },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:shadow-none lg:border-r lg:border-gray-200
        sm:w-72 md:w-80
      `}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm sm:text-lg">
                  O
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-gray-900 text-sm sm:text-base truncate">
                  Operating System
                </h2>
                <p className="text-xs text-gray-500 truncate">
                  Container Cloud Platform
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation - Flexible container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <nav className="space-y-1 sm:space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`
                  w-full flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-left transition-all duration-200
                  ${
                    isActive(item.path)
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                      : "hover:bg-gray-100 text-gray-700"
                  }
                `}
              >
                <span className="text-lg sm:text-xl flex-shrink-0">
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm sm:text-base truncate">
                    {item.label}
                  </div>
                  <div
                    className={`text-xs ${
                      isActive(item.path) ? "text-white/80" : "text-gray-500"
                    } truncate`}
                  >
                    {item.description}
                  </div>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* User Section - Fixed at bottom */}
        <div className="flex-shrink-0 p-3 sm:p-4 border-t border-gray-200 bg-gray-50/50">
          {/* User Info */}
          <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4 p-2 sm:p-3 bg-white rounded-xl shadow-sm">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm sm:text-base">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 text-sm sm:text-base truncate">
                {user?.username || "User"}
              </div>
              <div className="text-xs text-gray-500 truncate">
                Administrator
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-3 sm:px-4 py-2.5 sm:py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 font-medium text-sm sm:text-base border border-red-200 hover:border-red-300"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
