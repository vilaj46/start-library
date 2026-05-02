import { prisma } from '../src/db';
import { ConceptRepository } from '../src/lib/concepts/repository';
import { EmbeddingClient } from '../src/clients/EmbeddingClient';

const embeddingClient = new EmbeddingClient();

const enrichmentData = [
    {
        name: "Urban Fantasy",
        description: "Magic, paranormal elements, or hidden supernatural societies existing within a modern, metropolitan, or contemporary real-world setting. Often involves the 'Masquerade' trope where magic is hidden in plain sight.",
        logic: "The intersection of the mundane and the magical; hidden worlds within modern cities.",
        appeal: "Wonder, mystery, and the sense that magic could be real and just around the corner.",
        examples: ["Harry Potter", "The Dresden Files", "Neverwhere", "Percy Jackson"],
        aliases: ["Modern Magic", "Hidden World", "Masquerade", "The Veil", "Contemporary Fantasy"]
    },
    {
        name: "Coming of Age",
        description: "The psychological and moral growth of a protagonist from youth to adulthood. Often involves a 'Bildungsroman' journey, loss of innocence, identity formation, and taking on adult responsibilities.",
        logic: "Transition of agency; the shift from being protected by the world to being responsible for it. Moral awakening.",
        appeal: "Relatability, nostalgia, and emotional growth.",
        examples: ["Harry Potter", "To Kill a Mockingbird", "The Perks of Being a Wallflower", "Percy Jackson"],
        aliases: ["Young Adult", "Adolescence", "Bildungsroman", "Juvenile fiction", "Growing Up"]
    },
    {
        name: "Cryptocracy",
        description: "A secret society, cabal, or clandestine organization that operates behind the scenes to influence power, protect deep secrets, or maintain a hidden status quo. A 'government from the shadows' involving hidden identities and exclusive, often ritualistic membership.",
        logic: "Power is maintained through information asymmetry, secrecy, and exclusion; influencing global or local events while remaining invisible to the public.",
        appeal: "Intrigue, mystery, and a sense of a hidden hand guiding the world.",
        examples: ["Order of the Phoenix", "Illuminati", "The Da Vinci Code", "The Freemasons"],
        aliases: ["Secret Society", "Cabal", "Clandestine", "Underground Organization", "Shadow Government"]
    },
    {
        name: "Low Fantasy",
        description: "Fantasy stories where magical elements are rare, subtle, or kept hidden from the general population within an otherwise normal or realistic world. Focuses on the impact of magic on the mundane.",
        logic: "Grounded magic; the world looks like ours but has hidden magical pockets.",
        appeal: "Grit, relatability, and subtle wonder.",
        examples: ["Harry Potter", "American Gods", "The Ocean at the End of the Lane"],
        aliases: ["Hidden Magic", "Grounded Fantasy", "Realistic Magic", "Magical Realism"]
    },
    {
        name: "The Chosen One",
        description: "A character destined by fate, prophecy, or unique heritage to save the world, defeat a great evil, or fulfill a critical destiny. Often a reluctant hero who discovers their true power.",
        logic: "Destiny and predetermined importance; the weight of the world on one individual.",
        appeal: "Grandeur, importance, and the triumph of the underdog.",
        examples: ["Harry Potter", "Star Wars", "The Matrix", "Lord of the Rings"],
        aliases: ["Prophecy", "Reluctant Hero", "Destined", "Savior", "Messianic Archetype"]
    }
];

async function main() {
    for (const data of enrichmentData) {
        console.log(`✨ Enriching concept: ${data.name}...`);
        
        const concept = await prisma.concept.findFirst({
            where: { name: data.name }
        });

        if (!concept) {
            console.warn(`⚠️ Concept not found: ${data.name}`);
            continue;
        }

        // Include aliases in the embedding context for "semantic weight"
        const deepContext = `${data.name}: ${data.logic} ${data.description} ${data.appeal} Aliases: ${data.aliases.join(', ')}. Examples: ${data.examples.join(', ')}`;
        const [embedding] = await embeddingClient.fetchBatch([deepContext]);

        if (embedding && embedding.length > 0) {
            const vectorString = embeddingClient.toVectorString(embedding);
            await ConceptRepository.updateMetadata(concept.id, {
                description: data.description,
                logic: data.logic,
                appeal: data.appeal,
                examples: data.examples,
                aliases: data.aliases,
                embedding: vectorString,
                rawInput: deepContext
            });
            console.log(`✅ Updated ${data.name} (ID: ${concept.id})`);
        } else {
            console.error(`❌ Failed to generate embedding for ${data.name}`);
        }
    }
}

main().finally(() => prisma.$disconnect());
