import CaptureForm from "@/components/CaptureForm";
import MemoryList from "@/components/MemoryList";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8">
      <h1>SaveWise</h1>

      <p>
        Remember what matters.

        Capture your digital discoveries
and find them when you need them.
      </p>

      <CaptureForm />
      <MemoryList />
    </main>
  );
}