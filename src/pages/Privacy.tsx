import { PrivacyContent, tocItems } from '../content/PrivacyPolicy';
import { LegalPageLayout } from '../components/LegalPageLayout';

export default function Privacy() {
  return (
    <LegalPageLayout tocItems={tocItems}>
      <PrivacyContent />
    </LegalPageLayout>
  );
}
