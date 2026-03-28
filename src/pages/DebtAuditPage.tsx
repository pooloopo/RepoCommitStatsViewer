import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShieldAlert,
  GitCommit,
  FileCode,
  Activity,
  ChevronDown,
  ExternalLink,
  User,
  FileSearch,
  Clock,
  Check,
  ChevronsUpDown,
} from "lucide-react";

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  fetchDebtAuditCommits,
  searchRepoContributors,
  type DebtCommit,
  type DebtOccurrence,
} from "@/services/githubApi";

import { cn } from "@/lib/utils"; // Ensure you have this utility for Shadcn
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
// Import the search function we created earlier
import { searchRepoFiles } from "@/services/githubApi";

// --- Sub-Component: Code Snippet Viewer ---
const SnippetViewer = ({ occurrences }: { occurrences: DebtOccurrence[] }) => {
  const [visibleCount, setVisibleCount] = useState(3);
  const remaining = occurrences.length - visibleCount;
  const nextChunk = Math.min(remaining, 20);

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-950 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between bg-slate-900 px-4 py-2 border-b border-slate-800">
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
          Code Analysis
        </span>
        <Badge
          variant="outline"
          className="text-[10px] border-slate-700 text-slate-500 bg-transparent"
        >
          {occurrences.length} Matches
        </Badge>
      </div>

      <div className="font-mono text-[13px] leading-relaxed">
        {occurrences.slice(0, visibleCount).map((occ, idx) => (
          <div
            key={idx}
            className="flex group hover:bg-slate-900/50 transition-colors border-b border-slate-900 last:border-0"
          >
            <div className="w-12 shrink-0 bg-slate-900/30 py-2 px-2 text-right text-slate-600 select-none border-r border-slate-800">
              {/* Use API field: lineNumber */}
              {occ.lineNumber}
            </div>
            <div className="flex-1 py-2 px-4 overflow-x-auto whitespace-pre text-slate-300">
              {/* Display the file name above the code snippet */}
              <div className="text-[10px] text-blue-400/70 mb-0.5 italic">
                {occ.file}
              </div>
              {/* Use API field: line */}
              <span className="text-amber-500/90">{occ.line}</span>
            </div>
          </div>
        ))}
      </div>

      {remaining > 0 && (
        <Button
          variant="ghost"
          onClick={() => setVisibleCount((prev) => prev + 20)}
          className="w-full h-10 rounded-none bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border-t border-slate-800"
        >
          <ChevronDown className="w-3 h-3 mr-2" />
          Show {nextChunk} more matches
        </Button>
      )}
    </div>
  );
};

const DebtAuditPage = () => {
  const { owner, repoName } = useParams();
  const navigate = useNavigate();

  // Filter States
  const [keyword, setKeyword] = useState("TODO");
  const [fileScope, setFileScope] = useState("entire");
  const [sort, setSort] = useState("recent");

  // Update the initial contributor state to be an object (matching UserSelector)
  const [contributor, setContributor] = useState({ login: "all", avatar: "" });

  //  Set open state to prevent another open
  const [openContributor, setOpenContributor] = useState(false);
  // Add search-specific states
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");

  // Add the search handler
  const handleUserSearch = async (query: string) => {
    setUserSearchTerm(query);
    if (!owner || !repoName) return;

    setIsSearchingUsers(true);
    try {
      const results = await searchRepoContributors(owner, repoName, query);
      setUserSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingUsers(false);
    }
  };

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

  // Data & Pagination States
  const [commits, setCommits] = useState<DebtCommit[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);

  // Function to load commits from the API
  const loadCommits = async (pageNum: number, reset: boolean = false) => {
    if (!owner || !repoName) return;
    setIsLoading(true);

    // Format the sort parameter to match API expectations
    const sortOrder = sort === "recent" ? "desc" : "asc";

    const data = await fetchDebtAuditCommits(
      owner,
      repoName,
      keyword,
      pageNum,
      contributor.login,
      fileScope,
      sortOrder,
    );

    // If we receive less than 20 items, there are no more pages to load
    if (data.length < 20) setHasMore(false);

    setCommits((prev) => (reset ? data : [...prev, ...data]));
    setIsLoading(false);
  };

  // Trigger fetch when filters change
  useEffect(() => {
    setCommits([]); // Clear old data
    setPage(1); // Reset to page 1
    setHasMore(true);
    loadCommits(1, true);
  }, [owner, repoName, keyword, fileScope, contributor, sort]);

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // If the target is visible, we have more data, and we aren't currently loading...
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadCommits(nextPage);
        }
      },
      { threshold: 1.0 },
    );

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, page]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* HEADER AREA - Matching RepoStats Style */}
        <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 border-b border-slate-200 pb-6 bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0 mt-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 break-words">
                  <span className="text-slate-400 font-normal">{owner} /</span>{" "}
                  {repoName}
                </h1>
                <Badge
                  variant="outline"
                  className="shrink-0 font-mono text-amber-600 border-amber-200 bg-amber-50"
                >
                  <ShieldAlert className="w-3 h-3 mr-1" /> Debt Audit Mode
                </Badge>
              </div>
              <p className="text-sm text-slate-500 mt-2 flex items-center gap-2 font-medium">
                Debt Audit of{" "}
                <span className="text-amber-600 font-bold">{keyword}</span> for
                <span className="text-slate-900 font-bold">
                  {fileScope === "entire" ? "Entire Repo" : fileScope}
                </span>{" "}
                by
                <span className="text-slate-900 font-bold">
                  {contributor.login === "all"
                    ? "All Contributors"
                    : contributor.login}
                </span>
              </p>
            </div>
          </div>
        </header>

        {/* FILTER BAR */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex flex-wrap gap-3">
            <Select value={keyword} onValueChange={setKeyword}>
              <SelectTrigger className="w-[120px] font-bold text-amber-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODO">TODO</SelectItem>
                <SelectItem value="FIXME">FIXME</SelectItem>
                <SelectItem value="HACK">HACK</SelectItem>
              </SelectContent>
            </Select>

            {/* Replace the fileScope Select with this: */}
            <Popover open={openFileSearch} onOpenChange={setOpenFileSearch}>
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
                        Entire Repository (Up to 100 most recent commits)
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

            <UserSelector
              selected={contributor}
              setSelected={setContributor}
              open={openContributor} // Add a new [openContributor, setOpenContributor] state
              setOpen={setOpenContributor}
              searchTerm={userSearchTerm}
              onSearch={handleUserSearch}
              results={[
                { login: "all", avatar: "" }, // Always allow resetting to "All"
                ...userSearchResults.filter((u) => u.login !== "all"),
              ]}
              isLoading={isSearchingUsers}
            />
          </div>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[180px] bg-slate-50 border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* COMMIT AUDIT FEED */}
        <div className="space-y-6">
          {commits.map((commit, i) => (
            <Card
              key={i}
              className="bg-white border-slate-200 shadow-sm overflow-hidden hover:border-blue-200 transition-colors"
            >
              <CardHeader className="pb-4 border-b border-slate-50 bg-slate-50/30">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                      <AvatarImage src={commit.avatarUrl} />
                      <AvatarFallback>
                        <User />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-800">
                        {commit.author}
                      </CardTitle>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{" "}
                          {new Date(commit.date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-blue-600">
                          <GitCommit className="w-3 h-3" /> {commit.sha}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold"
                    asChild
                  >
                    <a href="#">
                      View Commit <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-8 mb-6">
                  <MiniMetric
                    label="Lines Changed"
                    val={`+${commit.linesChanged}`}
                    icon={<FileCode className="text-green-500" />}
                  />
                  <MiniMetric
                    label="Files Affected"
                    val={commit.filesChanged}
                    icon={<FileSearch className="text-orange-500" />}
                  />
                  <MiniMetric
                    label="Atomic Score"
                    val={commit.atomicScore}
                    icon={<Activity className="text-purple-500" />}
                  />
                </div>

                <SnippetViewer occurrences={commit.occurrences} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* LOADING FOOTER / Infinite Scroll Target */}
        <div
          ref={observerTarget}
          className="py-10 flex flex-col items-center gap-4"
        >
          {isLoading && (
            <>
              <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                Scanning commits...
              </p>
            </>
          )}
          {!isLoading && !hasMore && commits.length > 0 && (
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              No more debt occurrences found
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Internal Helper Components ---
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
        className="w-[200px] justify-between bg-white h-8 text-xs"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {selected.login !== "all" ? (
            <Avatar className="h-5 w-5">
              <AvatarImage src={selected.avatar} />
              <AvatarFallback>
                <User size={10} />
              </AvatarFallback>
            </Avatar>
          ) : (
            <User size={14} className="text-slate-400" />
          )}
          <span className="truncate">
            {selected.login === "all" ? "All Contributors" : selected.login}
          </span>
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-[250px] p-0" align="start">
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search contributors..."
          value={searchTerm}
          onValueChange={onSearch}
        />
        <CommandList>
          {isLoading && (
            <div className="p-4 text-xs text-center text-slate-500">
              Searching...
            </div>
          )}
          <CommandGroup heading="Contributors">
            {results.map((user: any) => (
              <CommandItem
                key={user.login}
                onSelect={() => {
                  setSelected(user);
                  setOpen(false);
                }}
              >
                <div className="flex items-center gap-2">
                  {user.login === "all" ? (
                    <User size={14} />
                  ) : (
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={user.avatar} />
                    </Avatar>
                  )}
                  <span>
                    {user.login === "all" ? "All Contributors" : user.login}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
);

const MiniMetric = ({ icon, label, val }: any) => (
  <div className="flex items-center gap-3">
    <div className="p-2 bg-slate-50 rounded-lg shrink-0 border border-slate-100">
      {React.cloneElement(icon, { size: 14 })}
    </div>
    <div>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">
        {label}
      </p>
      <p className="text-sm font-bold text-slate-800">{val}</p>
    </div>
  </div>
);

export default DebtAuditPage;
