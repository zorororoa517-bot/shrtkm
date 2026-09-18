import { PrismaClient } from "@prisma/client";
import { generateRoomCode } from "../src/lib/roomCode";
import { colorForIndex, letterFor } from "../src/lib/palette";

const prisma = new PrismaClient();

const DEMO_NAMES = ["سلطان", "نورة", "فهد", "ريم", "عبدالله", "لمى", "خالد", "هيا"];

// Ported 1:1 from the original site's profile.js (DW_FRAMES / DW_BANNERS),
// now living in the database instead of a hardcoded client-side array.
const FRAMES = [
  { slug: "frame_bronze", name: "إطار البرونز", price: 150, previewCss: "border:4px solid #b8722f;" },
  { slug: "frame_gold", name: "إطار الذهب", price: 350, previewCss: "border:4px solid #f4c93a;" },
  { slug: "frame_amber", name: "إطار العنبر", price: 220, previewCss: "border:4px solid #e0a45a;" },
  { slug: "frame_spark", name: "إطار الشرارة", price: 410, previewCss: "border:4px dashed #f0b90b;" },
  { slug: "frame_blue", name: "إطار أزرق", price: 230, previewCss: "border:4px solid #3b82f6;" },
  { slug: "frame_gray", name: "إطار رمادي", price: 180, previewCss: "border:4px solid #6b7280;" },
  { slug: "frame_pink", name: "إطار وردي", price: 260, previewCss: "border:4px solid #ec4899;" },
  { slug: "frame_emerald", name: "إطار زمردي", price: 270, previewCss: "border:4px solid #22c55e;" }
];

const BANNERS = [
  { slug: "banner_basic1", name: "تدرّج بسيط", price: 0, previewCss: "linear-gradient(120deg,#2a2420,#39301f)" },
  { slug: "banner_basic2", name: "تدرّج العنبر الفاتح", price: 0, previewCss: "linear-gradient(120deg,#b8722f,#39301f)" },
  { slug: "banner_glow", name: "بنر الوهج الذهبي", price: 500, previewCss: "linear-gradient(120deg,#e8a00f,#fcc10d)" },
  { slug: "banner_desert", name: "بنر الصحراء", price: 380, previewCss: "linear-gradient(120deg,#e0a45a,#b8722f)" },
  { slug: "banner_night", name: "بنر الليل الذهبي", price: 460, previewCss: "linear-gradient(120deg,#312709,#e8a00f)" },
  { slug: "banner_blue", name: "بنر أزرق", price: 320, previewCss: "linear-gradient(120deg,#1d4ed8,#60a5fa)" },
  { slug: "banner_gray", name: "بنر رمادي", price: 260, previewCss: "linear-gradient(120deg,#374151,#9ca3af)" },
  { slug: "banner_pink", name: "بنر وردي", price: 340, previewCss: "linear-gradient(120deg,#be185d,#f472b6)" },
  { slug: "banner_emerald", name: "بنر زمردي", price: 340, previewCss: "linear-gradient(120deg,#15803d,#4ade80)" }
];

async function seedStoreItems() {
  for (const f of FRAMES) {
    await prisma.storeItem.upsert({
      where: { slug: f.slug },
      create: { ...f, category: "AVATAR_FRAME" },
      update: { ...f, category: "AVATAR_FRAME" }
    });
  }
  for (const b of BANNERS) {
    await prisma.storeItem.upsert({
      where: { slug: b.slug },
      create: { ...b, category: "PROFILE_BANNER" },
      update: { ...b, category: "PROFILE_BANNER" }
    });
  }
  console.log(`✅ Seeded ${FRAMES.length} frames + ${BANNERS.length} banners into the store`);
}

async function seedDemoRoom() {
  const room = await prisma.room.create({
    data: {
      code: generateRoomCode(),
      players: {
        create: DEMO_NAMES.map((name, i) => ({
          login: `user_${i + 1}`,
          name,
          color: colorForIndex(i),
          letter: letterFor(name),
          isHost: i === 0,
          joinOrder: i
        }))
      }
    },
    include: { players: true }
  });
  console.log(`✅ Seeded demo room: ${room.code} with ${room.players.length} players`);
}

async function main() {
  await seedStoreItems();
  await seedDemoRoom();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
