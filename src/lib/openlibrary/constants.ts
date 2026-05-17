export const BLACKLIST_KEYWORDS = [
    'sparknotes', 'cliffnotes', "cliff's notes", 'summary of', 'study guide',
    'workbook', 'analysis of', 'audiobook', 'audio cd', 'cassette',
    'large print', 'library binding', 'box set', 'complete set', 'collection',
    'omnibus', 'bundle', 'anthology', 'series', 'selected works', 'works of',
    'the works of', 'journal', 'diary', 'notebook', 'pop-up', 'gallery of',
    'coloring book', 'activity book', 'sticker book', 'schoolbooks'
] as const;

export const NON_NARRATIVE_TAGS = [
    'exhibition', 'catalog', 'miscellanea', 'history and criticism',
    'juvenile nonfiction', 'study guide', 'sparknotes', 'bibliography',
    'companion', 'handbook', 'almanac', 'biography',
    'screenplay', 'film script', 'script',
] as const;

export const NON_NARRATIVE_TITLE_PATTERNS = [
    /history of magic/i,
    /the world of/i,
    /companion to/i,
    /guide to/i,
    /official handbook/i,
    /original screenplay/i,
    /the screenplay/i,
    /pop.?up/i,
] as const;

export const CONTAINER_PATTERNS = [
    /box set/i,
    /complete set/i,
    /collection/i,
    /omnibus/i,
    /bundle/i,
    /library/i,
    /anthology/i,
    /series/i,
    /schoolbook/i,
    /pop.?up/i,
] as const;

export const NARRATIVE_KEYWORDS = [
    'fiction', 'novel', 'stori', 'story', 'literature',
    'drama', 'poetry', 'myth', 'folklore'
] as const;
