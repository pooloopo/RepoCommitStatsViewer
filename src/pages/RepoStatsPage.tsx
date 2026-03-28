import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  GitCommit,
  FileCode,
  Activity,
  Save,
  ExternalLink,
  ShieldAlert,
  Download,
  Calendar,
  Users,
  Check,
  ChevronsUpDown,
  File,
} from "lucide-react";
import { GitHubLogoIcon } from "@radix-ui/react-icons";

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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
import { cn } from "@/lib/utils";

// Recharts
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  fetchContributorRankings,
  fetchStatsForTimeframe,
  getTotalRepoCommits,
  searchRepoFiles,
  type DetailedStats,
} from "@/services/githubApi";
import { db } from "@/db/database";
import Dexie from "dexie";

type Metric = "commits" | "lines" | "files" | "score";

const RepoStatsPage = () => {
  const { owner, repoName } = useParams();
  const navigate = useNavigate();

  const [totalCommits, setTotalCommits] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // States for the 3 buckets
  const [stats24h, setStats24h] = useState<DetailedStats | null>(null);
  const [stats7d, setStats7d] = useState<DetailedStats | null>(null);
  const [statsAvg, setStatsAvg] = useState<DetailedStats | null>(null);

  useEffect(() => {
    if (!owner || !repoName) return;

    const fetchTotalCount = async () => {
      setLoadingStats(true);
      const count = await getTotalRepoCommits(owner, repoName);
      setTotalCommits(count);
      setLoadingStats(false);
    };

    const loadAllStats = async () => {
      // Fetch 24 hours (1 day)
      const data24h = await fetchStatsForTimeframe(owner, repoName, 1);
      setStats24h(data24h);

      // Fetch 7 days
      const data7d = await fetchStatsForTimeframe(owner, repoName, 7);
      setStats7d(data7d);

      // Calculate Average Daily (7 day total / 7)
      setStatsAvg({
        commits: parseFloat((data7d.commits / 7).toFixed(1)),
        lines: Math.round(data7d.lines / 7),
        files: parseFloat((data7d.files / 7).toFixed(1)),
        atomicScore: data7d.atomicScore, // Usually avg of the avg
      });
    };

    fetchTotalCount();
    loadAllStats();
  }, [owner, repoName]);

  const [graphData, setGraphData] = useState<any[]>([]);

  const loadHistoricalData = async () => {
    if (!owner || !repoName) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (await db.snapshots.count() > 0){
      const history = await db.snapshots
        .where("[owner+repoName+timestamp]")
        .between(
          [owner, repoName, Dexie.minKey], // Start range
          [owner, repoName, Dexie.maxKey], // End range
        )
        .toArray();
      
      if (history.length > 0) {
        // Format for Recharts
        const formatted = history
          .map((s) => ({
            day: new Date(s.timestamp).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            }),
            commits: s.commits,
            lines: s.lines,
            files: s.files,
            score: s.atomicScore,
            fullDate: s.timestamp, // for sorting
          }))
          .sort((a, b) => a.fullDate - b.fullDate);

        setGraphData(formatted);
        // Only return out of function if history data exists, otherwise setGraphData([])
        return;
      }
    }

    // Fallback if no snapshots exist yet
    setGraphData([]);
  };

  useEffect(() => {
    loadHistoricalData();
  }, [owner, repoName]);

  //Show alert if clicked
  const saveDailySnapshot = async (clicked: boolean) => {
    if (!owner || !repoName || !stats24h) return;

    // Get the start of the current day (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayTimestamp = today.getTime();

    const snapshotData = {
        owner: owner,
        repoName: repoName,
        timestamp: dayTimestamp,
        commits: stats24h.commits,
        lines: stats24h.lines,
        files: stats24h.files,
        atomicScore: stats24h.atomicScore,
      };

    if (await db.snapshots.count() < 1){
      // Create new record
        await db.snapshots.add(snapshotData);
        // Exit function without continuing because snapshot was just created
        return;
    }
    try {
      // Check if a snapshot for THIS repo and THIS day already exists
      const existingSnapshot = await db.snapshots
        .where("[owner+repoName+timestamp]")
        .equals([owner, repoName, dayTimestamp])
        .first();

      if (existingSnapshot?.id) {
        // Update existing record
        await db.snapshots.update(existingSnapshot.id, snapshotData);
        if (clicked) alert("Updated today's snapshot.");
      }

      // Refresh graph
      loadHistoricalData();
    } catch (err) {
      console.error("Snapshot failed:", err);
    }
  };

  // Auto-snapshot when stats arrive
  useEffect(() => {
    if (stats24h && !loadingStats) {
      saveDailySnapshot(false); //Don't show alert since the action wasn't clicked
    }
  }, [stats24h, loadingStats]); // Only triggers when stats are populated

  // State
  const [graphMetric, setGraphMetric] = useState<Metric>("commits");
  const [rankingMetric, setRankingMetric] = useState<Metric>("commits");
  const [rankingFileScope, setRankingFileScope] = useState("entire");
  const [openFileSearch, setOpenFileSearch] = useState(false);

  const metricLabels: Record<Metric, string> = {
    commits: "Commits",
    lines: "Lines Changed",
    files: "Files Changed",
    score: "Atomic Score",
  };

  const chartConfig = {
    value: { label: metricLabels[graphMetric], color: "#2563eb" },
  };

  // CSV Export Logic
  const downloadCSV = (data: any[], filename: string, headers: string) => {
    const csvContent = data
      .map((row) => Object.values(row).join(","))
      .join("\n");
    const blob = new Blob([headers + "\n" + csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  const [fileSearchResults, setFileSearchResults] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Use a useEffect to debounce the search (wait 500ms after user stops typing)
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

  const [contributors, setContributors] = useState<any[]>([]);
  const [isRankingLoading, setIsRankingLoading] = useState(false);

  const loadRankings = async () => {
    if (!owner || !repoName) return;
    setIsRankingLoading(true);

    let data = [];

    // USE THE COMMIT-BY-COMMIT METHOD (Necessary for specific file filtering)
    data = await fetchContributorRankings(owner, repoName, rankingFileScope);

    setContributors(data);
    setIsRankingLoading(false);
  };
  // Trigger refresh when the file selection or scope changes
  useEffect(() => {
    loadRankings();
  }, [owner, repoName, rankingFileScope, rankingFileScope]);

  // Logic for Sorting (Higher is Better)
  const sortedContributors = useMemo(() => {
    return [...contributors].sort(
      (a, b) => b[rankingMetric] - a[rankingMetric],
    );
  }, [contributors, rankingMetric]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 pb-20 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER AREA */}
        <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 border-b border-slate-200 pb-6 bg-white p-6 rounded-xl shadow-sm">
          {/* Left Side: Navigation and Repo Info */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/repos")}
              className="shrink-0 mt-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                {/* break-words handles the long names, lg:text-3xl keeps it prominent */}
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 break-words max-w-full">
                  <span className="text-slate-400 font-normal">{owner} /</span>{" "}
                  {repoName}
                </h1>
                <Badge
                  variant="outline"
                  className="shrink-0 font-mono text-blue-600 border-blue-200 bg-blue-50 whitespace-nowrap"
                >
                  {loadingStats
                    ? "Loading commits..."
                    : `Total Commits: ${totalCommits?.toLocaleString()}`}
                </Badge>
              </div>

              <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Last Synced:{" "}
                {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Right Side: Action Buttons Group */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:justify-end">
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://github.com/${owner}/${repoName}`}
                target="_blank"
                rel="noreferrer"
              >
                <GitHubLogoIcon className="w-4 h-4 mr-2" /> GitHub
              </a>
            </Button>

            {/* Compare Contributors Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/repo/${owner}/${repoName}/compare`)}
              className="border-slate-200 hover:bg-slate-100"
            >
              <Users className="w-4 h-4 mr-2" /> Compare Contributors
            </Button>

            {/* Debt Audit Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/repo/${owner}/${repoName}/audit`)}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              <ShieldAlert className="w-4 h-4 mr-2" /> Debt Audit
            </Button>

            <Button
              onClick={() => saveDailySnapshot(true)}
              disabled={!stats7d}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {/* Logic: If stats are loading, show "Processing..." */}
              {!stats24h ? "Loading Stats..." : "Sync Daily Snapshot"}
            </Button>
          </div>
        </header>

        {/* STAT BUCKETS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <StatBucket
            title="Last 24 Hours"
            commits={stats24h?.commits ?? "Loading..."}
            lines={stats24h ? `+${stats24h.lines}` : "Loading..."}
            files={stats24h?.files ?? "Loading..."}
            score={stats24h?.atomicScore ?? "Loading..."}
          />
          <StatBucket
            title="Last 7 Days"
            commits={stats7d?.commits ?? "Loading..."}
            lines={stats7d ? `+${stats7d.lines}` : "Loading..."}
            files={stats7d?.files ?? "Loading..."}
            score={stats7d?.atomicScore ?? "Loading..."}
          />
          <StatBucket
            title="Avg Daily Stats"
            commits={statsAvg?.commits ?? "Loading..."}
            lines={statsAvg?.lines ?? "Loading..."}
            files={statsAvg?.files ?? "Loading..."}
            score={statsAvg?.atomicScore ?? "Loading..."}
          />
        </div>

        {/* GRAPH SECTION */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-6">
            <div>
              <CardTitle>Project Velocity</CardTitle>
              <CardDescription>
                Visualizing {metricLabels[graphMetric]} trends
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={graphMetric}
                onValueChange={(v) => setGraphMetric(v as Metric)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commits">Commits</SelectItem>
                  <SelectItem value="lines">Lines Changed</SelectItem>
                  <SelectItem value="files">Files Changed</SelectItem>
                  <SelectItem value="score">Atomic Score</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadCSV(
                    graphData,
                    "velocity_data.csv",
                    "Day,Commits,Lines,Files,Score",
                  )
                }
              >
                <Download className="w-4 h-4 mr-2" /> Export Graph (CSV)
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <LineChart data={graphData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                {/* Y Axis enabled and clearly visible */}
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  width={40}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Line
                  type="monotone"
                  dataKey={graphMetric}
                  stroke="var(--color-value)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "white", strokeWidth: 2 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* RANKING SECTION */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-800">
              Top {metricLabels[rankingMetric]} Contributors
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={rankingMetric}
                onValueChange={(v) => setRankingMetric(v as Metric)}
              >
                <SelectTrigger className="w-[140px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commits">Commits</SelectItem>
                  <SelectItem value="lines">Lines</SelectItem>
                  <SelectItem value="files">Files</SelectItem>
                  <SelectItem value="score">Atomic Score</SelectItem>
                </SelectContent>
              </Select>

              {/* Autocomplete File Search */}
              <Popover open={openFileSearch} onOpenChange={setOpenFileSearch}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-[200px] justify-between bg-white text-xs h-8"
                  >
                    <span className="truncate">
                      {rankingFileScope === "entire"
                        ? "Entire Repository"
                        : rankingFileScope.split("/").pop()}
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
                            setRankingFileScope("entire");
                            setOpenFileSearch(false);
                            setSearchQuery("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              rankingFileScope === "entire"
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
                              setRankingFileScope(path);
                              setOpenFileSearch(false);
                              setSearchQuery("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                rankingFileScope === path
                                  ? "opacity-100"
                                  : "opacity-0",
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

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadCSV(
                    sortedContributors,
                    "contributor_ranking.csv",
                    "ID,User,Commits,Lines,Files,Score,TopFile",
                  )
                }
              >
                <Download className="w-4 h-4 mr-2" /> Export Ranking (CSV)
              </Button>
            </div>
          </div>

          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Contributor</TableHead>
                  <TableHead className="text-right">Commits</TableHead>
                  <TableHead className="text-right">Lines Changed</TableHead>
                  <TableHead className="text-right">Files Changed</TableHead>
                  <TableHead className="text-right font-bold text-blue-600">
                    Atomic Score
                  </TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isRankingLoading ? (
                  <TableRow key={0}>
                    <TableCell className="font-semibold text-slate-700 text-right">
                      Loading...
                    </TableCell>
                    <TableCell className="font-semibold text-slate-700 text-right">
                      Loading...
                    </TableCell>
                    <TableCell className="font-semibold text-slate-700 text-right">
                      Loading...
                    </TableCell>
                    <TableCell className="font-semibold text-slate-700 text-right">
                      Loading...
                    </TableCell>
                    <TableCell className="font-semibold text-slate-700 text-right">
                      Loading...
                    </TableCell>
                    <TableCell className="font-semibold text-slate-700 text-right">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedContributors.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono-bold">#{i + 1}</TableCell>
                      <TableCell className="font-semibold text-slate-700">
                        {c.user}
                      </TableCell>
                      {rankingMetric == "commits" ? (
                        <TableCell className="text-right font-bold text-green-600">
                          {c.commits}
                        </TableCell>
                      ) : (
                        <TableCell className="text-right">
                          {c.commits}
                        </TableCell>
                      )}
                      {rankingMetric == "lines" ? (
                        <TableCell className="text-right font-bold text-green-600">
                          {c.lines}
                        </TableCell>
                      ) : (
                        <TableCell className="text-right">{c.lines}</TableCell>
                      )}
                      {rankingMetric == "files" ? (
                        <TableCell className="text-right font-bold text-green-600">
                          {c.files}
                        </TableCell>
                      ) : (
                        <TableCell className="text-right">{c.files}</TableCell>
                      )}
                      {rankingMetric == "score" ? (
                        <TableCell className="text-right font-bold text-green-600">
                          {c.score}
                        </TableCell>
                      ) : (
                        <TableCell className="text-right">{c.score}</TableCell>
                      )}

                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <a
                            href={`https://github.com/${owner}/${repoName}/commits?author=${c.user}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
};

// --- Helper Components ---
const StatBucket = ({ title, commits, lines, files, score }: any) => (
  <Card className="bg-white border-slate-200 shadow-sm">
    <CardHeader className="pb-2 border-b border-slate-50 mb-4 bg-slate-50/50 rounded-t-xl">
      <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest">
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="grid grid-cols-2 gap-y-4 gap-x-2">
      <MiniStat
        icon={<GitCommit className="w-3 h-3 text-blue-500" />}
        label="Commits"
        val={commits}
      />
      <MiniStat
        icon={<FileCode className="w-3 h-3 text-green-500" />}
        label="Lines"
        val={lines}
      />
      <MiniStat
        icon={<File className="w-3 h-3 text-orange-500" />}
        label="Files"
        val={files}
      />
      <MiniStat
        icon={<Activity className="w-3 h-3 text-purple-500" />}
        label="Atomic Score"
        val={score}
      />
    </CardContent>
  </Card>
);

const MiniStat = ({ icon, label, val }: any) => (
  <div className="flex items-center gap-3">
    <div className="p-1.5 bg-slate-100 rounded-md shrink-0">{icon}</div>
    <div>
      <p className="text-xs text-slate-400 font-medium leading-none mb-1">
        {label}
      </p>
      <p className="text-sm font-bold text-slate-700">{val}</p>
    </div>
  </div>
);

export default RepoStatsPage;