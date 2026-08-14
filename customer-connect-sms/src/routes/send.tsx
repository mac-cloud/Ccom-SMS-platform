import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Send, Users } from "lucide-react";
import { toast } from "sonner";
import { listCustomers, sendSms, sendBulkSms, type Customer } from "@/lib/api";
import { smsSegments } from "@/lib/sms-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "lucide-react";

export const Route = createFileRoute("/send")({
  head: () => ({
    meta: [
      { title: "Send SMS — ISP SMS Console" },
      { name: "description", content: "Send a single SMS or a bulk campaign to your customers." },
    ],
  }),
  component: SendPage,
});

function Counter({ body }: { body: string }) {
  const s = smsSegments(body);
  return (
    <p className="text-xs text-muted-foreground mt-1">
      {s.chars} chars · {s.segments} SMS segment{s.segments === 1 ? "" : "s"}
    </p>
  );
}

function SinglePanel() {
  const customers = useQuery({ queryKey: ["customers"], queryFn: () => listCustomers(), retry: false });
  const [mode, setMode] = useState<"customer" | "manual">("customer");
  const [customerId, setCustomerId] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const send = useMutation({
    mutationFn: sendSms,
    onSuccess: () => { toast.success("SMS sent"); setMessage(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return toast.error("Message required");
    if (mode === "customer") {
      const c = customers.data?.find((x) => x.id === customerId);
      if (!c) return toast.error("Pick a customer");
      send.mutate({ to: c.phone, message, customer_id: c.id });
    } else {
      if (!phone.trim()) return toast.error("Phone required");
      send.mutate({ to: phone.trim(), message });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "customer" | "manual")}>
        <TabsList>
          <TabsTrigger value="customer">Pick customer</TabsTrigger>
          <TabsTrigger value="manual">Manual number</TabsTrigger>
        </TabsList>
        <TabsContent value="customer" className="mt-3">
          <Label>Customer</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger><SelectValue placeholder={customers.isLoading ? "Loading..." : "Choose customer"} /></SelectTrigger>
            <SelectContent>
              {customers.data?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} — {c.phone}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TabsContent>
        <TabsContent value="manual" className="mt-3">
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" placeholder="+2547..." value={phone} onChange={(e) => setPhone(e.target.value)} />
        </TabsContent>
      </Tabs>
      <div>
        <Label htmlFor="msg">Message</Label>
        <Textarea id="msg" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
        <Counter body={message} />
      </div>
      <Button type="submit" disabled={send.isPending}>
        <Send className="h-4 w-4" />
        {send.isPending ? "Sending..." : "Send SMS"}
      </Button>
    </form>
  );
}

function BulkPanel() {
  const customers = useQuery({ queryKey: ["customers"], queryFn: () => listCustomers(), retry: false });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState("all");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    const all = customers.data ?? [];
    return statusFilter === "all" ? all : all.filter((c) => c.status === statusFilter);
  }, [customers.data, statusFilter]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }
  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((c) => c.id)));
  }

  const send = useMutation({
    mutationFn: sendBulkSms,
    onSuccess: (r) => { toast.success(`Sent to ${r.succeeded}/${r.total}`); setMessage(""); setSelected(new Set()); },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return toast.error("Message required");
    if (selected.size === 0) return toast.error("Select at least one recipient");
    const recipients = (customers.data ?? []).filter((c) => selected.has(c.id)).map((c) => c.phone);
    send.mutate({ recipients, message, name: name.trim() || undefined });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Filter by status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All customers</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="bname">Campaign name (optional)</Label>
          <Input id="bname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Outage notice" />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">
            <Users className="inline h-4 w-4 mr-1" />
            Recipients <Badge variant="secondary" className="ml-1">{selected.size} selected</Badge>
          </CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
            {selected.size === filtered.length && filtered.length > 0 ? "Clear" : "Select all"}
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64 rounded-md border">
            <ul className="divide-y">
              {customers.isLoading ? (
                <li className="p-4 text-sm text-muted-foreground">Loading...</li>
              ) : filtered.length === 0 ? (
                <li className="p-4 text-sm text-muted-foreground">No customers.</li>
              ) : (
                filtered.map((c: Customer) => (
                  <li key={c.id} className="flex items-center gap-3 p-2">
                    <Checkbox
                      checked={selected.has(c.id)}
                      onCheckedChange={() => toggle(c.id)}
                      id={`chk-${c.id}`}
                    />
                    <label htmlFor={`chk-${c.id}`} className="flex-1 flex justify-between text-sm cursor-pointer">
                      <span className="font-medium">{c.name}</span>
                      <span className="font-mono text-muted-foreground">{c.phone}</span>
                    </label>
                  </li>
                ))
              )}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>

      <div>
        <Label htmlFor="bmsg">Message</Label>
        <Textarea id="bmsg" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
        <Counter body={message} />
      </div>

      <Button type="submit" disabled={send.isPending}>
        <Send className="h-4 w-4" />
        {send.isPending ? "Sending..." : `Send to ${selected.size} recipient${selected.size === 1 ? "" : "s"}`}
      </Button>
    </form>
  );
}

function SendPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Send SMS</h1>
        <p className="text-sm text-muted-foreground">Compose and send messages .</p>
      </header>

      <Tabs defaultValue="single">
        <TabsList>
          <TabsTrigger value="single">Single</TabsTrigger>
          <TabsTrigger value="bulk">Bulk</TabsTrigger>
        </TabsList>
        <TabsContent value="single"><Card><CardContent className="pt-6"><SinglePanel /></CardContent></Card></TabsContent>
        <TabsContent value="bulk"><Card><CardContent className="pt-6"><BulkPanel /></CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}