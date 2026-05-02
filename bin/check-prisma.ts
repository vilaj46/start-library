import { prisma } from '../src/db'

async function main() {
    console.log('Available Prisma models:', Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_')));
    
    // Check Work model fields
    try {
        const work = await prisma.work.findFirst();
        console.log('Work record sample:', work);
    } catch (e) {
        console.log('Work query failed:', e);
    }
}

main();
