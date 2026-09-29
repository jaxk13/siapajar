import { ArrowRight, FilePlus2 } from "lucide-react";
import { buttonClasses } from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import { Link } from "../lib/router";

interface AppHomeProps {
  questionCount: number;
  subject: string;
  grade: string;
  steps: readonly { path: string; label: string; description: string }[];
}

export default function AppHome({ questionCount, subject, grade, steps }: AppHomeProps) {
  const hasDraft = questionCount > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Beranda"
        description="Naskah yang sedang Anda susun tersimpan otomatis di perangkat ini."
      />

      {hasDraft ? (
        <section aria-labelledby="draft-title" className="rounded-lg border border-line bg-surface p-5 shadow-card sm:p-6">
          <p className="text-sm font-medium text-fg-subtle">Naskah yang sedang disusun</p>
          <h2 id="draft-title" className="mt-1 text-lg font-semibold text-fg">
            {subject || "Tanpa mata pelajaran"}
            {grade && <span className="font-normal text-fg-muted"> · Kelas {grade}</span>}
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            <span className="font-semibold tabular-nums text-fg">{questionCount}</span> soal tersimpan
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link to="/app/editor" className={buttonClasses("primary", "md")}>
              Lanjutkan di Editor
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link to="/app/parameter" className={buttonClasses("secondary", "md")}>
              Ubah parameter soal
            </Link>
          </div>
        </section>
      ) : (
        <EmptyState
          icon={FilePlus2}
          title="Belum ada naskah yang sedang disusun"
          description="Mulai dengan menentukan jenjang, kelas, mata pelajaran, materi, dan jumlah soal."
          action={
            <Link to="/app/parameter" className={buttonClasses("primary", "md")}>
              Mulai Naskah Baru
            </Link>
          }
        />
      )}

      <section aria-labelledby="alur-title">
        <h2 id="alur-title" className="text-base font-semibold text-fg">
          Alur penyusunan
        </h2>
        <ol className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {steps.map((step, index) => (
            <li key={step.path}>
              <Link
                to={step.path}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-subtle sm:px-5"
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded bg-subtle text-xs font-semibold tabular-nums text-fg-muted"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-fg">{step.label}</span>
                  <span className="block truncate text-sm text-fg-subtle">{step.description}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
