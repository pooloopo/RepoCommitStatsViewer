import React, { useState } from 'react';
import { Search, LogOut, Github, ExternalLink, User } from 'lucide-react';

const RepoListPage = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data - Cursor will eventually replace this with your Firebase/GitHub API logic
  const repos = [
    { id: 1, name: "RepoCommitStatsViewer", owner: "pooloopo", lastContrib: "2 mins ago" },
    { id: 2, name: "nextjs-portfolio", owner: "vercel", lastContrib: "1 hour ago" },
    { id: 3, name: "awesome-react", owner: "facebook", lastContrib: "Yesterday" },
  ];

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] font-sans">
      {/* NAVBAR - Matches Fig 1.1 Top Menu */}
      <nav className="border-b border-[#30363d] bg-[#161b22] px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Github size={32} className="text-white" />
          <h1 className="text-lg font-semibold hidden md:block">GitPulse</h1>
        </div>

        {/* Search Bar - SC1: Search functionality */}
        <div className="relative w-full max-w-md mx-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" size={18} />
          <input 
            type="text"
            placeholder="Search contributed repos..."
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[#58a6ff] transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* User Profile & Logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[#30363d] cursor-pointer transition-colors group relative">
            <div className="w-8 h-8 rounded-full bg-[#30363d] flex items-center justify-center border border-[#8b949e]">
              <User size={18} />
            </div>
            <span className="text-sm font-medium hidden sm:block">pooloopo</span>
            
            {/* Simple Dropdown on Hover logic could go here */}
            <div className="absolute right-0 top-full pt-2 hidden group-hover:block">
              <div className="bg-[#161b22] border border-[#30363d] rounded-md shadow-xl p-2 w-40">
                <button></button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-white">Your Contributed Repos</h2>
            <p className="text-[#8b949e] text-sm mt-1">Sorted by most recent contribution</p>
          </div>
        </div>

        {/* REPO GRID - SC7: Performance/Pagination UI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {repos.map((repo) => (
            <div 
              key={repo.id}
              className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 hover:border-[#8b949e] transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-md bg-[#30363d] flex items-center justify-center">
                    <Github size={12} />
                  </div>
                  <span className="text-[#8b949e] text-sm">{repo.owner} /</span>
                </div>
                <h3 className="text-lg font-bold text-[#58a6ff] group-hover:underline cursor-pointer">
                  {repo.name}
                </h3>
                <p className="text-xs text-[#8b949e] mt-4 italic">
                  Last contribution: {repo.lastContrib}
                </p>
              </div>

              <button className="mt-6 w-full bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-semibold py-2 px-4 rounded-md flex items-center justify-center gap-2 transition-colors">
                View your stats
                <ExternalLink size={14} />
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default RepoListPage;