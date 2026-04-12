import { prisma } from '../src/db.ts';

async function main() {
    try {
        const c = await prisma.concept.count();
        const e = await prisma.conceptEdge.count();
        const con = await prisma.conceptConflict.count();
        
        console.log('--- DATABASE VERIFICATION ---');
        console.log('Concepts:', c);
        console.log('Edges:', e);
        console.log('Conflicts:', con);
    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
