import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

async function main() {
  const connectionString = process.env.DATABASE_URL
  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  console.log('Testing vector casts...')

  try {
    const res1 = await prisma.$queryRaw`SELECT '[1,2,3]'::vector::float8[] as embedding`
    console.log('float8[] worked:', res1)
  } catch (e) {
    console.log('float8[] failed')
  }

  try {
    const res2 = await prisma.$queryRaw`SELECT '[1,2,3]'::vector::real[] as embedding`
    console.log('real[] worked:', res2)
  } catch (e) {
    console.log('real[] failed')
  }

  try {
    const res3 = await prisma.$queryRaw`SELECT '[1,2,3]'::vector::text as embedding`
    console.log('text worked:', res3)
  } catch (e) {
    console.log('text failed')
  }

  await prisma.$disconnect()
}

main()
