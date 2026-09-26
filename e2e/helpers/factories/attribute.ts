export interface AttributeGroupPayload {
  code: string;
  nameRu: string;
  nameRo: string;
  sortOrder: number;
  isActive?: boolean;
}

export function buildAttributeGroupData(
  runId: string,
  overrides?: Partial<AttributeGroupPayload>,
): AttributeGroupPayload {
  const codeSuffix = runId.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return {
    code: `grp_${codeSuffix}`,
    nameRu: `Группа ${runId}`,
    nameRo: `Grup ${runId}`,
    sortOrder: 10,
    isActive: true,
    ...overrides,
  };
}

export interface AttributePayload {
  code: string;
  dataType:
    "text" | "number" | "boolean" | "single_select" | "multi_select" | "color";
  groupId?: string | null;
  nameRu: string;
  nameRo: string;
  unitCode?: string | null;
  isFilterable?: boolean;
  sortOrder: number;
}

export function buildAttributeData(
  runId: string,
  dataType: AttributePayload["dataType"] = "text",
  overrides?: Partial<AttributePayload>,
): AttributePayload {
  const codeSuffix = runId.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return {
    code: `attr_${codeSuffix}_${dataType}`,
    dataType,
    groupId: null,
    nameRu: `Характеристика ${runId} (${dataType})`,
    nameRo: `Caracteristica ${runId} (${dataType})`,
    unitCode: dataType === "number" ? "kg" : null,
    isFilterable: false,
    sortOrder: 10,
    ...overrides,
  };
}
