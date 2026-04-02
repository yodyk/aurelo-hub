import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { AureloWordmark } from './AureloWordmark';
import { useEffect, useState, useRef } from 'react';

interface TocItem {
  id: string;
  label: string;
}

interface LegalPageLayoutProps {
  children: React.ReactNode;
  tocItems: TocItem[];
}

export function LegalPageLayout({ children, tocItems }: LegalPageLayoutProps) {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState(tocItems[0]?.id ?? '');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    );

    tocItems.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [tocItems]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="legal-page min-h-screen bg-[#fafaf9] dark:bg-[#1a1a19]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#fafaf9]/80 dark:bg-[#1a1a19]/80 backdrop-blur-md border-b border-black/[0.04] dark:border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <AureloWordmark className="h-[18px] w-auto text-[#1c1c1c] dark:text-[#e7e5e4]" />
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[13px] text-[#78716c] dark:text-[#a8a29e] hover:text-[#1c1c1c] dark:hover:text-[#e7e5e4] transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-6 py-16 lg:grid lg:grid-cols-[220px_1fr] lg:gap-16">
        {/* Sidebar TOC */}
        <aside className="hidden lg:block">
          <nav className="sticky top-24">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-[#a8a29e] dark:text-[#78716c] mb-4">
              On this page
            </p>
            <ul className="space-y-1">
              {tocItems.map(({ id, label }) => (
                <li key={id}>
                  <button
                    onClick={() => scrollTo(id)}
                    className={`
                      block w-full text-left text-[13px] py-1.5 pl-3 border-l-2 transition-all duration-200
                      ${activeId === id
                        ? 'border-[#2e7d9a] text-[#1c1c1c] dark:text-[#e7e5e4] font-medium'
                        : 'border-transparent text-[#78716c] dark:text-[#a8a29e] hover:text-[#44403c] dark:hover:text-[#d6d3d1] hover:border-[#d6d3d1] dark:hover:border-[#57534e]'
                      }
                    `}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Content */}
        <main className="legal-content min-w-0 max-w-[680px]">
          {children}
        </main>
      </div>
    </div>
  );
}
