import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  type Customer,
  type CustomerInput,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
//import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customers — ISP SMS Console" },
      { name: "description", content: "Manage ISP customers: add, edit, filter, and delete." },
    ],
  }),
  component: CustomersPage,
});

const STATUSES = ["active", "suspended", "cancelled"] as const;
const emptyInput: CustomerInput = { name: "", phone: "", plan: "", status: "active", notes: "" };

// The backend requires this to be 6 characters — the actual value lives
// only server-side (DELETE_CONFIRMATION_CODE in its .env), never here.
const CONFIRM_CODE_LENGTH = 6;

function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerInput>(emptyInput);
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);
  const [deleteCode, setDeleteCode] = useState("");

  const list = useQuery({
    queryKey: ["customers", { search, statusFilter }],
    queryFn: () =>
      listCustomers({
        search: search || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
    retry: false,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["customers"] });

  const createMut = useMutation({
    mutationFn: (data: CustomerInput) => createCustomer(data),
    onSuccess: () => {
      toast.success("Customer created");
      invalidate();
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomerInput> }) => updateCustomer(id, data),
    onSuccess: () => {
      toast.success("Customer updated");
      invalidate();
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: ({ id, code }: { id: string; code: string }) => deleteCustomer(id, code),
    onSuccess: () => {
      toast.success("Customer deleted");
      invalidate();
      closeDeleteDialog();
    },
    // Wrong/missing code surfaces here too (backend returns 403 with a
    // message) — dialog stays open so the user can retype it.
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyInput);
    setDialogOpen(true);
  }
  function openEdit(c: Customer) {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone, plan: c.plan, status: c.status, notes: c.notes ?? "" });
    setDialogOpen(true);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    if (editing) updateMut.mutate({ id: editing.id, data: form });
    else createMut.mutate(form);
  }

  function openDeleteDialog(c: Customer) {
    setConfirmDelete(c);
    setDeleteCode("");
  }
  function closeDeleteDialog() {
    setConfirmDelete(null);
    setDeleteCode("");
  }
  function confirmDeleteSubmit() {
    if (!confirmDelete) return;
    if (deleteCode.length !== CONFIRM_CODE_LENGTH) {
      toast.error(`Enter the ${CONFIRM_CODE_LENGTH}-character confirmation code`);
      return;
    }
    deleteMut.mutate({ id: confirmDelete.id, code: deleteCode });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage your ISP subscribers.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> New customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit customer" : "New customer"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+2547..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="plan">Plan</Label>
                  <Input id="plan" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} placeholder="10Mbps" />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                  {editing ? "Save" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-45"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : list.error ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-destructive py-8">
                  {(list.error as Error).message}
                </TableCell>
              </TableRow>
            ) : !list.data?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                  No customers yet. Add one or <a href="/customers/import" className="underline">import a CSV</a>.
                </TableCell>
              </TableRow>
            ) : (
              list.data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="font-mono text-sm">{c.phone}</TableCell>
                  <TableCell>{c.plan}</TableCell>
                  <TableCell>
                   
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(c)} aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && closeDeleteDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium">{confirmDelete?.name}</span>.
              Enter the {CONFIRM_CODE_LENGTH}-character confirmation code to proceed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="delete-confirm-code">Confirmation code</Label>
            <Input
              id="delete-confirm-code"
              type="password"
              autoFocus
              maxLength={CONFIRM_CODE_LENGTH}
              value={deleteCode}
              onChange={(e) => setDeleteCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmDeleteSubmit();
                }
              }}
              placeholder={"•".repeat(CONFIRM_CODE_LENGTH)}
              className="font-mono tracking-widest"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {/* Not AlertDialogAction here — that closes the dialog immediately
                on click, before we know if the code was right. We close it
                ourselves in deleteMut's onSuccess instead. */}
            <Button
              variant="destructive"
              onClick={confirmDeleteSubmit}
              disabled={deleteMut.isPending || deleteCode.length !== CONFIRM_CODE_LENGTH}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}