import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  GitCommit,
  FileCode,
  Activity,
  FileSearch,
  Check,
  ChevronsUpDown,
  Users,
  Info,
  Trash2,
  Trophy,
  Search,
  FileText,
} from "lucide-react";

// Shadcn UI
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  fetchContributorStats,
  searchRepoContributors,
  searchRepoFiles,
  type ContributorStats,
} from "@/services/githubApi";

// --- MOCK DATA FOR EASY REPLACEMENT LATER ---
const MOCK_CONTRIBUTORS = [
  {
    login: "pooloopo",
    name: "Pooloopo",
    avatar: "https://github.com/pooloopo.png",
  },
  {
    login: "octocat",
    name: "The Octocat",
    avatar: "https://github.com/octocat.png",
  },
  { login: "shadcn", name: "Shadcn", avatar: "https://github.com/shadcn.png" },
  {
    login: "dev-ninja",
    name: "Dev Ninja",
    avatar: "https://github.com/identicons/dev.png",
  },
];

const MOCK_FILES = [
  "src/App.tsx",
  "src/components/ui/button.tsx",
  "src/pages/RepoStatsPage.tsx",
  "package.json",
];

const MOCK_STATS: Record<string, any> = {
  pooloopo: { commits: 342, lines: 15420, files: 45, atomicScore: 8.4 },
  octocat: { commits: 128, lines: 5200, files: 12, atomicScore: 9.1 },
  shadcn: { commits: 89, lines: 12050, files: 8, atomicScore: 7.5 },
  "dev-ninja": { commits: 450, lines: 8000, files: 112, atomicScore: 6.2 },
};

export default function CompareContributorsPage() {
  const { owner, repoName } = useParams();
  const navigate = useNavigate();

  // 1. Initialize as objects so the Avatar works immediately
  const [user1, setUser1] = useState({
    login: "Search Here",
    avatar: "https://github.com/pooloopo.png",
  });
  const [user2, setUser2] = useState({
    login: "Search Here",
    avatar: "https://github.com/octocat.png",
  });

  // 2. Add state for the dynamic search results
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");

  // 3. Create the search handler
  const handleUserSearch = async (query: string) => {
    setUserSearchTerm(query);

    // Guard clause: Only search if we have the repository context
    if (!owner || !repoName) return;

    setIsSearchingUsers(true);
    try {
      // Pass owner and repoName to the updated API function
      const results = await searchRepoContributors(owner, repoName, query);
      setUserSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  // 2. Update stats effect to use user.login
  useEffect(() => {
    const loadData = async () => {
      if (owner && repoName) {
        setLoadingStats(true);
        try {
          const [res1, res2] = await Promise.all([
            fetchContributorStats(owner, repoName, user1.login, fileScope), // Added .login
            fetchContributorStats(owner, repoName, user2.login, fileScope), // Added .login
          ]);
          setStats1(res1);
          setStats2(res2);
        } catch (err) {
          console.error("Failed to fetch comparison stats", err);
        } finally {
          setLoadingStats(false);
        }
      }
    };
    loadData();
  }, [user1.login, user2.login, owner, repoName]); // Track .login changes

  const [fileScope, setFileScope] = useState<string>("entire");

  // Autocomplete States
  const [openFileSearch, setOpenFileSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileSearchResults, setFileSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      // Query has to be greater than 2 because Github search indexing requires it
      if (searchQuery.length >= 2 && owner && repoName) {
        setIsSearching(true);
        const results = await searchRepoFiles(owner, repoName, searchQuery);
        setFileSearchResults(results);
        setIsSearching(false);
      } else {
        setFileSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, owner, repoName]);

  // Dropdown UI states
  const [openU1, setOpenU1] = useState(false);
  const [openU2, setOpenU2] = useState(false);

  const [stats1, setStats1] = useState<ContributorStats | null>(null);
  const [stats2, setStats2] = useState<ContributorStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Add an effect to fetch data
  useEffect(() => {
    const loadData = async () => {
      if (owner && repoName) {
        setLoadingStats(true);
        try {
          const [res1, res2] = await Promise.all([
            fetchContributorStats(owner, repoName, user1.login, fileScope),
            fetchContributorStats(owner, repoName, user2.login, fileScope),
          ]);
          setStats1(res1);
          setStats2(res2);
        } catch (err) {
          console.error("Failed to fetch comparison stats", err);
        } finally {
          setLoadingStats(false);
        }
      }
    };

    loadData();
  }, [user1, user2, fileScope, owner, repoName]);

  const handleExportCSV = () => {
    // Placeholder for SC8 functionality
    console.log("Exporting CSV for", user1, "and", user2);
    alert("CSV Download started!");
  };

  // --- Helper Components ---

  function StatList({
    stats,
    opponentStats,
    align,
  }: {
    stats: any;
    opponentStats: any;
    align: "left" | "right";
  }) {
    stats = stats || { commits: 0, lines: 0, files: 0, atomicScore: 0 };
    opponentStats = opponentStats || {
      commits: 0,
      lines: 0,
      files: 0,
      atomicScore: 0,
    };
    return (
      <div className="divide-y divide-slate-100">
        <StatRow
          label="Total Commits"
          icon={<GitCommit className="w-5 h-5 text-blue-500" />}
          val={loadingStats ? "Loading stats..." : stats.commits}
          isGreater={stats.commits > opponentStats.commits}
          align={align}
        />
        <StatRow
          label="Lines Changed"
          icon={<FileCode className="w-5 h-5 text-red-500" />}
          val={loadingStats ? "Loading stats..." : stats.lines}
          isGreater={stats.lines > opponentStats.lines}
          align={align}
        />
        <StatRow
          label="Files Changed"
          icon={<FileSearch className="w-5 h-5 text-orange-500" />}
          val={loadingStats ? "Loading stats..." : stats.files}
          isGreater={stats.files > opponentStats.files}
          align={align}
        />
        <StatRow
          label="Avg. Atomic Score"
          icon={<Activity className="w-5 h-5 text-purple-500" />}
          val={loadingStats ? "Loading stats..." : stats.atomicScore}
          isGreater={stats.atomicScore > opponentStats.atomicScore}
          align={align}
        />
      </div>
    );
  }

  function StatRow({ label, icon, val, isGreater, align, format = "" }: any) {
    return (
      <div
        className={cn(
          "flex items-center p-5 transition-colors",
          isGreater ? "bg-green-50/50" : "bg-white",
          align === "right"
            ? "flex-row-reverse text-right"
            : "flex-row text-left",
        )}
      >
        <div
          className={cn(
            "p-3 rounded-xl shrink-0",
            isGreater ? "bg-green-100/50" : "bg-slate-50",
          )}
        >
          {icon}
        </div>
        <div className={cn("flex-1", align === "right" ? "pr-4" : "pl-4")}>
          <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
          <p
            className={cn(
              "text-3xl font-black tracking-tight",
              isGreater ? "text-green-600" : "text-slate-800",
            )}
          >
            {format}
            {val?.toLocaleString()}
          </p>
        </div>
        {isGreater && (
          <div className="px-4">
            <Badge className="bg-green-500 hover:bg-green-600 border-none shadow-sm text-white">
              Higher
            </Badge>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Top Navigation */}
      {/* 1. HEADER & TITLE */}
      <div className="max-w-7xl mx-auto px-8 pt-10">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-slate-500 hover:text-slate-900 mb-6 -ml-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Repository
        </Button>

        <div className="space-y-1 mb-8 text-center md:text-left">
          <p className="text-sm font-bold text-blue-600 uppercase tracking-[0.2em]">
            {owner} / {repoName}
          </p>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            Compare Contribution Stats of {user1.login} and {user2.login}
          </h1>
        </div>

        {/* 2. FILTER & ACTION TOOLBAR */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="flex items-center gap-3">
            <Popover open={openFileSearch} onOpenChange={setOpenFileSearch}>
              <span className="pl-8">Within:</span>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-[350px] justify-between bg-white text-xs h-8"
                >
                  <span className="truncate">
                    {fileScope === "entire"
                      ? "Entire Repository (Up to 100 most recent commits)"
                      : fileScope.split("/").pop()}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search files (e.g. index.ts)..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    {isSearching && (
                      <div className="p-4 text-xs text-center text-slate-500">
                        Searching GitHub...
                      </div>
                    )}

                    {/* Static option to reset to entire repo */}
                    <CommandGroup>
                      <CommandItem
                        value="entire"
                        onSelect={() => {
                          setFileScope("entire");
                          setOpenFileSearch(false);
                          setSearchQuery("");
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            fileScope === "entire"
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        Entire Repository
                      </CommandItem>
                    </CommandGroup>

                    {/* Dynamic Search Results */}
                    <CommandGroup heading="Files">
                      {fileSearchResults.map((path) => (
                        <CommandItem
                          key={path}
                          value={path}
                          onSelect={() => {
                            setFileScope(path);
                            setOpenFileSearch(false);
                            setSearchQuery("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              fileScope === path ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium truncate">
                              {path.split("/").pop()}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate">
                              {path}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>

                    {!isSearching &&
                      fileSearchResults.length === 0 &&
                      searchQuery.length >= 2 && (
                        <CommandEmpty>No matching files found.</CommandEmpty>
                      )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <Button
            variant="outline"
            size="sm"
            //onClick={() => downloadCSV(graphData, "velocity_data.csv", "Day,Commits,Lines,Files,Score")}
          >
            <Download className="w-4 h-4 mr-2" /> Export Comparison (CSV)
          </Button>
        </div>

        {/* 3. LEGEND */}
        <div className="flex justify-center mb-8">
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 py-1 px-4 rounded-full flex items-center gap-2"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span className="font-bold text-[10px] uppercase tracking-widest">
              Green highlights indicate the lead contributor in that category
            </span>
          </Badge>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* USER 1 COLUMN */}
          <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-100 p-4 border-b border-slate-200">
              <UserSelector
                selected={user1}
                setSelected={setUser1}
                open={openU1}
                setOpen={setOpenU1}
                searchTerm={userSearchTerm} // Pass state
                onSearch={handleUserSearch} // Pass handler
                results={userSearchResults} // Pass results
                isLoading={isSearchingUsers} // Pass loading state
              />
            </div>
            <CardContent className="p-0 flex-1">
              <StatList stats={stats1} opponentStats={stats2} align="left" />
            </CardContent>
          </Card>

          {/* USER 2 COLUMN */}
          <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-100 p-4 border-b border-slate-200">
              <UserSelector
                selected={user2}
                setSelected={setUser2}
                open={openU2}
                setOpen={setOpenU2}
                searchTerm={userSearchTerm}
                onSearch={handleUserSearch}
                results={userSearchResults}
                isLoading={isSearchingUsers}
              />
            </div>
            <CardContent className="p-0 flex-1">
              <StatList stats={stats2} opponentStats={stats1} align="right" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper component for the searchable user dropdown
const UserSelector = ({
  selected,
  setSelected,
  open,
  setOpen,
  searchTerm,
  onSearch,
  results,
  isLoading,
}: any) => (
  <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        role="combobox"
        className="w-full justify-between bg-white h-12"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Avatar className="h-6 w-6">
            <AvatarImage src={selected.avatar} />
            <AvatarFallback>
              <Users size={12} />
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{selected.login}</span>
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent
      className="w-[300px] p-0"
      align="start"
      // Prevents the Popover from stealing focus when it opens
      onOpenAutoFocus={(e) => e.preventDefault()}
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search GitHub username..."
          value={searchTerm}
          onValueChange={onSearch}
        />
        <CommandList>
          {isLoading && (
            <div className="p-4 text-xs text-center text-slate-500">
              Searching...
            </div>
          )}
          <CommandEmpty>No users found.</CommandEmpty>
          <CommandGroup heading="Results">
            {results.map((user: any) => (
              <CommandItem
                key={user.login}
                value={user.login}
                onSelect={() => {
                  setSelected(user);
                  setOpen(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar} />
                  </Avatar>
                  <span>{user.login}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
);