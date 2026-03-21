import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { Search, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { searchRepositoriesInDB } from '../services/dbSync';
import { type Repository } from '../db/database';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Input } from './ui/input';
import { Button } from './ui/button';

export default function Navbar() {
  const navigate = useNavigate();
  const { githubUsername, logout, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Repository[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (searchTerm.trim()) {
      searchRepositoriesInDB(searchTerm).then((results) => {
        setSearchResults(results.slice(0, 8));
      });
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchTerm]);

  const handleSearchSelect = (repo: Repository) => {
    navigate(`/repo/${repo.owner}/${repo.name}`);
    setSearchTerm('');
    setShowResults(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      handleSearchSelect(searchResults[0]);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userInitials = githubUsername
    ? githubUsername.slice(0, 2).toUpperCase()
    : 'U';

  return (
    <nav className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <GitHubLogoIcon className="w-6 h-6" />
          <span className="font-semibold text-foreground">My Contributed Repos</span>
        </div>

        <div className="flex-1 max-w-sm relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search repositories..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowResults(true);
              }}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => searchTerm && setShowResults(true)}
              className="pl-9 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-secondary border border-border rounded-md shadow-lg z-50">
              {searchResults.map((repo) => (
                <button
                  key={repo.repoID}
                  onClick={() => handleSearchSelect(repo)}
                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm text-foreground hover:text-accent border-b border-border last:border-0 transition-colors"
                >
                  <div className="font-medium">{repo.name}</div>
                  <div className="text-xs text-muted-foreground">{repo.owner}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-auto p-0">
              <Avatar className="w-8 h-8">
                <AvatarImage
                  src={user?.photoURL || ''}
                  alt={githubUsername || 'User'}
                />
                <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground hidden sm:inline">
                {githubUsername}
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-foreground focus:bg-muted focus:text-foreground cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
