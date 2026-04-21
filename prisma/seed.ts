import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@leluma.com";

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log("Admin user already exists");
    return;
  }

  await prisma.user.create({
    data: {
      email,
      password: "leluma2024",
      name: "Admin",
    },
  });

  console.log("Admin user created: admin@leluma.com / leluma2024");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });