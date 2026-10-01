export type AddressFields = {
  recipientName?: string;
  phone?: string;
  email?: string;
  city?: string;
  area?: string;
  street?: string;
};

export function addressFieldErrors(input: {
  recipientName: string;
  phone: string;
  email: string;
  city: string;
  area: string;
  street: string;
}): AddressFields {
  const fields: AddressFields = {};
  if (!input.recipientName) fields.recipientName = "الاسم مطلوب";
  if (!input.phone) fields.phone = "الهاتف مطلوب";
  if (!input.email) fields.email = "البريد مطلوب";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) fields.email = "البريد غير صالح";
  if (!input.city) fields.city = "المدينة مطلوبة";
  if (!input.area) fields.area = "الحي مطلوب";
  if (!input.street) fields.street = "الشارع مطلوب";
  return fields;
}
