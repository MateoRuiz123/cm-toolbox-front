type DocsEmptyStateProps = {
  readonly title: string;
  readonly description?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
};

export const DocsEmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
}: DocsEmptyStateProps) => (
  <div
    className="rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-6 py-10 text-center"
    role="status"
  >
    <p className="text-sm font-semibold text-[var(--text-body)]">{title}</p>
    {description ? (
      <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p>
    ) : null}
    {actionLabel && onAction ? (
      <button
        type="button"
        className="mt-4 inline-flex rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-action-contrast)]"
        onClick={onAction}
        aria-label={actionLabel}
      >
        {actionLabel}
      </button>
    ) : null}
  </div>
);
