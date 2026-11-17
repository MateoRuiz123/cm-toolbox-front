import { useEffect, useRef, useState } from 'react'
import type { WorkloadInfo } from './api/logs-types'
import { Skeleton } from '@/shared/ui/skeleton'

interface WorkloadComboboxProps {
  readonly id: string
  readonly label: string
  readonly hint?: string
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly workloads: readonly WorkloadInfo[]
  readonly loading?: boolean
  readonly value: string
  readonly onSelect: (workloadKey: string) => void
  readonly onSearchChange: (query: string) => void
  readonly error?: boolean
  readonly showClusterNamespace?: boolean
}

const workloadKey = (w: WorkloadInfo) => `${w.cluster}|${w.namespace}|${w.name}`

const workloadLabel = (w: WorkloadInfo, showClusterNamespace: boolean) =>
  showClusterNamespace ? `${w.cluster} / ${w.namespace} / ${w.name}` : w.name

const DeploymentIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="size-4 shrink-0 text-[var(--text-muted)]"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="6" rx="1" />
    <rect x="3" y="14" width="18" height="6" rx="1" />
    <path d="M7 7h.01M7 17h.01" />
  </svg>
)

const CheckIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="size-4 shrink-0 text-[var(--color-primary)]"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
)

export const WorkloadCombobox = ({
  id,
  label,
  hint,
  placeholder = 'Buscar carga de trabajo…',
  disabled = false,
  workloads,
  loading = false,
  value,
  onSelect,
  onSearchChange,
  error = false,
  showClusterNamespace = false,
}: WorkloadComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selectedWorkload = workloads.find((w) => workloadKey(w) === value)
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    if (!isOpen && selectedWorkload) {
      setInputValue(workloadLabel(selectedWorkload, showClusterNamespace))
    } else if (!isOpen && !value) {
      setInputValue('')
    }
  }, [isOpen, selectedWorkload, value, showClusterNamespace])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setHighlightedIndex(-1)
  }, [workloads])

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const option = listRef.current.querySelector<HTMLElement>(`#${id}-option-${highlightedIndex}`)
      option?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex, id])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value)
    onSearchChange(event.target.value)
    setIsOpen(true)
  }

  const handleSelect = (workload: WorkloadInfo) => {
    onSelect(workloadKey(workload))
    setInputValue(workloadLabel(workload, showClusterNamespace))
    setIsOpen(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setIsOpen(true)
      return
    }

    if (event.key === 'Escape') {
      setIsOpen(false)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((prev) => Math.min(prev + 1, workloads.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((prev) => Math.max(prev - 1, -1))
    } else if (event.key === 'Enter' && highlightedIndex >= 0 && workloads[highlightedIndex]) {
      event.preventDefault()
      handleSelect(workloads[highlightedIndex])
    }
  }

  const showDropdown = isOpen && !disabled
  const hasResults = !loading && workloads.length > 0

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="block">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[var(--text-body)]">{label}</span>
          {hint && <span className="text-[11px] text-[var(--text-muted)]">{hint}</span>}
        </div>
      </label>

      <div className="relative mt-1.5">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={
            highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined
          }
          aria-invalid={error}
          disabled={disabled}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full rounded-[var(--radius-1)] border bg-[var(--surface-card)] px-3.5 py-2.5 pr-9 text-sm text-[var(--text-body)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 disabled:opacity-50 ${
            error
              ? 'border-[var(--state-error)] focus:border-[var(--state-error)] focus:ring-[var(--state-error)]'
              : 'border-[var(--border-default)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
          }`}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor">
            <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      {showDropdown && (
        <div
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)]"
          style={{ boxShadow: 'var(--shadow-3)' }}
        >
          <div className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)] px-3.5 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {loading ? 'Buscando…' : `${workloads.length} carga${workloads.length === 1 ? '' : 's'} de trabajo`}
            </span>
          </div>

          <ul
            ref={listRef}
            id={`${id}-listbox`}
            role="listbox"
            aria-label={label}
            className="max-h-64 overflow-y-auto py-1"
          >
            {loading && (
              <li className="space-y-2 px-3.5 py-3" role="status" aria-busy="true">
                <span className="sr-only">Cargando cargas de trabajo…</span>
                {["w-3/4", "w-2/3", "w-4/5", "w-1/2"].map((width) => (
                  <Skeleton key={width} className={`h-4 ${width}`} />
                ))}
              </li>
            )}

            {!loading && workloads.length === 0 && (
              <li className="px-3.5 py-3 text-xs text-[var(--text-muted)]">
                No se encontraron cargas de trabajo
              </li>
            )}

            {hasResults &&
              workloads.map((workload, index) => {
                const key = workloadKey(workload)
                const isSelected = key === value
                const isHighlighted = index === highlightedIndex
                return (
                  <li
                    key={key}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(workload)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`cursor-pointer px-3.5 py-2.5 transition-colors ${
                      isHighlighted
                        ? 'bg-[var(--color-primary-soft)]'
                        : 'hover:bg-[var(--surface-sunken)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <DeploymentIcon />
                      <div className="min-w-0 flex-1">
                        <div
                          className={`truncate text-sm font-medium ${
                            isHighlighted ? 'text-[var(--color-primary)]' : 'text-[var(--text-body)]'
                          }`}
                        >
                          {workload.name}
                        </div>
                        {showClusterNamespace && (
                          <div className="truncate text-[11px] text-[var(--text-muted)]">
                            {workload.cluster} / {workload.namespace}
                          </div>
                        )}
                      </div>
                      {isSelected && <CheckIcon />}
                    </div>
                  </li>
                )
              })}
          </ul>
        </div>
      )}
    </div>
  )
}
