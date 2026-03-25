import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, GitCommit, FileCode, Activity, Save, 
  ExternalLink, ShieldAlert, Download, 
  Calendar, Users, Check, ChevronsUpDown, File
} from 'lucide-react';
import { GitHubLogoIcon } from '@radix-ui/react-icons';

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { 
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList 
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Recharts
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { fetchStatsForTimeframe, getTotalRepoCommits, type DetailedStats } from '@/services/githubApi';
import { db } from '@/db/database';

type Metric = 'commits' | 'lines' | 'files' | 'score';

// Mock Data
const MOCK_FILES = [
  "src/pages/RepoStatsPage.tsx", "src/App.tsx", "package.json", 
  "src/components/ui/button.tsx", "public/index.html", "src/lib/utils.ts"
];

const MOCK_GRAPH_DATA = [
  { day: 'Mon', commits: 5, lines: 450, files: 3, score: 7.2 },
  { day: 'Tue', commits: 8, lines: 1200, files: 12, score: 8.5 },
  { day: 'Wed', commits: 3, lines: 150, files: 2, score: 6.8 },
  { day: 'Thu', commits: 12, lines: 2100, files: 18, score: 9.1 },
  { day: 'Fri', commits: 7, lines: 800, files: 9, score: 8.0 },
  { day: 'Sat', commits: 1, lines: 50, files: 1, score: 5.5 },
  { day: 'Sun', commits: 2, lines: 110, files: 2, score: 6.2 },
  { day: '12', commits: 2, lines: 110, files: 2, score: 6.2 },
];

const MOCK_CONTRIBUTORS = [
  { id: 1, user: 'pooloopo', commits: 45, lines: 3200, files: 28, score: 8.9, topFile: 'src/App.tsx' },
  { id: 2, user: 'octocat', commits: 32, lines: 1800, files: 15, score: 7.4, topFile: 'package.json' },
  { id: 3, user: 'dev-alpha', commits: 12, lines: 4500, files: 40, score: 9.5, topFile: 'src/pages/RepoStatsPage.tsx' },
];

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
    const fetchTotalCount = async () => {
      if (owner && repoName) {
        setLoadingStats(true);
        const count = await getTotalRepoCommits(owner, repoName);
        setTotalCommits(count);
        setLoadingStats(false);
      }
    };
    const loadAllStats = async () => {
      if (!owner || !repoName) return;

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
        atomicScore: data7d.atomicScore // Usually avg of the avg
      });
    };

    fetchTotalCount();
    loadAllStats();
  }, [owner, repoName]);

  const handleSaveSnapshot = async () => {
    if (!owner || !repoName || !stats7d) return;

    try {
      await db.snapshots.add({
        repoName,
        owner,
        timestamp: Date.now(),
        commits: stats7d.commits,
        lines: stats7d.lines,
        files: stats7d.files,
        atomicScore: stats7d.atomicScore
      });
      alert("Snapshot saved to local history!");
      loadHistoricalData(); // Refresh the graph immediately
    } catch (error) {
      console.error("Failed to save snapshot:", error);
    }
  };

  const [graphData, setGraphData] = useState<any[]>([]);

  const loadHistoricalData = async () => {
    if (!owner || !repoName) return;

    const history = await db.snapshots
      .where('[owner+repoName]')
  .equals([owner, repoName])
      .toArray();

    if (history.length > 0) {
      // Format for Recharts
      const formatted = history.map(s => ({
        day: new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        commits: s.commits,
        lines: s.lines,
        files: s.files,
        score: s.atomicScore,
        fullDate: s.timestamp // for sorting
      })).sort((a, b) => a.fullDate - b.fullDate);

      setGraphData(formatted);
    } else {
      // Fallback if no snapshots exist yet
      setGraphData([]); 
    }
  };

useEffect(() => {
  loadHistoricalData();
}, [owner, repoName]);

  // State
  const [graphMetric, setGraphMetric] = useState<Metric>('commits');
  const [rankingMetric, setRankingMetric] = useState<Metric>('commits');
  const [rankingScope, setRankingScope] = useState<'entire' | 'file'>('entire');
  const [selectedFile, setSelectedFile] = useState("");
  const [openFileSearch, setOpenFileSearch] = useState(false);

  const metricLabels: Record<Metric, string> = {
    commits: "Commits",
    lines: "Lines Changed",
    files: "Files Changed",
    score: "Atomic Score"
  };

  // Logic: Ranking sorting
  const sortedContributors = useMemo(() => {
    return [...MOCK_CONTRIBUTORS].sort((a, b) => b[rankingMetric] - a[rankingMetric]);
  }, [rankingMetric]);

  // CSV Export Logic
  const downloadCSV = (data: any[], filename: string, headers: string) => {
    const csvContent = data.map(row => Object.values(row).join(",")).join("\n");
    const blob = new Blob([headers + "\n" + csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const chartConfig = { value: { label: metricLabels[graphMetric], color: "#2563eb" } };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 pb-20 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER AREA */}
        <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 border-b border-slate-200 pb-6 bg-white p-6 rounded-xl shadow-sm">
          
          {/* Left Side: Navigation and Repo Info */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <Button variant="outline" size="icon" onClick={() => navigate('/repos')} className="shrink-0 mt-1">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                {/* break-words handles the long names, lg:text-3xl keeps it prominent */}
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 break-words max-w-full">
                  <span className="text-slate-400 font-normal">{owner} /</span> {repoName}
                </h1>
                <Badge variant="outline" className="shrink-0 font-mono text-blue-600 border-blue-200 bg-blue-50 whitespace-nowrap">
                  {loadingStats ? (
                    "Loading commits..."
                  ) : (
                    `Total Commits: ${totalCommits?.toLocaleString()}`
                  )}
                </Badge>
              </div>
              
              <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Last Synced: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Right Side: Action Buttons Group */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:justify-end">
            <Button variant="outline" size="sm" asChild>
              <a href={`https://github.com/${owner}/${repoName}`} target="_blank" rel="noreferrer">
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

            <Button onClick={handleSaveSnapshot} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
              <Save className="w-4 h-4 mr-2" /> Snapshot
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
              <CardDescription>Visualizing {metricLabels[graphMetric]} trends</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={graphMetric} onValueChange={(v) => setGraphMetric(v as Metric)}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
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
                onClick={() => downloadCSV(MOCK_GRAPH_DATA, "velocity_data.csv", "Day,Commits,Lines,Files,Score")}
              >
                <Download className="w-4 h-4 mr-2" /> Export Graph (CSV)
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <LineChart data={graphData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                {/* Y Axis enabled and clearly visible */}
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  width={40}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Line type="monotone" dataKey={graphMetric} stroke="var(--color-value)" strokeWidth={3} dot={{ r: 4, fill: "white", strokeWidth: 2 }} />
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
              <Select value={rankingMetric} onValueChange={(v) => setRankingMetric(v as Metric)}>
                <SelectTrigger className="w-[140px] bg-white"><SelectValue /></SelectTrigger>
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
                  <Button variant="outline" className="w-[200px] justify-between bg-white">
                    {selectedFile ? MOCK_FILES.find((f) => f === selectedFile) : "Search files..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Search file path..." />
                    <CommandList>
                      <CommandEmpty>No file found.</CommandEmpty>
                      <CommandGroup>
                        {MOCK_FILES.map((file) => (
                          <CommandItem
                            key={file}
                            value={file}
                            onSelect={(currentValue) => {
                              setSelectedFile(currentValue === selectedFile ? "" : currentValue);
                              setOpenFileSearch(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedFile === file ? "opacity-100" : "opacity-0")} />
                            {file}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Button 
                variant="outline" 
                size="sm"
                onClick={() => downloadCSV(sortedContributors, "contributor_ranking.csv", "ID,User,Commits,Lines,Files,Score,TopFile")}
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
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">Files</TableHead>
                  <TableHead className="text-right font-bold text-blue-600">Atomic Score</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedContributors.map((c, i) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono-bold">#{i + 1}</TableCell>
                    <TableCell className="font-semibold text-slate-700">{c.user}</TableCell>
                    <TableCell className="text-right">{c.commits}</TableCell>
                    <TableCell className="text-right text-green-600">+{c.lines}</TableCell>
                    <TableCell className="text-right">{c.files}</TableCell>
                    <TableCell className="text-right text-blue-600 font-bold">{c.score}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <a href={`https://github.com/${owner}/${repoName}/commits?author=${c.user}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
      <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest">{title}</CardTitle>
    </CardHeader>
    <CardContent className="grid grid-cols-2 gap-y-4 gap-x-2">
      <MiniStat icon={<GitCommit className="w-3 h-3 text-blue-500" />} label="Commits" val={commits} />
      <MiniStat icon={<FileCode className="w-3 h-3 text-green-500" />} label="Lines" val={lines} />
      <MiniStat icon={<File className="w-3 h-3 text-orange-500" />} label="Files" val={files} />
      <MiniStat icon={<Activity className="w-3 h-3 text-purple-500" />} label="Atomic Score" val={score} />
    </CardContent>
  </Card>
);

const MiniStat = ({ icon, label, val }: any) => (
  <div className="flex items-center gap-3">
    <div className="p-1.5 bg-slate-100 rounded-md shrink-0">{icon}</div>
    <div>
      <p className="text-xs text-slate-400 font-medium leading-none mb-1">{label}</p>
      <p className="text-sm font-bold text-slate-700">{val}</p>
    </div>
  </div>
);

export default RepoStatsPage;