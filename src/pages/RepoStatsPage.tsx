/*import { useParams, useNavigate } from 'react-router-dom';
import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

export default function RepoStatsPage() {
  const { owner, repoName } = useParams<{ owner: string; repoName: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/repos')}
          className="mb-6 text-accent hover:text-accent hover:bg-accent/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Repositories
        </Button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <GitHubLogoIcon className="w-8 h-8 text-accent" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {repoName}
              </h1>
              <p className="text-muted-foreground">{owner}</p>
            </div>
          </div>
        </div>

        <Card className="p-8 border-border">
          <div className="text-center">
            <GitHubLogoIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Repository Statistics
            </h2>
            <p className="text-muted-foreground mb-6">
              Detailed analytics and statistics for {repoName} will be displayed here.
            </p>
            <p className="text-sm text-muted-foreground">
              Features coming soon including:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground inline-block">
              <li>✓ Commit history analysis</li>
              <li>✓ Contributor statistics</li>
              <li>✓ Code changes metrics</li>
              <li>✓ Technical debt tracking</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
*/
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, GitCommit, FileCode, Activity, Save, 
  ExternalLink, FileSearch, ShieldAlert, Download, 
  Calendar, Layers, User, ChevronDown, Search
} from 'lucide-react';

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Recharts
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

// --- Types & Mock Data ---
type Metric = 'commits' | 'lines' | 'files' | 'score';

const MOCK_GRAPH_DATA = [
  { day: 'Mon', commits: 5, lines: 450, files: 3, score: 7.2 },
  { day: 'Tue', commits: 8, lines: 1200, files: 12, score: 8.5 },
  { day: 'Wed', commits: 3, lines: 150, files: 2, score: 6.8 },
  { day: 'Thu', commits: 12, lines: 2100, files: 18, score: 9.1 },
  { day: 'Fri', commits: 7, lines: 800, files: 9, score: 8.0 },
  { day: 'Sat', commits: 1, lines: 50, files: 1, score: 5.5 },
  { day: 'Sun', commits: 2, lines: 110, files: 2, score: 6.2 },
];

const MOCK_CONTRIBUTORS = [
  { id: 1, user: 'pooloopo', commits: 45, lines: 3200, files: 28, score: 8.9 },
  { id: 2, user: 'octocat', commits: 32, lines: 1800, files: 15, score: 7.4 },
  { id: 3, user: 'dev-alpha', commits: 12, lines: 4500, files: 40, score: 9.5 },
];

const RepoStatsPage = () => {
  const { owner, repoName } = useParams();
  const navigate = useNavigate();

  // State
  const [lastSynced] = useState(new Date().toLocaleString());
  const [graphMetric, setGraphMetric] = useState<Metric>('commits');
  const [rankingMetric, setRankingMetric] = useState<Metric>('commits');
  const [rankingScope, setRankingScope] = useState<'entire' | 'file'>('entire');
  const [filePath, setFilePath] = useState('');

  // --- Success Criterion 8: CSV Export ---
  const handleExportCSV = () => {
    const headers = "Day,Commits,Lines,Files,AvgScore\n";
    const csvContent = MOCK_GRAPH_DATA.map(d => 
      `${d.day},${d.commits},${d.lines},${d.files},${d.score}`
    ).join("\n");
    
    const blob = new Blob([headers + csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repoName}_stats_export.csv`;
    a.click();
  };

  // --- Success Criterion 6: Snapshot ---
  const handleSaveSnapshot = () => {
    // This will eventually interface with your Dexie.js database
    console.log("Saving to IndexedDB...");
    alert(`Snapshot of ${repoName} saved to GitPulseDB!`);
  };

  const chartConfig = {
    value: {
      label: graphMetric.charAt(0).toUpperCase() + graphMetric.slice(1),
      color: "#58a6ff",
    },
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] p-8 pb-20 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* TOP HEADER AREA */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#30363d] pb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/repos')} className="hover:bg-[#30363d]">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">{repoName}</h1>
                <Badge variant="outline" className="border-[#30363d] text-[#8b949e]">Public</Badge>
              </div>
              <p className="text-sm text-[#8b949e] mt-1 flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Last Synced: {lastSynced}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" className="bg-[#21262d] border-[#30363d]" asChild>
              <a href={`https://github.com/${owner}/${repoName}`} target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" /> View on GitHub
              </a>
            </Button>
            <Button variant="outline" onClick={() => navigate('/audit')} className="bg-[#21262d] border-[#30363d]">
              <ShieldAlert className="w-4 h-4 mr-2" /> View Debt Audit
            </Button>
            <Button onClick={handleSaveSnapshot} className="bg-[#238636] hover:bg-[#2ea043] text-white">
              <Save className="w-4 h-4 mr-2" /> Save Snapshot Current Stats to IndexedDB
            </Button>
          </div>
        </header>

        {/* STATS OVERVIEW CARDS (Last 24h / 7d) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-[#161b22] border-[#30363d]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#8b949e]">Past 24 Hours Activity</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-white">4</p>
                <p className="text-xs text-[#8b949e]">Commits</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#3fb950]">+240</p>
                <p className="text-xs text-[#8b949e]">Lines Added</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#161b22] border-[#30363d]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#8b949e]">Past 7 Days Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-2">
              <MiniStat label="Commits" val="38" />
              <MiniStat label="Lines" val="2.4k" />
              <MiniStat label="Files" val="14" />
              <MiniStat label="Score" val="8.1" />
            </CardContent>
          </Card>
        </div>

        {/* PROGRESS VELOCITY GRAPH SECTION */}
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
            <div>
              <CardTitle className="text-white">Progress Velocity</CardTitle>
              <CardDescription>Daily average performance metrics</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={graphMetric} onValueChange={(v) => setGraphMetric(v as Metric)}>
                <SelectTrigger className="w-[180px] bg-[#0d1117] border-[#30363d]">
                  <SelectValue placeholder="Select Metric" />
                </SelectTrigger>
                <SelectContent className="bg-[#161b22] border-[#30363d] text-white">
                  <SelectItem value="commits">Commits</SelectItem>
                  <SelectItem value="lines">Lines Changed</SelectItem>
                  <SelectItem value="files">Files Changed</SelectItem>
                  <SelectItem value="score">Avg Atomic Score</SelectItem>
                </SelectContent>
              </Select>
              <Button size="icon" variant="outline" onClick={handleExportCSV} className="border-[#30363d] hover:bg-[#30363d]">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <LineChart data={MOCK_GRAPH_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#30363d" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#8b949e', fontSize: 12}} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey={graphMetric} 
                  stroke="var(--color-value)" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: "var(--color-value)" }} 
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* CONTRIBUTOR RANKING SECTION */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-white">Top Commit Contributors</h2>
            <div className="flex flex-wrap items-center gap-3">
              {/* Filter 1: Metric */}
              <Select value={rankingMetric} onValueChange={(v) => setRankingMetric(v as Metric)}>
                <SelectTrigger className="w-[140px] bg-[#161b22] border-[#30363d]">
                  <SelectValue placeholder="Metric" />
                </SelectTrigger>
                <SelectContent className="bg-[#161b22] border-[#30363d] text-white">
                  <SelectItem value="commits">Commits</SelectItem>
                  <SelectItem value="lines">Lines</SelectItem>
                  <SelectItem value="files">Files</SelectItem>
                  <SelectItem value="score">Score</SelectItem>
                </SelectContent>
              </Select>

              {/* Filter 2: Scope */}
              <Select value={rankingScope} onValueChange={(v) => setRankingScope(v as any)}>
                <SelectTrigger className="w-[140px] bg-[#161b22] border-[#30363d]">
                  <SelectValue placeholder="Scope" />
                </SelectTrigger>
                <SelectContent className="bg-[#161b22] border-[#30363d] text-white">
                  <SelectItem value="entire">Entire Repo</SelectItem>
                  <SelectItem value="file">By File Path</SelectItem>
                </SelectContent>
              </Select>

              {rankingScope === 'file' && (
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#8b949e]" />
                  <Input 
                    placeholder="src/components/auth.ts" 
                    className="pl-9 bg-[#161b22] border-[#30363d] text-white"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <Card className="bg-[#161b22] border-[#30363d] overflow-hidden">
            <Table>
              <TableHeader className="bg-[#0d1117]">
                <TableRow className="border-[#30363d] hover:bg-transparent">
                  <TableHead className="text-[#8b949e]">Rank</TableHead>
                  <TableHead className="text-[#8b949e]">Contributor</TableHead>
                  <TableHead className="text-right text-[#8b949e]">Commits</TableHead>
                  <TableHead className="text-right text-[#8b949e]">Lines</TableHead>
                  <TableHead className="text-right text-[#8b949e]">Files</TableHead>
                  <TableHead className="text-right text-[#8b949e]">Avg Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_CONTRIBUTORS.map((c, i) => (
                  <TableRow key={c.id} className="border-[#30363d] hover:bg-[#30363d]/20">
                    <TableCell className="font-mono text-[#8b949e]">#{i + 1}</TableCell>
                    <TableCell className="font-medium text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#30363d] flex items-center justify-center text-[10px]">
                        <User className="w-3 h-3" />
                      </div>
                      {c.user}
                    </TableCell>
                    <TableCell className="text-right text-[#FFFFFF]">{c.commits}</TableCell>
                    <TableCell className="text-right text-[#3fb950]">{c.lines.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-[#FFFFFF]">{c.files}</TableCell>
                    <TableCell className="text-right font-bold text-[#a371f7]">{c.score}</TableCell>
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
const MiniStat = ({ label, val }: { label: string, val: string }) => (
  <div className="border-r border-[#30363d] last:border-0 pr-2">
    <p className="text-lg font-semibold text-white">{val}</p>
    <p className="text-[10px] text-[#8b949e] uppercase">{label}</p>
  </div>
);

export default RepoStatsPage;