'use client';

import { useState } from 'react';

type Props = {
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
};

export default function TagInput({ label, hint, values, onChange, placeholder, suggestions = [] }: Props) {
  const [draft, setDraft] = useState('');

  function add(value: string) {
    const clean = value.trim();
    if (!clean || values.includes(clean) || values.length >= 10) return;
    onChange([...values, clean]);
    setDraft('');
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add(draft);
    } else if (event.key === 'Backspace' && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div>
      <label className="label">{label}</label>
      {hint && <p className="mb-2 -mt-1 text-xs text-slate-500">{hint}</p>}
      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-300 p-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        {values.map((value) => (
          <span key={value} className="badge bg-brand-50 text-brand-600">
            {value}
            <button type="button" onClick={() => onChange(values.filter((v) => v !== value))} className="ml-1.5 text-brand-500 hover:text-brand-700" aria-label={`Remove ${value}`}>
              ×
            </button>
          </span>
        ))}
        <input
          className="min-w-[140px] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => add(draft)}
          placeholder={values.length ? '' : placeholder}
        />
      </div>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.filter((s) => !values.includes(s)).slice(0, 8).map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:border-brand-500 hover:text-brand-600">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
