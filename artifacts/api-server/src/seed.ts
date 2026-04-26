import {
  db,
  usersTable,
  requestsTable,
  helpActionsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import { hashPassword } from "./lib/auth";
import { logger } from "./lib/logger";

async function main(): Promise<void> {
  const [{ c }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(usersTable);

  if ((c ?? 0) > 0) {
    logger.info({ existingUsers: c }, "Seed skipped — users already exist");
    return;
  }

  logger.info("Seeding initial data");

  const adminHash = await hashPassword("admin1234");
  const userHash = await hashPassword("user1234");

  const [admin] = await db
    .insert(usersTable)
    .values({
      name: "مشرف قريب",
      email: "admin@qareeb.app",
      phone: null,
      passwordHash: adminHash,
      role: "admin",
      trustStatus: "trusted",
    })
    .returning();

  const [layla] = await db
    .insert(usersTable)
    .values({
      name: "ليلى الحربي",
      email: "layla@example.com",
      phone: "0501112233",
      passwordHash: userHash,
      role: "user",
      trustStatus: "trusted",
    })
    .returning();

  const [omar] = await db
    .insert(usersTable)
    .values({
      name: "عمر العتيبي",
      email: "omar@example.com",
      phone: "0552223344",
      passwordHash: userHash,
      role: "user",
      trustStatus: "trusted",
    })
    .returning();

  const [sara] = await db
    .insert(usersTable)
    .values({
      name: "سارة محمد",
      email: "sara@example.com",
      phone: null,
      passwordHash: userHash,
      role: "user",
      trustStatus: "new",
    })
    .returning();

  const seedRequests = [
    {
      userId: layla.id,
      displayName: "أم محمد",
      title: "بحاجة إلى حليب أطفال وحفاضات",
      description:
        "أم لطفلين، الصغير عمره ٤ أشهر. انتهى الحليب الصناعي والحفاضات تكفي ليومين فقط. أي مساعدة الله يجزيكم خير.",
      category: "food",
      city: "الرياض",
      urgency: "high",
      imageUrl: null,
      status: "approved",
    },
    {
      userId: omar.id,
      displayName: null,
      title: "تأخر في الإيجار شهرين",
      description:
        "عاطل عن العمل منذ ثلاثة أشهر، عندي تنبيه إخلاء بعد أسبوع. ابحث عن مساعدة جزئية لدفع الإيجار حتى أجد عملاً.",
      category: "rent",
      city: "جدة",
      urgency: "high",
      imageUrl: null,
      status: "approved",
    },
    {
      userId: sara.id,
      displayName: "أبو يوسف",
      title: "أحتاج دواء ضغط شهري",
      description:
        "والدي مريض ضغط ومتوقف عن صرف الدواء من شهر بسبب الظروف المادية. الدواء اسمه أملوديبين.",
      category: "medicine",
      city: "الرياض",
      urgency: "medium",
      imageUrl: null,
      status: "approved",
    },
    {
      userId: layla.id,
      displayName: null,
      title: "ملابس شتوية لأطفال",
      description:
        "لدي ٣ أطفال (٥، ٧، ٩ سنوات) ويحتاجون جواكت وأحذية للشتاء. أي ملابس مستعملة بحالة جيدة تكفي.",
      category: "clothes",
      city: "الدمام",
      urgency: "medium",
      imageUrl: null,
      status: "approved",
    },
    {
      userId: omar.id,
      displayName: "أم خالد",
      title: "وجبات أسبوعية لأسرة مكونة من ٥ أفراد",
      description:
        "أرملة مع أربعة أطفال، الراتب لا يكفي للأكل. ابحث عن من يساعدنا بسلة غذائية أسبوعية.",
      category: "food",
      city: "مكة",
      urgency: "medium",
      imageUrl: null,
      status: "approved",
    },
    {
      userId: sara.id,
      displayName: null,
      title: "مساعدة في فاتورة الكهرباء",
      description: "تراكمت علي فاتورة الكهرباء وقاربوا يقطعونها، أحتاج جزء بسيط.",
      category: "other",
      city: "الرياض",
      urgency: "low",
      imageUrl: null,
      status: "pending",
    },
  ] as const;

  const insertedRequests = await db
    .insert(requestsTable)
    .values([...seedRequests])
    .returning();

  await db.insert(helpActionsTable).values([
    {
      requestId: insertedRequests[0].id,
      helperUserId: omar.id,
      message: "أستطيع توفير علبتين حليب وحفاضات. جاهز اليوم.",
      contactInfo: "0552223344",
      status: "offered",
    },
    {
      requestId: insertedRequests[1].id,
      helperUserId: sara.id,
      message: "أتبرع بجزء من الإيجار. تواصل معي.",
      contactInfo: null,
      status: "offered",
    },
    {
      requestId: insertedRequests[2].id,
      helperUserId: omar.id,
      message: "صيدليتي قريبة، أوفر الدواء شهرياً إن شاء الله.",
      contactInfo: "0552223344",
      status: "accepted",
    },
  ]);

  logger.info(
    { adminId: admin.id, users: 4, requests: insertedRequests.length },
    "Seed complete",
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error({ err }, "Seed failed");
    process.exit(1);
  });
