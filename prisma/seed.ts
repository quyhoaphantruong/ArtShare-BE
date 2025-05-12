import { CategoryType } from "src/categories/dto/request/create-category.dto";

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log(`Seeding roles...`);
  const adminRole = await prisma.role.upsert({
    where: { role_name: 'ADMIN' }, // Use a unique field to check if it exists
    update: {}, // Nothing to update if it exists
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


  // Seed Categories
  const categories = [
    {
      name: 'Oil Painting',
      description: 'Artworks created using oil-based paints. Known for rich colors and texture.',
      example_images: [
        'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8b2lsJTIwcGFpbnRpbmd8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60',
        'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8b2lsJTIwcGFpbnRpbmd8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60',
      ],
      type: CategoryType.MEDIUM,
    },
    {
      name: 'Watercolor',
      description: 'Paintings made with water-soluble pigments. Often translucent and delicate.',
      example_images: [
        'https://images.unsplash.com/photo-1617503752587-97d2103a96ea?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8d2F0ZXJjb2xvciUyMGFydHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60',
      ],
      type: CategoryType.MEDIUM,
    },
    {
      name: 'Abstract',
      description: 'Art that does not attempt to represent external reality, seeking to achieve its effect using shapes, forms, colors, and textures.',
      example_images: [
        'https://images.unsplash.com/photo-1502759493049-a034cb995520?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8YWJzdHJhY3QlMjBhcnR8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60',
      ],
      type: CategoryType.ATTRIBUTE,
    },
    {
      name: 'Portraiture',
      description: 'The art of creating portraits; representations of a person, especially one showing the face.',
      example_images: [],
      type: CategoryType.ATTRIBUTE,
    },
    {
      name: 'Digital Art',
      description: 'Artistic work or practice that uses digital technology as part of the creative or presentation process.',
      example_images: [
         'https://images.unsplash.com/photo-1611162617213-6d22e5050089?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8ZGlnaXRhbCUyMGFydHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60'
      ],
      type: CategoryType.MEDIUM,
    },
    {
      name: 'Surrealism',
      description: 'A 20th-century avant-garde movement in art and literature which sought to release the creative potential of the unconscious mind.',
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

  console.log(`Seeding finished.`);

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Close Prisma Client connection
    await prisma.$disconnect();
  });