export type AdminLocale = "ru" | "ro";
export type AdminTranslation = {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
};

export type AdminCategory = {
  id: string;
  parentId: string | null;
  presentationKey: "fridge" | "stove" | "vacuum" | "generic";
  sortOrder: number;
  isPublished: boolean;
  archivedAt: string | null;
  imageStoragePath: string | null;
  imagePublicUrl: string | null;
  translations: Record<AdminLocale, AdminTranslation | null>;
  productCount: number;
};

export type AdminAttributeDataType =
  "text" | "number" | "boolean" | "single_select" | "multi_select" | "color";

export type AdminAttributeGroup = {
  id: string;
  code: string;
  sortOrder: number;
  isActive: boolean;
  nameRu: string | null;
  nameRo: string | null;
  attributeCount: number;
};

export type AdminAttributeOption = {
  id: string;
  code: string;
  sortOrder: number;
  isActive: boolean;
  labelRu: string | null;
  labelRo: string | null;
};

export type AdminCategoryBinding = {
  categoryId: string;
  categoryName: string;
  isRequired: boolean;
  isFilterable: boolean | null;
  sortOrder: number;
};

export type AdminAttribute = {
  id: string;
  groupId: string | null;
  code: string;
  dataType: AdminAttributeDataType;
  unitCode: string | null;
  isFilterable: boolean;
  sortOrder: number;
  isActive: boolean;
  nameRu: string | null;
  nameRo: string | null;
  helpRu: string | null;
  helpRo: string | null;
  unitRu: string | null;
  unitRo: string | null;
  options: AdminAttributeOption[];
  bindings: AdminCategoryBinding[];
};

export type AdminProductTranslation = AdminTranslation;
export type AdminProductImage = {
  id: string;
  storagePath: string;
  publicUrl: string;
  sortOrder: number;
  isPrimary: boolean;
  deletionPendingAt: string | null;
  altRu: string | null;
  altRo: string | null;
};

export type AdminProductValue = {
  id: string;
  attributeId: string;
  ordinal: number;
  textRu: string | null;
  textRo: string | null;
  numberValue: string | null;
  booleanValue: boolean | null;
  optionId: string | null;
  colorValue: string | null;
};

export type AdminProduct = {
  id: string;
  categoryId: string;
  categoryName: string;
  brand: string;
  model: string;
  sku: string;
  priceMinor: string;
  oldPriceMinor: string | null;
  availability: "in_stock" | "out_of_stock" | "on_order";
  quantity: number | null;
  isNew: boolean;
  isPublished: boolean;
  sortOrder: number;
  archivedAt: string | null;
  translations: Record<AdminLocale, AdminProductTranslation | null>;
  images: AdminProductImage[];
  values: AdminProductValue[];
};

export type AdminLeadStatus =
  "new" | "in_progress" | "contacted" | "closed" | "spam";

export type AdminLead = {
  id: string;
  status: AdminLeadStatus;
  locale: AdminLocale;
  source: string;
  sourcePath: string;
  name: string;
  phone: string;
  telegramUsername: string | null;
  comment: string | null;
  productId: string | null;
  productName: string | null;
  productPriceMinor: string | null;
  productCurrency: string | null;
  productPath: string | null;
  consentAt: string;
  createdAt: string;
  history: Array<{
    id: string;
    previousStatus: AdminLeadStatus | null;
    status: AdminLeadStatus;
    changedBy: string | null;
    createdAt: string;
  }>;
  delivery: null | {
    state: string;
    attemptCount: number;
    deliveredAt: string | null;
    providerMessageId: string | null;
    lastErrorCode: string | null;
    attempts: Array<{
      id: string;
      attemptNumber: number;
      outcome: string | null;
      providerHttpStatus: number | null;
      providerErrorCode: number | null;
      errorCode: string | null;
      startedAt: string;
      finishedAt: string | null;
    }>;
  };
};

export type AdminDashboard = {
  productsTotal: number;
  productsActive: number;
  productsOutOfStock: number;
  categoriesTotal: number;
  newLeads: number;
  telegramErrors: number;
  knowledgeActive: number;
  recentLeads: AdminLead[];
};

export type AdminSiteSetting = {
  key: string;
  label: string;
  ru: string;
  ro: string;
};

export type AdminOrphanEntry = {
  productId: string;
  path: string;
  state: "orphan_object" | "missing_object" | "pending_metadata";
};

export type AdminAssistantKnowledge = {
  id: string;
  locale: "ru" | "ro";
  title: string;
  content: string;
  isActive: boolean;
  updatedAt: string;
};

export type AdminAssistantLogEntry = {
  id: string;
  requestId: string;
  locale: AdminLocale;
  outcome: string;
  provider: string;
  durationBucket: "lt_250" | "lt_1000" | "gte_1000";
  fallbackUsed: boolean;
  referenceCount: number;
  createdAt: string;
};

export type AdminAssistantLogShare = {
  key: string;
  count: number;
  share: number;
};

export type AdminAssistantLogReport = {
  days: number;
  since: string;
  total: number;
  analyzed: number;
  truncated: boolean;
  fallbackCount: number;
  fallbackShare: number;
  averageReferences: number;
  outcomes: AdminAssistantLogShare[];
  providers: AdminAssistantLogShare[];
  durations: AdminAssistantLogShare[];
  locales: AdminAssistantLogShare[];
  recent: AdminAssistantLogEntry[];
};
