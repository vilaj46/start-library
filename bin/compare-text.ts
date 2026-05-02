import { prisma } from '../src/db';

async function main() {
    const works = await prisma.work.findMany({
        where: {
            title: {
                in: [
                    "Harry Potter and the Philosopher's Stone",
                    "Short Stories from Hogwarts of Heroism, Hardship and Dangerous Hobbies_Surprises from the Wizarding World"
                ]
            }
        }
    });

    for (const work of works) {
        const subjects = (work.rawApiResponse as any).subjects || [];
        const limitedSubjects = subjects.slice(0, 10).join(', ');
        const workText = `${work.title}. ${work.description || "No description provided."}. Subjects: ${limitedSubjects}`;
        
        console.log(`\nTitle: ${work.title}`);
        console.log(`WorkText Length: ${workText.length}`);
        console.log(`WorkText Preview: ${workText.slice(0, 500)}...`);
    }
}

main().finally(() => prisma.$disconnect());
