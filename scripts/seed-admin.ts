import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { lastFourDigits, normalizePhone } from "../src/lib/phone";

async function main() {
  const [, , rawName, rawPhone] = process.argv;
  if (!rawName || !rawPhone) {
    console.error("사용법: npm run seed:admin -- <이름> <휴대폰번호>");
    process.exit(1);
  }

  const phone = normalizePhone(rawPhone);
  const pin = lastFourDigits(phone);
  const pinHash = await bcrypt.hash(pin, 10);

  const admin = await prisma.user.upsert({
    where: { phone },
    update: { role: "ADMIN", status: "ACTIVE" },
    create: {
      name: rawName,
      phone,
      pinHash,
      role: "ADMIN",
      status: "ACTIVE",
      approvedAt: new Date(),
    },
  });

  await prisma.eloRating.createMany({
    data: [
      { userId: admin.id, type: "SINGLES", rating: 1200 },
      { userId: admin.id, type: "DOUBLES", rating: 1200 },
    ],
    skipDuplicates: true,
  });

  console.log(`관리자 계정 준비 완료: ${admin.name} (${phone}), 로그인 PIN: ${pin}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
