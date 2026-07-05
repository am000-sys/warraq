// src/lib/password.ts — تجزئة كلمات المرور في مكان واحد
// الكلفة 10 (قياسيّة وآمنة): التحقّق ~75ms بدل ~300ms+ للكلفة 12 مع bcryptjs
// النقيّة — فرق محسوس في زمن الدخول على Serverless حيث المعالج أبطأ.
import bcrypt from "bcryptjs";

export const BCRYPT_COST = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// هل التجزئة القديمة أثقل من الكلفة الحاليّة؟ (تُرحَّل عند أوّل دخول ناجح)
export function needsRehash(hash: string): boolean {
  try {
    return bcrypt.getRounds(hash) > BCRYPT_COST;
  } catch {
    return false;
  }
}
