import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Search, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  fetchUserRepositories,
  type GitHubRepository,
} from "@/services/githubApi";
import { debounce } from "lodash";

export default function Navbar() {
  const navigate = useNavigate();
  const { accessToken, githubUsername, logout, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<GitHubRepository[]>([]);
  const [showResults, setShowResults] = useState(false);

  // 1. Memoize the debounced function so it persists across renders
  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        async function doSearch() {
          if (accessToken) {
            const { repositories } = await fetchUserRepositories(5, query);
            setSearchResults(repositories.slice(0, 8));
          } else {
            setSearchResults([]);
            setShowResults(false);
          }
        }
        void doSearch();
      }, 500),
    [],
  );

  // Call the debounced function whenever the dependency changes
  useEffect(() => {
    debouncedSearch(searchTerm);
    // Cleanup: cancel pending debounces if the component unmounts
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm, debouncedSearch]);

  const handleSearchSelect = (repo: GitHubRepository) => {
    navigate(`/repo/${repo.owner.login}/${repo.name}`);
    setSearchTerm("");
    setShowResults(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchResults.length > 0) {
      handleSearchSelect(searchResults[0]);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const userInitials = githubUsername
    ? githubUsername.slice(0, 2).toUpperCase()
    : "U";

  return (
    <nav className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <a href={"/repos"}>
          <div className="flex items-center gap-2">
            <GitHubLogoIcon className="w-6 h-6" />
            <span className="font-semibold text-foreground">
              My Contributed Repos
            </span>
          </div>
        </a>

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
              onFocus={() => setShowResults(true)}
              onBlur={() => setShowResults(false)}
              className="pl-9 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-secondary border border-border rounded-md shadow-lg z-50">
              {searchResults.map((repo) => (
                <button
                  key={`${repo.owner.login}/${repo.name}`}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevents the input from losing focus immediately
                    handleSearchSelect(repo);
                  }}
                  className="bg-white w-full text-left px-3 py-2 hover:bg-muted text-sm text-foreground border-b border-border last:border-0 transition-colors"
                >
                  <div className="font-medium">{repo.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {repo.owner.login}
                  </div>
                </button>
              ))}
              {searchResults.length <= 0 && (
                <div className="w-full text-left px-3 py-2 font-medium">
                  No results
                </div>
              )}
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 h-auto p-0"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage
                  src={user?.photoURL || ""}
                  alt={githubUsername || "User"}
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
