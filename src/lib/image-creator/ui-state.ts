export function canSubmitImageCreatorDraft({
  isSignedIn,
  isSubmitting,
  consentAccepted,
  templateId,
  prompt,
}: {
  isSignedIn: boolean;
  isSubmitting: boolean;
  consentAccepted: boolean;
  templateId: string | null;
  prompt: string;
}): boolean {
  return (
    isSignedIn &&
    !isSubmitting &&
    consentAccepted &&
    (Boolean(templateId) || prompt.trim().length > 0)
  );
}
