import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { PrivacyContent } from '../content/PrivacyPolicy';
import { AureloWordmark } from '../components/AureloWordmark';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <AureloWordmark className="h-[20px] w-auto text-foreground" />
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[13px] text-[#78716c] hover:text-[#1c1c1c] transition-colors"
            style={{ fontWeight: 500 }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
        </div>
        <PrivacyContent />
      </div>
    </div>
  );
}
