import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import Papa from "papaparse";
import { Upload, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { importCustomers, type CustomerInput, type ImportResult } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/customers/import")({
  head: () => ({
    meta: [
      { title: "Import Customers — ISP SMS Console" },
      { name: "description", content: "Bulk import customers from a CSV file with column mapping." },
    ],
  }),
  component: ImportPage,
});

type Row = Record<string, string>;
const FIELDS = ["name", "phone", "plan", "status", "notes"] as const;
type Field = (typeof FIELDS)[number];

function ImportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<Field, string>>>({});
  const [result, setResult] = useState<ImportResult | null>(null);

  const importMut = useMutation({
    mutationFn: (payload: CustomerInput[]) => importCustomers(payload),
    onSuccess: (r) => {
      setResult(r);
      toast.success(`Imported ${r.inserted} customers${r.failed ? `, ${r.failed} failed` : ""}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const h = res.meta.fields ?? [];
        setHeaders(h);
        setRows(res.data);
        const lower = h.map((x) => x.toLowerCase());
        const guess = (want: string[]) => {
          for (const w of want) {
            const idx = lower.findIndex((x) => x.includes(w));
            if (idx >= 0) return h[idx];
          }
          return undefined;
        };
        setMapping({
          name: guess(["name", "customer"]),
          phone: guess(["phone", "mobile", "msisdn", "number"]),
          plan: guess(["plan", "package"]),
          status: guess(["status", "state"]),
          notes: guess(["note", "comment"]),
        });
      },
      error: (err) => toast.error(`CSV parse error: ${err.message}`),
    });
  }

  function doImport() {
    if (!mapping.name || !mapping.phone) {
      toast.error("Map at least Name and Phone");
      return;
    }
    const payload: CustomerInput[] = rows.map((r) => ({
      name: (r[mapping.name!] ?? "").trim(),
      phone: (r[mapping.phone!] ?? "").trim(),
      plan: (mapping.plan ? r[mapping.plan] ?? "" : "").trim(),
      status: (mapping.status ? r[mapping.status] ?? "active" : "active").trim() || "active",
      notes: mapping.notes ? r[mapping.notes] ?? "" : "",
    })).filter((c) => c.name && c.phone);

    if (!payload.length) {
      toast.error("No valid rows to import");
      return;
    }
    importMut.mutate(payload);
  }

  return (
    <div className="space-y-6">
      <header>
        <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to customers
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Import customers from CSV</h1>
        <p className="text-sm text-muted-foreground">Upload a CSV, map the columns, then push to your backend.</p>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-base">1. Upload CSV</CardTitle></CardHeader>
        <CardContent>
          <Input type="file" accept=".csv,text/csv" onChange={onFile} />
          <p className="mt-2 text-xs text-muted-foreground">
            Expected columns: name, phone, plan, status, notes. Extra columns are ignored.
          </p>
        </CardContent>
      </Card>

      {headers.length > 0 && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">2. Map columns</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <div key={f}>
                  <Label className="capitalize">{f}{["name", "phone"].includes(f) ? " *" : ""}</Label>
                  <Select
                    value={mapping[f] ?? "__none__"}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [f]: v === "__none__" ? undefined : v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— none —</SelectItem>
                      {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">3. Preview ({rows.length} rows)</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {FIELDS.map((f) => <TableHead key={f} className="capitalize">{f}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 5).map((r, i) => (
                    <TableRow key={i}>
                      {FIELDS.map((f) => (
                        <TableCell key={f} className="text-sm">
                          {mapping[f] ? r[mapping[f]!] : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 5 && (
                <p className="mt-2 text-xs text-muted-foreground">Showing first 5 of {rows.length} rows.</p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setRows([]); setHeaders([]); setMapping({}); setResult(null); }}>
              Reset
            </Button>
            <Button onClick={doImport} disabled={importMut.isPending}>
              <Upload className="h-4 w-4" />
              {importMut.isPending ? "Importing..." : `Import ${rows.length} rows`}
            </Button>
          </div>
        </>
      )}

      {result && (
        <Card>
          <CardHeader><CardTitle className="text-base">Import result</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>{result.inserted} inserted</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-destructive" />
                <span>{result.failed} failed</span>
              </div>
            </div>
            {result.errors?.length > 0 && (
              <div className="mt-3 max-h-48 overflow-y-auto rounded-md border bg-muted/40 p-3">
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
