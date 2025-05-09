import { PrismaClient, Prisma, ImageQuality } from '@prisma/client';

const planData: Prisma.PlanCreateInput[] = [
  {
    id: 'free',
    name: 'Individuals',
    stripeProductId: null,
    description: 'Used by art lovers',
    imageQualityAllowed: ImageQuality.LOW,
    monthlyQuotaCredits: null,
    storageQuotaMB: 500,
    maxTeamSeats: 1,
    allowHighResolution: false,
    maxResolutionWidth: null,
    maxResolutionHeight: null,
    removeWatermark: false,
    smartSuggestionsEnabled: false,
  },
  {
    id: 'artist_pro',
    name: 'Pro Artists',
    stripeProductId: process.env.ARTIST_PRODUCT_ID,
    description: 'Great for small businesses',
    imageQualityAllowed: ImageQuality.HIGH,
    monthlyQuotaCredits: 5000,
    storageQuotaMB: 50000,
    maxTeamSeats: 1,
    allowHighResolution: true,
    maxResolutionWidth: 4096,
    maxResolutionHeight: 4096,
    removeWatermark: true,
    smartSuggestionsEnabled: true,
  },
  {
    id: 'studio',
    name: 'Studios',
    stripeProductId: process.env.STUDIO_PRODUCT_ID,
    description: 'Great for large businesses',

    imageQualityAllowed: ImageQuality.HIGH,
    monthlyQuotaCredits: 25000,
    storageQuotaMB: 250000,
    maxTeamSeats: 5,
    allowHighResolution: true,
    maxResolutionWidth: 8192,
    maxResolutionHeight: 8192,
    removeWatermark: true,
    smartSuggestionsEnabled: true,
  },
];

const prisma = new PrismaClient();

async function main() {
  console.log(`Seeding roles...`);
  const adminRole = await prisma.role.upsert({
    where: { role_name: 'ADMIN' },
    update: {},
    create: {
      role_name: 'ADMIN',
    },
  });

  const userRole = await prisma.role.upsert({
    where: { role_name: 'USER' },
    update: {},
    create: {
      role_name: 'USER',
    },
  });
  console.log(`Roles seeded: ${adminRole.role_name}, ${userRole.role_name}`);

  for (const p of planData) {
    const plan = await prisma.plan.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    });
    console.log(`Created or updated plan with id: ${plan.id}`);
  }

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
