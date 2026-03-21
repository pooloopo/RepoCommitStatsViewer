import { useParams, useNavigate } from 'react-router-dom';
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
