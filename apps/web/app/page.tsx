"use client";

import { useState } from "react";

import CaptureForm from "@/components/CaptureForm";
import MemoryList from "@/components/MemoryList";
import SearchBar from "@/components/SearchBar";

export default function Home() {
  const [search, setSearch] = useState("");

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 p-8">
      <h1 className="text-4xl font-semibold">
        SaveWise
      </h1>

      <p className="mt-4 max-w-xl text-center text-gray-600">
        Remember what matters.
        <br />
        Capture your digital discoveries
        and find them when you need them.
      </p>

      <SearchBar
        value={search}
        onChange={setSearch}
      />

      <CaptureForm />

      <MemoryList search={search} />
    </main>
  );
}