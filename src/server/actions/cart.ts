"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addVariantToCart, removeCartItem, setCartQty } from "@/lib/cart";
import { actionError, field, type ActionState } from "@/lib/form";

export async function addToCartAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const qty = Number.parseInt(field(formData, "qty") || "1", 10);
    await addVariantToCart(field(formData, "variantId"), qty);
  } catch (error) {
    return { error: actionError(error, "تعذر إضافة المنتج") };
  }
  revalidatePath("/cart");
  redirect("/cart");
}

export async function updateCartAction(formData: FormData) {
  try {
    await setCartQty(field(formData, "itemId"), Number.parseInt(field(formData, "qty") || "1", 10));
  } catch (error) {
    redirect(`/cart?error=${encodeURIComponent(actionError(error, "تعذر تحديث السلة"))}`);
  }
  revalidatePath("/cart");
  redirect("/cart");
}

export async function removeCartAction(formData: FormData) {
  await removeCartItem(field(formData, "itemId"));
  revalidatePath("/cart");
  redirect("/cart");
}
