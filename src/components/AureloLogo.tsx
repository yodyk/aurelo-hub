const AureloLogo = ({ collapsed = false }: { collapsed?: boolean }) => {
  if (collapsed) {
    return (
      <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <text x="16" y="22" textAnchor="middle" className="fill-primary-foreground" style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Inter' }}>A</text>
      </svg>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7 shrink-0" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <text x="16" y="22" textAnchor="middle" className="fill-primary-foreground" style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Inter' }}>A</text>
      </svg>
      <span className="text-lg font-semibold tracking-tight text-foreground">aurelo</span>
    </div>
  );
};

export default AureloLogo;
