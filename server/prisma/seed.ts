import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed in production environment');
    process.exit(1);
  }

  console.log('Seeding test envelopes...');

  // Clear existing envelopes (for re-running seed)
  await prisma.envelope.deleteMany();

  // Create 2 simple test envelopes
  const envelope1 = await prisma.envelope.create({
    data: {
      title: 'Hello World #1',
      type: 'trivia',
      status: 'sealed',
      order: 1,
    },
  });

  const envelope2 = await prisma.envelope.create({
    data: {
      title: 'Hello World #2',
      type: 'would-you-rather',
      status: 'sealed',
      order: 2,
    },
  });

  console.log('Created test envelopes:');
  console.log(`  - ${envelope1.title} (${envelope1.type})`);
  console.log(`  - ${envelope2.title} (${envelope2.type})`);
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
