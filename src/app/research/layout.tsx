'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { ResearchSidebar } from '@/components/research/ResearchSidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-64 flex-shrink-0 h-full">
        <ResearchSidebar />
      </aside>

      {/* Mobile sidebar — sheet drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <ResearchSidebar onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-background sticky top-0 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-sm font-medium">Olelo Research</span>
        </div>

        <div className="max-w-3xl mx-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
