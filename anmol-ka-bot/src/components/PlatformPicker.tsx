'use client';

export const PLATFORMS = [
  'LinkedIn',
  'Naukri',
  'Indeed',
  'Wellfound',
  'Glassdoor',
  'Instahyre',
  'Hirist',
  'Company career pages',
  'Y Combinator jobs',
  'RemoteOK'
];

type Props = { values: string[]; onChange: (values: string[]) => void };

export default function PlatformPicker({ values, onChange }: Props) {
  function toggle(platform: string) {
    onChange(values.includes(platform) ? values.filter((v) => v !== platform) : [...values, platform]);
  }

  return (
    <div>
      <label className="label">Preferred platforms</label>
      <p className="mb-2 -mt-1 text-xs text-slate-500">Gemini searches these explicitly — pick 3 to 5 for the best results.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const selected = values.includes(platform);
          return (
            <button
              key={platform}
              type="button"
              onClick={() => toggle(platform)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                selected ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
              }`}
            >
              {selected ? '✓ ' : ''}{platform}
            </button>
          );
        })}
      </div>
    </div>
  );
}
