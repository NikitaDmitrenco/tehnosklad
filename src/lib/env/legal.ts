import "server-only";

export type LegalOperatorConfig = {
  name: string | null;
  idno: string | null;
  legalAddress: string | null;
  privacyEmail: string | null;
  responsiblePerson: string | null;
  missing: string[];
};

function optional(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

export function getLegalOperatorConfig(): LegalOperatorConfig {
  const config = {
    name: optional("LEGAL_OPERATOR_NAME"),
    idno: optional("LEGAL_OPERATOR_IDNO"),
    legalAddress: optional("LEGAL_OPERATOR_ADDRESS"),
    privacyEmail: optional("LEGAL_PRIVACY_EMAIL"),
    responsiblePerson: optional("LEGAL_RESPONSIBLE_PERSON"),
  };
  const missing = [
    ["LEGAL_OPERATOR_NAME", config.name],
    ["LEGAL_OPERATOR_IDNO", config.idno],
    ["LEGAL_OPERATOR_ADDRESS", config.legalAddress],
    ["LEGAL_PRIVACY_EMAIL", config.privacyEmail],
  ]
    .filter((entry) => !entry[1])
    .map((entry) => entry[0]!);
  return { ...config, missing };
}
