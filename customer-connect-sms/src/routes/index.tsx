import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Users, Send, TrendingUp, Wallet, AlertCircle, ChevronDown } from "lucide-react";
import { getStats, listMessages, ApiError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
//import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Bluewave SMS Console" },
      { name: "description", content: "Overview of customers, SMS activity and TalkSasa balance." },
    ],
  }),
  component: Dashboard,
});


const RECENT_PAGE_SIZE = 3;
const RECENT_FETCH_LIMIT = 50;

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  suffix,
}: {
  label: string;
  value?: number | string;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
  suffix?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">
            {value ?? "—"}
            {suffix ? <span className="text-sm text-muted-foreground ml-1">{suffix}</span> : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BackendError({ error }: { error: Error }) {
  const isApi = error instanceof ApiError;
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Backend unreachable</AlertTitle>
      <AlertDescription>
        {isApi ? error.message : "Could not reach the backend. Check VITE_API_BASE_URL and CORS."}
      </AlertDescription>
    </Alert>
  );
}

function Dashboard() {
  const stats = useQuery({ queryKey: ["stats"], queryFn: getStats, retry: false });
  const recent = useQuery({
    queryKey: ["messages", { limit: RECENT_FETCH_LIMIT }],
    queryFn: () => listMessages({ limit: RECENT_FETCH_LIMIT }),
    retry: false,
  });
  const [visibleCount, setVisibleCount] = useState(RECENT_PAGE_SIZE);

  const visibleMessages = recent.data?.slice(0, visibleCount) ?? [];
  const remaining = (recent.data?.length ?? 0) - visibleCount;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your Bluewave SMS activity.</p>
      </header>

      {stats.error ? <BackendError error={stats.error as Error} /> : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Customers" value={stats.data?.customers} icon={Users} loading={stats.isLoading} />
        <StatCard label="Sent Today" value={stats.data?.sent_today} icon={Send} loading={stats.isLoading} />
        <StatCard label="Sent This Month" value={stats.data?.sent_month} icon={TrendingUp} loading={stats.isLoading} />
        <StatCard
          label="Delivery Rate"
          value={stats.data ? `${stats.data.delivery_rate.toFixed(1)}%` : undefined}
          icon={TrendingUp}
          loading={stats.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" /> TalkSasa Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <div className="text-3xl font-bold">
                {stats.data ? stats.data.balance.toLocaleString() : "—"}
                <span className="text-sm font-normal text-muted-foreground ml-2">credits</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Messages</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : recent.error ? (
              <p className="text-sm text-muted-foreground">No data available.</p>
            ) : !recent.data?.length ? (
              <p className="text-sm text-muted-foreground">No messages yet.</p>
            ) : (
              <>
                <ul className="divide-y">
                  {visibleMessages.map((m) => (
                    <li key={m.id} className="flex items-center justify-between py-2 gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{m.phone}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.body}</p>
                      </div>
                      
                    </li>
                  ))}
                </ul>
                {remaining > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => setVisibleCount((v) => v + RECENT_PAGE_SIZE)}
                  >
                    <ChevronDown className="h-4 w-4" />
                    Show more ({remaining} more)
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}