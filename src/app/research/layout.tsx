import { ResearchSidebar } from '@/components/research/ResearchSidebar';

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — fixed width, full height, scrolls internally */}
      <aside className="w-64 flex-shrink-0 h-full">
        <ResearchSidebar />
      </aside>

      {/* Main content — takes remaining space, scrolls independently */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
