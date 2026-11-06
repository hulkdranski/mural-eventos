
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function checkAdmin(uid: string): Promise<boolean> {
  const adminRef = doc(db, "admins", uid);
  const adminSnapshot = await getDoc(adminRef);

  if (!adminSnapshot.exists()) {
    return false;
  }

  const adminData = adminSnapshot.data();

  return adminData.role === "admin" && adminData.active === true;
}
