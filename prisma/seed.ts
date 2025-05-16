import { PrismaClient, Prisma, ImageQuality } from '@prisma/client';
import { CategoryType } from 'src/categories/dto/request/create-category.dto';

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
    stripeProductId: process.env.STRIPE_ARTIST_PRODUCT_ID,
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
    stripeProductId: process.env.STRIPE_STUDIO_PRODUCT_ID,
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

  // Seed Categories
  const categories = [
    {
      name: 'Oil Painting',
      description:
        'Artworks created using oil-based paints. Known for rich colors and texture.',
      example_images: [
        'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8b2lsJTIwcGFpbnRpbmd8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60',
        'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8b2lsJTIwcGFpbnRpbmd8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60',
      ],
      type: CategoryType.MEDIUM,
    },
    {
      name: 'Watercolor',
      description:
        'Paintings made with water-soluble pigments. Often translucent and delicate.',
      example_images: [
        'https://images.unsplash.com/photo-1617503752587-97d2103a96ea?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8d2F0ZXJjb2xvciUyMGFydHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60',
      ],
      type: CategoryType.MEDIUM,
    },
    {
      name: 'Abstract',
      description:
        'Art that does not attempt to represent external reality, seeking to achieve its effect using shapes, forms, colors, and textures.',
      example_images: [
        'https://images.unsplash.com/photo-1502759493049-a034cb995520?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8YWJzdHJhY3QlMjBhcnR8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60',
      ],
      type: CategoryType.ATTRIBUTE,
    },
    {
      name: 'Portraiture',
      description:
        'The art of creating portraits; representations of a person, especially one showing the face.',
      example_images: [],
      type: CategoryType.ATTRIBUTE,
    },
    {
      name: 'Digital Art',
      description:
        'Artistic work or practice that uses digital technology as part of the creative or presentation process.',
      example_images: [
        'https://images.unsplash.com/photo-1611162617213-6d22e5050089?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8ZGlnaXRhbCUyMGFydHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60',
      ],
      type: CategoryType.MEDIUM,
    },
    {
      name: 'Surrealism',
      description:
        'A 20th-century avant-garde movement in art and literature which sought to release the creative potential of the unconscious mind.',
      example_images: [],
      type: CategoryType.ATTRIBUTE,
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }
  console.log('Seeded categories');

  // Seed Blogs with upsert by ID
  const blogSeeds = [
    {
      id: 1,
      userId: 'jris1kLjcEOimrlKjGQexf65kV32',
      title: 'Exploring the Alps: A Photographic Journey (Tiptap Edition)',
      content: `<h1>Alps Journey</h1><p>Photos and experiences in the Alps.</p>`,
      is_published: true,
      pictures: [
        'https://example.com/alps1.jpg',
        'https://example.com/alps2.jpg',
      ],
      embedded_videos: [],
    },
    {
      id: 2,
      userId: 'wlkJWoJiOwV5vDjKfwAqCOB24Iw1',
      title: 'Urban Exploration: The Hidden Gems (Tiptap)',
      content: `<h1>Urban Gems</h1><p>Exploring hidden spots in the city.</p>`,
      is_published: true,
      pictures: [
        'https://example.com/urban1.jpg',
        'https://example.com/urban2.jpg',
      ],
      embedded_videos: [],
    },
  ];

  for (const b of blogSeeds) {
    await prisma.blog.upsert({
      where: { id: b.id }, // upsert by primary key
      update: {
        title: b.title,
        content: b.content,
        is_published: b.is_published,
        pictures: b.pictures,
        embedded_videos: b.embedded_videos,
        user_id: b.userId, // ← update uses scalar FK too
      },
      create: {
        id: b.id,
        user_id: b.userId, // ← supply FK scalar here
        title: b.title,
        content: b.content,
        is_published: b.is_published,
        pictures: b.pictures,
        embedded_videos: b.embedded_videos,
      },
    });
    console.log(`Upserted blog ${b.id}: ${b.title}`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
