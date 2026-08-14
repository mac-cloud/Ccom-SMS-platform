import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listMessages, listCustomers } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
//import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Messages — ISP SMS Console" },
      { name: "description", content: "SMS delivery history and logs." },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("all");
  const [customerId, setCustomerId] = useState("all");

  const customers = useQuery({ queryKey: ["customers"], queryFn: () => listCustomers(), retry: false });

  const messages = useQuery({
    queryKey: ["messages", { from, to, status, customerId }],
    queryFn: () =>
      listMessages({
        from: from || undefined,
        to: to || undefined,
        status: status === "all" ? undefined : status,
        customer_id: customerId === "all" ? undefined : customerId,
        limit: 200,
      }),
    retry: false,
  });
  



  
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Message history</h1>
        <p className="text-sm text-muted-foreground">Every SMS sent through your backend.</p>
      </header>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Label htmlFor="from">From date</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="to">To date</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All customers</SelectItem>
                {customers.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : messages.error ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-destructive py-8">
                  {(messages.error as Error).message}
                </TableCell>
              </TableRow>
            ) : !messages.data?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                  No messages found.
                </TableCell>
              </TableRow>
            ) : (
              messages.data.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(m.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{m.phone}</TableCell>
                  <TableCell className="max-w-md">
                    <div className="truncate text-sm">{m.body}</div>
                    {m.error && <div className="text-xs text-destructive truncate">{m.error}</div>}
                  </TableCell>
                  <TableCell>
                   
                  </TableCell>
                  <TableCell className="text-right text-sm">
                  {Number(m.cost ?? 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
