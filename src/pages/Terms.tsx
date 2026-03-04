import { TermsContent, tocItems } from '../content/TermsOfService';
import { LegalPageLayout } from '../components/LegalPageLayout';

export default function Terms() {
  return (
    <LegalPageLayout tocItems={tocItems}>
      <TermsContent />
    </LegalPageLayout>
  );
}
