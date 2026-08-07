"use client";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({
  value,
  onChange,
}: SearchBarProps) {
  return (
    <div className="w-full max-w-xl mt-10">
      <input
        type="text"
        placeholder="Search your discoveries..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-3 text-gray-900 shadow-sm outline-none transition focus:border-gray-400"
      />
    </div>
  );
}