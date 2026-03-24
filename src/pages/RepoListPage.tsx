import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchUserRepositories, getRateLimitInfo, waitForRateLimitReset } from '../services/githubApi';
import { syncRepositoriesToDB } from '../services/dbSync';
import { type GitHubRepository } from '../services/githubApi';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import LoadingSpinner from '../components/LoadingSpinner';
import RateLimitWarning from '../components/RateLimitWarning';
import { GitHubLogoIcon } from '@radix-ui/react-icons';

export default function RepoListPage() {
  const navigate = useNavigate();
  const { accessToken, githubUsername } = useAuth();
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitResetTime, setRateLimitResetTime] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchRepositories = useCallback(
    async (pageNum: number = 1) => {
      if (!accessToken || !githubUsername) return;

      try {
        setError(null);
        const response = await fetchUserRepositories(accessToken, pageNum);
        const rateLimit = getRateLimitInfo();

        if (pageNum === 1) {
          setRepositories(response.repositories);
        } else {
          setRepositories((prev) => [...prev, ...response.repositories]);
        }

        await syncRepositoriesToDB(response.repositories);
        setHasMore(response.hasMore);
        setPage(pageNum);

        if (rateLimit && rateLimit.remaining === 0) {
          setRateLimited(true);
          setRateLimitResetTime(rateLimit.reset);
        }
      } catch (err) {
        if (err instanceof Error && err.message === 'RATE_LIMIT_EXCEEDED') {
          const rateLimit = getRateLimitInfo();
          if (rateLimit) {
            setRateLimited(true);
            setRateLimitResetTime(rateLimit.reset);
          }
        } else {
          setError(err instanceof Error ? err.message : 'Failed to fetch repositories');
        }
      } finally {
        setLoading(false);
      }
    },
    [accessToken, githubUsername]
  );

  const handleRetry = useCallback(async () => {
    if (rateLimitResetTime) {
      await waitForRateLimitReset();
      setRateLimited(false);
      setRateLimitResetTime(0);
      fetchRepositories(page);
    }
  }, [rateLimitResetTime, page, fetchRepositories]);

  useEffect(() => {
    fetchRepositories(1);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !rateLimited) {
          fetchRepositories(page + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [page, hasMore, loading, rateLimited, fetchRepositories]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Your Contributed Repositories
          </h1>
          <p className="text-muted-foreground">
            Repositories you've contributed to, sorted by most recently contributed
          </p>
        </div>

        {error && (
          <Card className="mb-6 p-4 border-red-900/50 bg-red-950/30">
            <p className="text-red-200">{error}</p>
          </Card>
        )}

        {rateLimited && (
          <RateLimitWarning
            resetTime={rateLimitResetTime}
            onRetry={handleRetry}
          />
        )}

        {loading && repositories.length === 0 ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : repositories.length === 0 ? (
          <Card className="p-8 text-center border-border">
            <GitHubLogoIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No repositories found. Make sure you have contributed to repositories on GitHub.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {repositories.map((repo) => (
              <Card
                key={repo.id}
                className="p-4 border-border hover:border-accent hover:bg-muted/50 transition-all cursor-pointer"
                onClick={() => navigate(`/repo/${repo.owner.login}/${repo.name}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-foreground truncate">
                        {repo.name}
                      </h3>
                      {repo.language && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          {repo.language}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {repo.owner.login}
                    </p>
                    {repo.description && (
                      <p className="text-sm text-foreground/80 mb-3 line-clamp-2">
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Updated {new Date(repo.updated_at).toLocaleDateString()}
                      </span>
                      {repo.stargazers_count > 0 && (
                        <span>★ {repo.stargazers_count}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-accent hover:text-accent hover:bg-accent/10 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(repo.html_url, '_blank');
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}

            {hasMore && (
              <div ref={observerTarget} className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
