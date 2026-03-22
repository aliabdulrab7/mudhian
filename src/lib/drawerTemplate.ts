export interface TemplateRow {
  key: string;
  label: string;
  sign: "+" | "-";
  enabled: boolean;
  custom: boolean; // true = added by admin (not a built-in DB field)
}

export const DEFAULT_TEMPLATE: TemplateRow[] = [
  { key: "yesterdayBalance",   label: "يضاف رصيد أمس",                                          sign: "+", enabled: true, custom: false },
  { key: "earnestReceived",    label: "يضاف عرابين مستلمة",                                      sign: "+", enabled: true, custom: false },
  { key: "staffDeposits",      label: "مستلم أمانات سابقة لدى الموظفين / إضافات أخرى",           sign: "+", enabled: true, custom: false },
  { key: "customerDepositsIn", label: "مستلم أمانات سابقة لدى الزبائن",                          sign: "+", enabled: true, custom: false },
  { key: "adminWithdrawals",   label: "يخصم مسحوبات أبوسلطان",                                   sign: "-", enabled: true, custom: false },
  { key: "previousEarnest",    label: "يخصم عرابين سابقة",                                       sign: "-", enabled: true, custom: false },
  { key: "boxesBags",          label: "يخصم مشتريات علب وأكياس",                                sign: "-", enabled: true, custom: false },
  { key: "cashPurchases",      label: "يخصم مشتريات بضاعة كاش",                                 sign: "-", enabled: true, custom: false },
  { key: "storeExpenses",      label: "يخصم مصروفات محل",                                        sign: "-", enabled: true, custom: false },
  { key: "customerDepositsOut",label: "يخصم أمانات لدى الزبائن أو المحلات",                     sign: "-", enabled: true, custom: false },
  { key: "returns",            label: "يخصم المرتجع والمستبدل من الزبائن",                       sign: "-", enabled: true, custom: false },
  { key: "salariesAdvances",   label: "رواتب وسلف وخصومات أخرى",                                sign: "-", enabled: true, custom: false },
];

export function parseTemplate(json: string | null | undefined): TemplateRow[] {
  if (!json) return DEFAULT_TEMPLATE;
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as TemplateRow[];
    return DEFAULT_TEMPLATE;
  } catch {
    return DEFAULT_TEMPLATE;
  }
}

export function parseNotes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
    // Old format: plain string → convert to single-item array
    if (raw.trim()) return [raw];
    return [];
  } catch {
    // Old plain string format
    if (raw.trim()) return [raw];
    return [];
  }
}
