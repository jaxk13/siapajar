import { useState } from "react";
import { FlaskConical } from "lucide-react";
import AdminShell from "../../components/layout/AdminShell";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import Dialog from "../../components/ui/Dialog";
import FormField from "../../components/ui/FormField";
import Select from "../../components/ui/Select";
import { adminApi, type CodeStatus, type IssuedCode } from "../../features/admin/adminApi";
import { useAdmin, useAdminQuery } from "../../features/admin/AdminProvider";
import CodeActions from "../../features/admin/CodeActions";
import { CodeStatusBadge, ErrorBlock, IssuedCodePanel, LoadingBlock, Pagination, SearchBar } from "../../features/admin/components";
import { CODE_STATUS, formatDate } from "../../features/admin/format";
import { Link, usePageTitle } from "../../lib/router";

const PAGE_SIZE = 20;

export default function CodesPage() {
  usePageTitle("Kode Akses");
  const { isSuperAdmin } = useAdmin();
  const [status, setStatus] = useState<CodeStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAdminQuery(() => adminApi.codes(status, search, page), [status, search, page]);

  return (
    <AdminShell title="Kode Akses" actions={isSuperAdmin && <TestCodeButton onCreated={reload} />}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Kode akses</h1>
          <p className="mt-1 text-sm text-fg-muted">Semua kode, termasuk kode uji. Kode lengkap tidak disimpan; yang tampil hanya 4 karakter terakhir.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_14rem]">
          <SearchBar
            initial={search}
            placeholder="Cari 4 karakter terakhir kode atau nama pembeli"
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
          <div>
            <label htmlFor="code-status" className="sr-only">
              Filter status
            </label>
            <Select
              id="code-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as CodeStatus | "");
                setPage(1);
              }}
            >
              <option value="">Semua status</option>
              {(Object.keys(CODE_STATUS) as CodeStatus[]).map((s) => (
                <option key={s} value={s}>
                  {CODE_STATUS[s].label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {data && (
          <p className="text-sm text-fg-subtle" aria-live="polite">
            {data.total} kode
          </p>
        )}
        {loading && !data && <LoadingBlock />}
        {error && <ErrorBlock message={error} onRetry={reload} />}

        {data && data.codes.length === 0 && (
          <p className="rounded-lg border border-dashed border-line-strong bg-surface px-4 py-10 text-center text-sm text-fg-muted">Tidak ada kode yang cocok.</p>
        )}

        {data && data.codes.length > 0 && (
          <ul className={`divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface ${loading ? "opacity-60" : ""}`}>
            {data.codes.map((c) => (
              <li key={c.id} className="flex flex-col gap-3 px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center">
                <div className="grid min-w-0 flex-1 gap-1 md:grid-cols-[1fr_1.2fr_1fr] md:items-center md:gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-fg">…{c.hint}</span>
                    <CodeStatusBadge status={c.status} />
                  </div>
                  <div className="min-w-0 text-sm">
                    {c.orderId ? (
                      <Link to={`/super-admin/pesanan/${c.orderId}`} className="truncate font-medium text-primary-text underline-offset-4 hover:underline">
                        {c.buyerName}
                      </Link>
                    ) : (
                      <span className="text-fg-muted">Kode uji{c.createdByName ? ` · ${c.createdByName}` : ""}</span>
                    )}
                    <p className="text-fg-subtle">Paket {c.planName}</p>
                  </div>
                  <div className="text-sm text-fg-muted">
                    <p>
                      Perangkat {c.activeDevices}/{c.maxDevices ?? "∞"}
                    </p>
                    <p className="text-fg-subtle">{c.expiresAt ? `Berakhir ${formatDate(c.expiresAt)}` : `${c.durationDays} hari sejak dipakai`}</p>
                  </div>
                </div>
                {/* Fixed width keeps columns aligned for rows without actions (expired/disabled codes). */}
                <div className="lg:flex lg:w-[17rem] lg:justify-end">
                  <CodeActions code={c} onChanged={reload} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {data && <Pagination page={page} total={data.total} pageSize={PAGE_SIZE} onPage={setPage} />}
      </div>
    </AdminShell>
  );
}

function TestCodeButton({ onCreated }: { onCreated: () => void }) {
  const { handleAuthError } = useAdmin();
  const [open, setOpen] = useState(false);
  const plans = useAdminQuery(() => adminApi.plans(), []);
  const [planId, setPlanId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [issued, setIssued] = useState<IssuedCode | null>(null);

  const close = () => {
    setOpen(false);
    setIssued(null);
    setError(undefined);
  };

  const create = async () => {
    const chosen = planId || plans.data?.plans[0]?.id;
    if (!chosen) return;
    setBusy(true);
    const result = await adminApi.createTestCode(chosen);
    setBusy(false);
    if (!result.ok) {
      if (!handleAuthError(result)) setError(result.message);
      return;
    }
    setIssued(result.data.issued);
    onCreated();
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} icon={<FlaskConical className="size-4" aria-hidden="true" />}>
        <span className="hidden sm:inline">Buat kode uji</span>
        <span className="sm:hidden">Kode uji</span>
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={issued ? "Kode uji berhasil dibuat" : "Buat kode uji"}
        description={issued ? undefined : "Kode gratis tanpa pesanan, untuk pengujian atau demo. Tercatat di riwayat aktivitas."}
        footer={
          issued ? (
            <Button onClick={close}>Selesai</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={close}>
                Batal
              </Button>
              <Button onClick={create} loading={busy} loadingText="Membuat…">
                Buat kode
              </Button>
            </>
          )
        }
      >
        {issued ? (
          <IssuedCodePanel issued={issued} />
        ) : (
          <div className="space-y-4">
            {error && <Alert tone="danger" title={error} />}
            <FormField id="test-plan" label="Paket">
              {(c) => (
                <Select {...c} value={planId || plans.data?.plans[0]?.id || ""} onChange={(e) => setPlanId(e.target.value)}>
                  {plans.data?.plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.durationDays} hari
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          </div>
        )}
      </Dialog>
    </>
  );
}
