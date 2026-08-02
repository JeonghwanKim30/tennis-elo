import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const [, , phone, newName, newPin] = process.argv;
  if (!phone || !newName || !newPin) {
    console.error("사용법: npx tsx scripts/update-admin.ts <휴대폰번호> <새이름> <새PIN>");
    process.exit(1);
  }

  const pinHash = await bcrypt.hash(newPin, 10);

  const user = await prisma.user.update({
    where: { phone },
    data: { name: newName, pinHash },
  });

  console.log(`계정 갱신 완료: ${user.name} (${user.phone}), 새 PIN: ${newPin}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
